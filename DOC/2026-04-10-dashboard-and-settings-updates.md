# 開發紀錄：儀表板即時數據與資料庫設定升級

## 📅 日期：2026-04-10
## 🚀 專案模組：RetailAI Dashboard (`/dashboard`) & Settings (`/settings`)

---

### 📌 功能概述
為了強化營運中心的數據即時性與系統透明度，本次對儀表板及系統設定頁面實施了以下兩大升級：
1. **即時營業額與低庫存警示同步**：將原本儀表板上依賴靜態快照的每日營業額，改為直接對比今日真實的「交易明細 (Transactions)」即時運算產生。同時在下方新增了「即將到期/低庫存警示」商品清單，幫助門市人員快速發現缺貨危機。
2. **資料庫設定連動真實數據**：在「系統設定 (Settings) > 資料庫管理」中，原本僅作為靜態展示的各資料表數量列，現在改為由專用 API 即時撈取 PostgreSQL 資料庫的各 Table `count()` 提供實際筆數。

---

### 🛠️ 技術實作細節

#### 1. API 介接擴充 (`api.ts`)
- **`getDashboardKPI` 重構**：
  引入 `Promise.all` 並行查詢 `transactions` (限定今日) 與 `inventory` 資料表。
  改寫由真實的 `total_amount` 來加總今日實際營收，且巡邏所有 inventory 商品，凡小於等於 `safety_stock` 的便納入低庫存陣列 (`low_stock_items`) 拋給前端。
- **新增 `getDatabaseStats` 方法**：
  提供了一支全新的函式，自動輪詢包含 `categories`, `inventory`, `transactions`, `alerts` 等八大核心資料表，利用 `{ count: 'exact', head: true }` 的輕量化方式取得目前資料庫的當下資料筆數。

#### 2. 介面與互動設計 (`DashboardPage.tsx`)
- 追加了在頁面最下方的 `<div className="mt-5 rounded-xl p-5 border">` 面板，專門讀取 KPI 中夾帶的 `low_stock_items` 陣列，並以雙向列印的方式將品名與安全水位赤裸呈現。如果存量歸零 (`current_stock === 0`)，不僅狀態上會亮紅燈，上方還會標註「X 項緊急」。

#### 3. 系統設定動態渲染 (`SettingsPage.tsx`)
- 在 `DatabaseSettings` 模組內建構了一套 `tables` 狀態，利用 `useEffect` 發送請求到 `getDatabaseStats`。並將靜態的固定文字置換為 `item.count` 變數。在等待載入期間加上了 `Lucide-react` 的 `Loader2` 迴圈動畫，維持高質感的轉場體驗。而且當使用者點下「執行 SQL 遷移」完成後，會馬上進行重算並更新列表數字！

### ✅ 結案狀態
已完美融合真實資料庫的運作，不論是儀表板還是設定頁都能展現出目前最新的生產環境 (Production) 資料狀態，達成真正意義上的即時性 (Real-time)。
