# RetailAI 資料庫綱要與欄位詳細介紹 (Database Schema Dictionary)

本文件詳細記錄 RetailAI 系統的 PostgreSQL 關聯式資料庫架構。各資料表 (Table) 皆具有嚴謹的型別定義與關聯限制 (Foreign Keys)，以確保 ERP 與 POS 系統所需的絕對資料一致性。

---

## 1. 庫存與供應鏈核心 (Master Data & Inventory)

### 📦 `inventory` (商品庫存主檔)
系統中最核心的資料表，負責紀錄商品的所有狀態、定價、與補貨邏輯。
* `id` (UUID): 系統主鍵，自動產生。
* `barcode` (VARCHAR): 商品條碼 (具備 Unique 唯一性)。
* `name` (VARCHAR): 商品名稱。
* `category_id` (UUID): 商品分類外鍵，關聯至 `categories`。
* `supplier_id` (UUID): 供應商外鍵，關聯至 `suppliers`。
* `original_price` (NUMERIC): 商品原價/基準價 (不可為負數)。
* `dynamic_price` (NUMERIC): AI 動態定價 (若啟動浮動促銷時覆蓋原價)。
* `current_stock` (INT): 目前實體庫存數量 (不可為負數)。
* `safety_stock` (INT): 安全庫存警戒值，當庫存低於此數值將觸發系統預警。
* `unit` (VARCHAR): 計量單位 (如：件、瓶、杯)。
* `arrival_date` (DATE): 該批次商品進貨日期。
* `expiration_date` (DATE): 該批次商品有效期限，逾期將被系統視為廢棄物。
* `reorder_rules` (JSONB): 彈性設定欄位，用於儲存一週每日的叫貨基準量 (例如：`{"Monday": 20, "Tuesday": 15}`)。
* `is_active` (BOOL): 商品是否處於上架狀態。

### 🏷️ `categories` (商品分類維度表)
* `id` (UUID): 主鍵。
* `name` (VARCHAR): 分類名稱 (如：飲料、輕食、熟食)。
* `description` (TEXT): 分類說明。

### 🏭 `suppliers` (供應商維度表)
* `id` (UUID): 主鍵。
* `name` (VARCHAR): 供應商/廠商名稱。
* `contact_name` (VARCHAR): 聯絡窗口姓名。
* `phone` (VARCHAR): 聯絡電話。
* `email` (VARCHAR): 聯絡信箱。
* `address` (TEXT): 廠商地址。

---

## 2. 交易與銷售紀錄 (Transactions Header-Detail)

採用經典的表頭 (Header) 與明細 (Detail) 雙表結構設計，完全符合 ERP 財務稽核標準。

### 🧾 `transactions` (交易主單/表頭)
紀錄每一筆客戶在 POS 終端完成結帳的總體資訊。
* `id` (UUID): 主單交易序號。
* `cashier_id` (UUID): 收銀員 ID，外鍵關聯至 Supabase `auth.users` 權限系統。
* `total_amount` (NUMERIC): 該筆訂單最終結帳總金額。
* `payment_method` (VARCHAR): 付款方式 (例如：`cash` 現金、`linepay`、`credit_card`)。
* `note` (TEXT): 該筆交易的特殊備註。
* `created_at` (TIMESTAMPTZ): 交易成立時間戳記。

### 🛒 `transaction_items` (交易明細/表身)
紀錄主單底下購買的所有商品清單與計算細節。
* `id` (UUID): 明細序號。
* `transaction_id` (UUID): 外鍵關聯至 `transactions.id`。
* `inventory_id` (UUID): 外鍵關聯至 `inventory.id`，指向購買的商品。
* `quantity` (INT): 購買數量 (必須大於 0)。
* `unit_price` (NUMERIC): 結帳當下的單價 (避免商品日後改價影響歷史帳目)。
* `subtotal` (NUMERIC): **資料庫自動運算欄位 (GENERATED ALWAYS)**。由系統底層自動執行 `quantity * unit_price`，確保小計絕不出錯，杜絕前端竄改風險。

---

## 3. 異常監控與營運分析 (Analytics & Operations)

### 🚨 `alerts` (異常警示表)
收集由系統主動拋出的各類緊急事件，供管理員或 Dashboard 查閱。
* `id` (UUID): 主鍵。
* `inventory_id` (UUID): 觸發警示的關聯商品。
* `alert_type` (VARCHAR): 警示類型 (如：`low_stock` 庫存過低、`expiring` 即將到期)。
* `severity` (VARCHAR): 嚴重程度 (如：`warning` 警告、`critical` 緊急)。
* `title` (VARCHAR) / `message` (TEXT): 警示的標題與詳細說明。
* `threshold_value` (NUMERIC): 觸發警示時的門檻值 (如當時設定的安全庫存量)。
* `status` (VARCHAR): 處理狀態 (`active` 處理中、`resolved` 已解決)。
* `auto_action` (TEXT): 系統是否已針對此警示採取自動化措施 (如自動發送 Email 叫貨)。

### 📈 `daily_kpi` (每日營運指標快照)
用於 Dashboard 快速顯示的每日統計摘要，降低每次都去撈取幾十萬筆明細的資料庫負擔。
* `date` (DATE): 日期 (主鍵)。
* `revenue` (NUMERIC): 今日累計營收。
* `prev_revenue` (NUMERIC): 昨日對比營收。
* `customers` (INT): 今日總來客數。
* `low_stock_critical` (INT): 目前處於緊急狀態的商品總數。

---

## 4. AI 預測與邊緣運算 (AI & Edge Computing)

預留給未來零售 2.0 的進階模組，儲存電腦視覺與機器學習資料。

### 🧠 `ml_forecasts` (AI 銷量預測)
存放透過 FastAPI 或其他機器學習模型所跑出來的未來銷量預測。
* `id` (UUID): 主鍵。
* `inventory_id` (UUID): 關聯預測的商品。
* `forecast_date` (DATE): 預測的未來日期。
* `forecast_quantity` (INT): 模型預估會賣出的數量。
* `confidence_score` (NUMERIC): 模型的信心水準 (0 ~ 1 之間)。
* `model_version` (VARCHAR): 產出此預測的演算法/模型版本號。

### 📷 `edge_logs` (邊緣運算感測日誌)
收集由店內攝影機 (如 YOLOv8) 或 IoT 感測器回傳的高頻度資料。
* `id` (UUID): 主鍵。
* `camera_id` (VARCHAR): 攝影機或感測器設備編號。
* `location` (VARCHAR): 設備部署位置 (如：入口處、冷藏櫃前)。
* `log_type` (VARCHAR): 辨識類型 (如：`people_count` 排隊人數計數)。
* `numeric_value` (NUMERIC): 分析出的數值 (如：排隊 5 人)。
* `json_features` (JSONB): 詳細的特徵或座標追蹤資料。
* `recorded_at` (TIMESTAMPTZ): 影像分析當下的時間。
