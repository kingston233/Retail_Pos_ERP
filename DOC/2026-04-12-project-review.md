# 專案總覽與系統評估報告 (RetailAI System Review)

## 📌 系統整體框架
基於近期開發紀錄（儀表板、設定與庫存系統更新），本系統採用了現代化的前後端分離與雲端資料庫架構：

- **前端框架**：使用 **React** 建立使用者介面 (根據 `.tsx` 副檔名判斷)，搭配 **TypeScript** 實現強型別檢查。UI 切版使用了類似 Tailwind CSS 的 Utility-First CSS (如 `mt-5`, `rounded-xl`, `p-5` 等)，並且選用 `lucide-react` 作為圖示庫來提升視覺體驗（如載入動畫）。
- **後端與資料庫**：採用 **Supabase (基於 PostgreSQL)** 作為 Backend-as-a-Service 雲端資料庫。資料庫不僅使用傳統關聯式資料表，也應用了 `JSONB` 欄位（用來靈活儲存每週叫貨規則），具備極佳的擴充性。
- **資料存取層**：前端透過 `api.ts` 作為中介，使用 Promise 與後端進行資料通訊，並利用 Supabase 客戶端提供的方法（如 `{ count: 'exact' }`）進行效能優化的檢索。

---

## 📂 核心檔案功能與作用解析

### 1. 資料存取 API 層
- **`api.ts`**
  - **功能**：負責前端 UI 與後端資料庫（Supabase）的介接，封裝了各種業務邏輯所需的請求。
  - **作用**：
    - `getDashboardKPI`：並行 (Promise.all) 獲取今日交易明細 (`transactions`) 來動態加總真實營業額，同時撈取庫存 (`inventory`) 來檢查並回傳低於安全水位的警告商品。
    - `getDatabaseStats`：使用輕量的請求方式輪詢取得各核心資料表 (如 `categories`, `inventory`, `alerts` 等) 的即時總筆數。
    - `updateProduct` / `createProduct`：處理新增與更新商品邏輯，支援寫入商品效期 (`expiration_date`) 及複雜的 JSON 叫貨規則參數 (`reorder_rules`)。

### 2. 顯示與互動介面層 (React Components)
- **`DashboardPage.tsx` (儀表板頁面)**
  - **功能**：商店營運狀況的首頁與即時戰情室。
  - **作用**：展示由 API 計算出的「即時營業額」KPI。具備一個專屬警示面板，隨時把「即將到期 / 低庫存」的商品清單與安全水位呈現給管理員，庫存歸零時更會顯示紅色視覺警示以提醒危機。
- **`SettingsPage.tsx` (系統設定頁面)**
  - **功能**：資料庫狀態與系統後台管理。
  - **作用**：利用 React 的狀態 (`useEffect`) 配合載入動畫，動態展示目前資料庫中包含遷移狀態、各個 Table 實際儲存的筆數容量。此外也是店長執行 SQL 遷移等高權限資料庫操作的入口。
- **`InventoryPage.tsx` (庫存管理頁面)**
  - **功能**：處理商品入庫作業與細緻化庫存規則的參數設定。
  - **作用**：
    - **進貨分頁 (Restock Tab)**：提供介面讓員工在進貨同時，能夠利用時間選擇器指定該批商品的「有效期限」。
    - **設定彈窗 (Config Modal)**：讓管理者針對每項商品獨立編輯「安全庫存警示量 (`safety_stock`)」，以及直覺地以星期一到日為單位配置「每日最大叫貨基準 (`reorder_rules`)」。

---

## 🚀 期望新增的功能 (Feature Requests)

基於目前名為 "RetailAI" 的設計架構與商店營運需求，未來推薦引入以下新業務功能：
1. **自動化採購/叫貨生成系統 (Auto-PO Generation)**：透過當前已完善配置的「安全庫存」與「每週叫貨基準」，未來可讓系統在每日盤點期間，自動比對缺件並產出「建議對外採購單」，交由店長一鍵確認即可發送。
2. **AI 銷量預測與動態水位調整**：既然專題具有 AI 定位，未來可彙整長時間交易明細建立預測模型。系統能依據「天氣、節慶、週末效應」等變數，預判未來幾天銷量，並據此**動態微調安全庫存量 (safety_stock)**，減少手動調漲跌的機會。
3. **即時通訊軟體警報推送 (Push Notifications)**：當庫存歸零 (`current_stock === 0`) 或有過期商品時，除了在網頁 Dashboard 亮紅燈，可透過 Webhook 結合 LINE Notify、Slack 等串接即時通知給值班人員。
4. **掃碼與條碼整合入庫**：在庫存與進貨頁面，支援行動裝置攝像頭或 USB 掃描槍快速帶入進貨商品，不用手動用滑鼠點擊。

---

## 🔧 可以改善的問題 (Potential Improvements)

目前的架構已足夠應付初步運作，但若為了更好的擴充性與效能，可對下列技術盲區進行改善：
1. **重構 API 資料傳輸效率 (前端資料計算過載)**：
   - **現狀問題**：根據紀錄，在 `getDashboardKPI` 似乎拉回了過多的交易和庫存清單到前端的程式碼層才進行「加總與比對 (<安全庫存)」。
   - **解決方案**：這些計算應該交由 Supabase / PostgreSQL 在資料庫層執行完畢。「低庫存商品」應在 query 端直接透過 `.lte('stock', 'safety_stock')` 篩選；而「今日營收」可考量透過資料庫聚合函式（`SUM`）或是 RPC (Stored Procedure) 處理，以免資料變大後前端記憶體溢位 (OOM)。
2. **用 Realtime 取代 API 輪詢 (Polling)**：
   - **現狀問題**：`getDatabaseStats` 與儀表板目前似乎用輪詢 (Polling) 的方式更新畫面數字，這會浪費許多不必要的 HTTP 請求。
   - **解決方案**：可改用 `Supabase Realtime` (實作 WebSocket) 訂閱資料表變更 (`INSERT`, `UPDATE`)。只要有新交易發生，前端數字庫存與 KPI 自動更新，不僅省資源且效能更好。
3. **優化 JSONB 查詢與索引效能**：
   - **現狀問題**：雖然 `reorder_rules` 用 `JSONB` 存取很方便，但如果以後需要撈出所有「星期一需補貨 > 20 件」的清單，全表掃描效能非常差。
   - **解決方案**：未來有複雜查詢需求時，應先在 PostgreSQL 為特定的 Json 鍵位建置 `GIN Index` 索引。
4. **錯誤處理 (Fallback & Error Boundaries)**：
   - **現狀問題**：文件並未提及等待期間若 API 錯誤 (Network Error) 或逾時，前端該如何因應。
   - **解決方案**：加入 React 的全局 Error Boundary 及完善的 Toast (提示氣泡) 錯誤回報機制，以免因一筆 API Timeout 使整個 Dashboard 呈空白當機狀態。
