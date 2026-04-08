// =====================================================================
// RetailAI — PostgreSQL 資料庫遷移腳本（分段執行，方便錯誤定位）
// 每個 step 為獨立執行單元，失敗時記錄但繼續後續 step
// =====================================================================

export interface MigrationStep {
  name: string;
  sql: string;
}

export const MIGRATION_STEPS: MigrationStep[] = [
  // ─────────────────────────────────────────────────────────────────
  // STEP 0：清理舊有物件（冪等，重複執行安全）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "清理舊有物件",
    sql: `
      DROP TRIGGER  IF EXISTS trg_inventory_low_stock   ON inventory;
      DROP TRIGGER  IF EXISTS trg_inventory_updated_at  ON inventory;
      DROP TRIGGER  IF EXISTS trg_suppliers_updated_at  ON suppliers;
      DROP TRIGGER  IF EXISTS trg_alerts_updated_at     ON alerts;
      DROP FUNCTION IF EXISTS process_checkout(JSONB, TEXT) CASCADE;
      DROP FUNCTION IF EXISTS fn_trigger_low_stock_alert() CASCADE;
      DROP FUNCTION IF EXISTS fn_set_updated_at() CASCADE;
      DROP TABLE    IF EXISTS alerts            CASCADE;
      DROP TABLE    IF EXISTS ml_forecasts      CASCADE;
      DROP TABLE    IF EXISTS edge_logs         CASCADE;
      DROP TABLE    IF EXISTS transaction_items CASCADE;
      DROP TABLE    IF EXISTS transactions      CASCADE;
      DROP TABLE    IF EXISTS inventory         CASCADE;
      DROP TABLE    IF EXISTS suppliers         CASCADE;
      DROP TABLE    IF EXISTS categories        CASCADE;
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 1：商品類別維度表（3NF 第一層拆離）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 categories 表",
    sql: `
      CREATE TABLE categories (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE  categories      IS '商品類別維度表 — 3NF：消除 inventory.category 的傳遞依賴';
      COMMENT ON COLUMN categories.name IS '類別名稱（全域唯一）';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 2：供應商維度表（3NF：抽離 supplier 傳遞依賴）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 suppliers 表",
    sql: `
      CREATE TABLE suppliers (
        id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(100) UNIQUE NOT NULL,
        contact_name VARCHAR(100),
        phone        VARCHAR(30),
        email        VARCHAR(150),
        address      TEXT,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE suppliers IS '供應商維度表 — 3NF：消除 inventory 中 supplier 欄位的傳遞依賴';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 3：商品庫存主表（FK → categories, suppliers）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 inventory 表",
    sql: `
      CREATE TABLE inventory (
        id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        barcode         VARCHAR(50)   UNIQUE NOT NULL,
        name            VARCHAR(200)  NOT NULL,
        category_id     UUID          NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        supplier_id     UUID                   REFERENCES suppliers(id)  ON DELETE SET NULL,
        original_price  NUMERIC(10,2) NOT NULL  CHECK (original_price >= 0),
        dynamic_price   NUMERIC(10,2)           CHECK (dynamic_price  >= 0),
        current_stock   INTEGER       NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
        safety_stock    INTEGER       NOT NULL DEFAULT 0 CHECK (safety_stock  >= 0),
        unit            VARCHAR(20)   NOT NULL DEFAULT '件',
        arrival_date    DATE,
        expiration_date DATE,
        is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE  inventory               IS '商品庫存主表（符合 3NF）';
      COMMENT ON COLUMN inventory.dynamic_price IS 'ML 動態定價，NULL = 使用 original_price';
      COMMENT ON COLUMN inventory.current_stock IS '當前庫存，由 process_checkout RPC 原子扣減';
      COMMENT ON COLUMN inventory.safety_stock  IS '安全庫存下限，低於此值自動觸發 alerts';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 4：交易主單表
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 transactions 表",
    sql: `
      CREATE TABLE transactions (
        id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        cashier_id     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
        total_amount   NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
        payment_method VARCHAR(50)   NOT NULL DEFAULT 'cash',
        note           TEXT,
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE  transactions            IS '交易主單表';
      COMMENT ON COLUMN transactions.cashier_id IS '關聯 Supabase Auth；NULL 允許離線結帳';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 5：交易明細表（subtotal 為 GENERATED COLUMN，符合 3NF）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 transaction_items 表",
    sql: `
      CREATE TABLE transaction_items (
        id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID          NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        inventory_id   UUID          NOT NULL REFERENCES inventory(id)    ON DELETE RESTRICT,
        quantity       INTEGER       NOT NULL CHECK (quantity > 0),
        unit_price     NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
        subtotal       NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
        created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE  transaction_items            IS '交易明細表';
      COMMENT ON COLUMN transaction_items.unit_price IS '結帳當下售價快照，歷史不受商品改價影響';
      COMMENT ON COLUMN transaction_items.subtotal   IS 'GENERATED ALWAYS = quantity × unit_price';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 6：YOLOv8 邊緣數據表
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 edge_logs 表",
    sql: `
      CREATE TABLE edge_logs (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        camera_id     VARCHAR(50)  NOT NULL,
        location      VARCHAR(100),
        log_type      VARCHAR(50)  NOT NULL,
        numeric_value NUMERIC,
        json_features JSONB,
        recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE  edge_logs               IS 'YOLOv8 邊緣設備上報日誌';
      COMMENT ON COLUMN edge_logs.log_type      IS 'heatmap | queue_count | people_count | anomaly';
      COMMENT ON COLUMN edge_logs.json_features IS '熱力圖矩陣或 YOLO bounding boxes';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 7：ML 銷量預測表（UNIQUE 防重複）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 ml_forecasts 表",
    sql: `
      CREATE TABLE ml_forecasts (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        inventory_id      UUID          NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
        forecast_date     DATE          NOT NULL,
        forecast_quantity INTEGER       NOT NULL CHECK (forecast_quantity >= 0),
        confidence_score  NUMERIC(5,4)           CHECK (confidence_score BETWEEN 0 AND 1),
        model_version     VARCHAR(50),
        created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE (inventory_id, forecast_date)
      );
      COMMENT ON TABLE ml_forecasts IS 'FastAPI ML 銷量預測（UPSERT 防重複）';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 8：統一警示表（Trigger 自動寫入 + Realtime 推播）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 alerts 表",
    sql: `
      CREATE TABLE alerts (
        id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        inventory_id    UUID                  REFERENCES inventory(id)  ON DELETE SET NULL,
        alert_type      VARCHAR(50)  NOT NULL,
        severity        VARCHAR(20)  NOT NULL DEFAULT 'warning',
        title           VARCHAR(200) NOT NULL,
        message         TEXT,
        current_value   NUMERIC,
        threshold_value NUMERIC,
        status          VARCHAR(20)  NOT NULL DEFAULT 'active',
        acknowledged_by UUID                  REFERENCES auth.users(id) ON DELETE SET NULL,
        acknowledged_at TIMESTAMPTZ,
        resolved_at     TIMESTAMPTZ,
        auto_action     TEXT,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      COMMENT ON TABLE  alerts            IS '統一警示表 — Trigger 自動寫入；前端 Realtime WebSocket 訂閱';
      COMMENT ON COLUMN alerts.alert_type IS 'low_stock | expiry | queue_overflow | device_offline | ai_drift';
      COMMENT ON COLUMN alerts.severity   IS 'critical | warning | info | success';
      COMMENT ON COLUMN alerts.status     IS 'active | acknowledged | resolved';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 9：效能索引
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立索引",
    sql: `
      CREATE INDEX idx_inventory_category   ON inventory(category_id);
      CREATE INDEX idx_inventory_supplier   ON inventory(supplier_id);
      CREATE INDEX idx_inventory_expiration ON inventory(expiration_date) WHERE expiration_date IS NOT NULL;
      CREATE INDEX idx_inventory_active     ON inventory(is_active)       WHERE is_active = TRUE;
      CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
      CREATE INDEX idx_transactions_payment ON transactions(payment_method);
      CREATE INDEX idx_txn_items_txn        ON transaction_items(transaction_id);
      CREATE INDEX idx_txn_items_inv        ON transaction_items(inventory_id);
      CREATE INDEX idx_edge_logs_type       ON edge_logs(log_type);
      CREATE INDEX idx_edge_logs_camera     ON edge_logs(camera_id);
      CREATE INDEX idx_edge_logs_recorded   ON edge_logs(recorded_at DESC);
      CREATE INDEX idx_ml_forecasts_inv     ON ml_forecasts(inventory_id);
      CREATE INDEX idx_ml_forecasts_date    ON ml_forecasts(forecast_date);
      CREATE INDEX idx_alerts_status        ON alerts(status)     WHERE status != 'resolved';
      CREATE INDEX idx_alerts_created       ON alerts(created_at DESC);
      CREATE INDEX idx_alerts_type          ON alerts(alert_type);
      CREATE INDEX idx_alerts_inventory     ON alerts(inventory_id);
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 10：自動更新 updated_at 的 trigger 函數
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 fn_set_updated_at 函數與 Trigger",
    sql: `
      CREATE OR REPLACE FUNCTION fn_set_updated_at()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER trg_inventory_updated_at
        BEFORE UPDATE ON inventory
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

      CREATE TRIGGER trg_suppliers_updated_at
        BEFORE UPDATE ON suppliers
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

      CREATE TRIGGER trg_alerts_updated_at
        BEFORE UPDATE ON alerts
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 11：process_checkout RPC（防超賣核心機制）
  // 原理：SELECT ... FOR UPDATE 在 PostgreSQL 隱性事務內鎖定庫存行，
  //       高併發下後續請求等待鎖釋放，徹底防止 TOCTOU Race Condition
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 process_checkout RPC 函數",
    sql: `
      CREATE OR REPLACE FUNCTION process_checkout(
        p_items          JSONB,
        p_payment_method TEXT DEFAULT 'cash'
      )
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_transaction_id UUID;
        v_total_amount   NUMERIC(12,2) := 0;
        v_item           JSONB;
        v_inv_id         UUID;
        v_quantity       INTEGER;
        v_current_stock  INTEGER;
        v_unit_price     NUMERIC(10,2);
        v_product_name   VARCHAR(200);
        v_unit           VARCHAR(20);
      BEGIN

        IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
          RAISE EXCEPTION '結帳失敗：購物車不可為空' USING ERRCODE = 'P0001';
        END IF;

        -- PHASE 2：悲觀鎖定（FOR UPDATE = 行級排他鎖）
        -- 同時間其他 process_checkout 呼叫必須等待鎖釋放
        FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
        LOOP
          v_inv_id   := (v_item->>'inventory_id')::UUID;
          v_quantity := (v_item->>'quantity')::INTEGER;

          IF v_quantity IS NULL OR v_quantity <= 0 THEN
            RAISE EXCEPTION '結帳失敗：商品數量必須大於 0（inventory_id: %）', v_inv_id
              USING ERRCODE = 'P0002';
          END IF;

          SELECT current_stock,
                 COALESCE(dynamic_price, original_price),
                 name, unit
          INTO   v_current_stock, v_unit_price, v_product_name, v_unit
          FROM   inventory
          WHERE  id = v_inv_id AND is_active = TRUE
          FOR UPDATE;

          IF NOT FOUND THEN
            RAISE EXCEPTION '結帳失敗：找不到商品（id: %），可能已下架', v_inv_id
              USING ERRCODE = 'P0003';
          END IF;

          IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION '結帳失敗：「%」庫存不足！現有 % %，需求 % %',
              v_product_name, v_current_stock, v_unit, v_quantity, v_unit
              USING ERRCODE = 'P0004';
          END IF;

          v_total_amount := v_total_amount + (v_unit_price * v_quantity);
        END LOOP;

        -- PHASE 3：所有驗證通過，原子性寫入
        INSERT INTO transactions (cashier_id, total_amount, payment_method)
        VALUES (auth.uid(), v_total_amount, p_payment_method)
        RETURNING id INTO v_transaction_id;

        FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
        LOOP
          v_inv_id   := (v_item->>'inventory_id')::UUID;
          v_quantity := (v_item->>'quantity')::INTEGER;

          SELECT COALESCE(dynamic_price, original_price)
          INTO   v_unit_price
          FROM   inventory WHERE id = v_inv_id;

          UPDATE inventory
          SET current_stock = current_stock - v_quantity,
              updated_at    = NOW()
          WHERE id = v_inv_id;

          INSERT INTO transaction_items (transaction_id, inventory_id, quantity, unit_price)
          VALUES (v_transaction_id, v_inv_id, v_quantity, v_unit_price);
        END LOOP;

        RETURN jsonb_build_object(
          'success',        TRUE,
          'transaction_id', v_transaction_id::TEXT,
          'total_amount',   v_total_amount,
          'items_count',    jsonb_array_length(p_items),
          'payment_method', p_payment_method,
          'created_at',     NOW()
        );

      EXCEPTION WHEN OTHERS THEN
        RAISE;
      END;
      $$;

      COMMENT ON FUNCTION process_checkout(JSONB, TEXT) IS
        '防超賣結帳 RPC：FOR UPDATE 悲觀鎖定 → 庫存驗證 → 原子扣減 → 建立交易紀錄';

      GRANT EXECUTE ON FUNCTION process_checkout(JSONB, TEXT) TO authenticated;
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 12：低庫存 Trigger（自動寫 alerts → Realtime 推播）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立低庫存 Trigger",
    sql: `
      CREATE OR REPLACE FUNCTION fn_trigger_low_stock_alert()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF  NEW.current_stock <  OLD.current_stock
        AND NEW.current_stock <= NEW.safety_stock
        THEN
          INSERT INTO alerts (
            inventory_id, alert_type, severity, title, message,
            current_value, threshold_value, auto_action, status
          ) VALUES (
            NEW.id,
            'low_stock',
            CASE
              WHEN NEW.current_stock = 0                       THEN 'critical'
              WHEN NEW.current_stock <= NEW.safety_stock * 0.5 THEN 'critical'
              ELSE 'warning'
            END,
            '低庫存警示：' || NEW.name,
            NEW.name || '（條碼：' || NEW.barcode || '）剩餘 ' ||
              NEW.current_stock || ' ' || NEW.unit ||
              '，已低於安全庫存閾值 ' || NEW.safety_stock || ' ' || NEW.unit,
            NEW.current_stock,
            NEW.safety_stock,
            '系統已標記需補貨，建議立即���出補貨申請',
            'active'
          );
        END IF;
        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER trg_inventory_low_stock
        AFTER UPDATE OF current_stock ON inventory
        FOR EACH ROW
        EXECUTE FUNCTION fn_trigger_low_stock_alert();

      COMMENT ON FUNCTION fn_trigger_low_stock_alert() IS
        '庫存低於 safety_stock 時自動寫入 alerts；前端透過 Supabase Realtime 訂閱即時通知';
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 13：啟用 RLS
  // ─────────────────────────────────────────────────────────────────
  {
    name: "啟用 Row Level Security",
    sql: `
      ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
      ALTER TABLE suppliers         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE inventory         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
      ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE edge_logs         ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ml_forecasts      ENABLE ROW LEVEL SECURITY;
      ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 14：RLS 政策（authenticated users 可完整操作）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "建立 RLS 政策",
    sql: `
      CREATE POLICY "auth_all_categories"
        ON categories FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

      CREATE POLICY "auth_all_suppliers"
        ON suppliers  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

      CREATE POLICY "auth_all_inventory"
        ON inventory  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

      CREATE POLICY "auth_read_transactions"
        ON transactions FOR SELECT TO authenticated USING (TRUE);

      CREATE POLICY "auth_insert_transactions"
        ON transactions FOR INSERT TO authenticated
        WITH CHECK (cashier_id = auth.uid() OR cashier_id IS NULL);

      CREATE POLICY "auth_all_txn_items"
        ON transaction_items FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

      CREATE POLICY "auth_read_edge_logs"
        ON edge_logs FOR SELECT TO authenticated USING (TRUE);

      CREATE POLICY "auth_insert_edge_logs"
        ON edge_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

      CREATE POLICY "auth_read_ml_forecasts"
        ON ml_forecasts FOR SELECT TO authenticated USING (TRUE);

      CREATE POLICY "auth_insert_ml_forecasts"
        ON ml_forecasts FOR INSERT TO authenticated WITH CHECK (TRUE);

      CREATE POLICY "auth_read_alerts"
        ON alerts FOR SELECT TO authenticated USING (TRUE);

      CREATE POLICY "auth_update_alerts"
        ON alerts FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);

      CREATE POLICY "auth_insert_alerts"
        ON alerts FOR INSERT TO authenticated WITH CHECK (TRUE);
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 15：啟用 Realtime 推播（alerts 表）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "啟用 Realtime 推播",
    sql: `ALTER PUBLICATION supabase_realtime ADD TABLE alerts;`,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 16：插入類別種子資料
  // ─────────────────────────────────────────────────────────────────
  {
    name: "插入 categories 種子資料",
    sql: `
      INSERT INTO categories (name, description) VALUES
        ('飲料',   '各類瓶裝飲料、茶飲、咖啡'),
        ('乳製品', '鮮奶、乳飲品、優格'),
        ('熟食',   '便當、熱食、關東煮'),
        ('輕食',   '飯糰、三明治、沙拉'),
        ('零食',   '餅乾、薯片、糖果'),
        ('甜點',   '布丁、蛋糕、果凍'),
        ('保養',   '面膜、保養品、個人清潔'),
        ('日用品', '文具、生活雜貨')
      ON CONFLICT (name) DO NOTHING;
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 17：插入供應商種子資料
  // ─────────────────────────────────────────────────────────────────
  {
    name: "插入 suppliers 種子資料",
    sql: `
      INSERT INTO suppliers (name, contact_name, phone, email) VALUES
        ('統一企業',     '張業務', '02-2747-8000', 'sales@uni-president.com.tw'),
        ('台灣純水',     '李採購', '03-5678-1234', 'service@twpurewater.com.tw'),
        ('統一鮮食',     '王品管', '02-2312-5678', 'fresh@uni-president.com.tw'),
        ('City Café',    '陳客服', '02-2700-8888', 'cafe@citysuper.com.tw'),
        ('可樂農場',     '林業務', '04-2359-8765', 'info@cola-farm.com.tw'),
        ('伊藤園',       '吳貿易', '02-2500-3333', 'tw@itoen.co.jp'),
        ('卡夫亨氏',     '黃業代', '02-8751-4321', 'tw@kraftheinz.com'),
        ('大塚製藥',     '陳代理', '02-2705-5000', 'tw@otsuka.co.jp'),
        ('我的美麗日記', '許公關', '02-8768-2288', 'pr@my-beauty-diary.com.tw'),
        ('維力食品',     '蔡業務', '04-2239-4567', 'sales@wei-lih.com.tw')
      ON CONFLICT (name) DO NOTHING;
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 18：插入庫存商品種子資料（子查詢關聯 FK）
  // ─────────────────────────────────────────────────────────────────
  {
    name: "插入 inventory 種子資料",
    sql: `
      INSERT INTO inventory
        (barcode, name, category_id, supplier_id,
         original_price, dynamic_price,
         current_stock, safety_stock, unit,
         arrival_date, expiration_date)
      SELECT
        v.barcode, v.name,
        c.id AS category_id,
        s.id AS supplier_id,
        v.orig::NUMERIC,
        v.dyn::NUMERIC,
        v.stock::INTEGER,
        v.safety::INTEGER,
        v.unit,
        v.arrival::DATE,
        v.exp::DATE
      FROM (VALUES
        ('4711233010027','統一鮮奶 (936ml)', '乳製品','統一企業',    '85', '68',   '3',  '20','瓶','2026-04-01','2026-04-09'),
        ('4714321012345','礦泉水 550ml',     '飲料',  '台灣純水',    '20', NULL,   '8',  '50','瓶','2026-03-15','2026-10-15'),
        ('4711432100234','雞排便當',          '熟食',  '統一鮮食',    '75', '60',  '12',  '10','份','2026-04-07','2026-04-07'),
        ('4714321012346','拿鐵咖啡 (大)',     '飲料',  'City Café',   '65', '55',  '24',  '15','杯','2026-04-07','2026-04-10'),
        ('4711233010028','日式飯糰 (鮭魚)',   '輕食',  '統一鮮食',    '35', NULL,  '18',  '10','個','2026-04-07','2026-04-08'),
        ('4714321012347','薯片 (原味)',       '零食',  '可樂農場',    '30', NULL,  '45',  '20','包','2026-03-01','2026-09-30'),
        ('4711432100235','綠茶 (500ml)',      '飲料',  '伊藤園',      '25', '28',  '62',  '30','瓶','2026-03-20','2026-12-31'),
        ('4711233010029','布丁 (雞蛋口味)',   '甜點',  '統一企業',    '30', '22',   '5',  '15','個','2026-04-05','2026-04-08'),
        ('4714321012348','關東煮 (組合)',     '熟食',  '統一鮮食',    '50', '40',   '7',  '12','份','2026-04-07','2026-04-07'),
        ('4714321012349','Oreo 餅乾 (雙倍)', '零食',  '卡夫亨氏',    '45', NULL,  '38',  '20','包','2026-01-15','2027-03-15'),
        ('4711432100236','維他命飲料',        '飲料',  '大塚製藥',    '35', '38',  '29',  '20','瓶','2026-02-10','2026-08-20'),
        ('4711233010030','面膜 (補水)',       '保養',  '我的美麗日記','120', NULL,  '14',  '10','片','2026-01-20','2027-06-30'),
        ('4710088001234','統一茶裏王 無糖',   '飲料',  '統一企業',    '20', NULL, '248',  '50','瓶','2026-03-25','2026-12-31'),
        ('4710058003421','光泉低脂鮮乳',      '乳製品','統一企業',    '20', NULL, '180',  '40','瓶','2026-04-05','2026-04-12'),
        ('4718854001234','科學麵',           '零食',  '維力食品',    '10', NULL, '320',  '80','包','2026-01-01','2026-11-30')
      ) AS v(barcode, name, cat, sup, orig, dyn, stock, safety, unit, arrival, exp)
      JOIN     categories c ON c.name = v.cat
      LEFT JOIN suppliers s ON s.name = v.sup
      ON CONFLICT (barcode) DO UPDATE SET
        dynamic_price   = EXCLUDED.dynamic_price,
        current_stock   = EXCLUDED.current_stock,
        safety_stock    = EXCLUDED.safety_stock,
        expiration_date = EXCLUDED.expiration_date,
        updated_at      = NOW();
    `,
  },

  // ─────────────────────────────────────────────────────────────────
  // STEP 19：插入初始警示種子資料
  // ─────────────────────────────────────────────────────────────────
  {
    name: "插入 alerts 種子資料",
    sql: `
      INSERT INTO alerts (inventory_id, alert_type, severity, title, message, current_value, threshold_value, auto_action, status)
      SELECT inv.id, a.alert_type, a.severity, a.title, a.message,
             a.cur, a.thr, a.action, a.status
      FROM (VALUES
        ('4714321012345','low_stock',    'critical','礦泉水庫存嚴重不足',   '礦泉水 (550ml) 剩餘 8 件，低於安全庫存 50 件。當前銷售速率預計 2 小時後完全售罄。', 8,  50, '已自動送出補貨申請至倉儲系統', 'active'),
        ('4711233010027','expiry',       'critical','乳製品即將到期',       '統一鮮奶 (936ml) 等 3 項乳製品將於 2 天內到期，建議啟動 AI 動態折扣促進銷售。',       3,  2,  'AI 建議折扣 20%', 'active'),
        ('4714321012348','expiry',       'critical','關東煮今日到期',       '關東煮 (組合) 共 7 件今日到期，請立即確認是否下架或啟動緊急促銷。AI 建議折扣至 NT$30。', 0, 0,  'AI 已自動調整定價至 NT$30', 'acknowledged'),
        ('4711233010029','low_stock',    'warning', '布丁庫存低於安全值',   '布丁 (雞蛋口味) 剩餘 5 件，低於安全庫存 15 件。預計需要在 3 天內補貨。',              5,  15, NULL, 'active'),
        (NULL,           'queue_overflow','critical','收銀區排隊人數超載',  'YOLOv8 偵測到收銀區現有 12 人排隊，已超過設定上限 8 人。建議立即開啟備用收銀台 #2。',  12, 8,  '系統已推播通知給值班主管', 'active'),
        (NULL,           'ai_drift',     'info',    'AI 動態定價模型已更新','ML 模型已基於最新銷售數據重新訓練。本次更新涵蓋 23 項商品，預計可提升整體毛利 8.3%。',  NULL,NULL,'自動套用新定價策略至 23 項商品', 'resolved'),
        (NULL,           'ai_drift',     'success', '今日銷售目標達成',     '累積營業額 NT$68,420 已達成日目標 103%。AI 預測今日最終可達 NT$82,000。',             NULL,NULL, NULL, 'resolved')
      ) AS a(barcode, alert_type, severity, title, message, cur, thr, action, status)
      LEFT JOIN inventory inv ON inv.barcode = a.barcode
      ON CONFLICT DO NOTHING;
    `,
  },
];
