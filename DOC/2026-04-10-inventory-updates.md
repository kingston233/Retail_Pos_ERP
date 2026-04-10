# 開發紀錄：庫存管理系統升級（進貨效期與警示叫貨規則設定）

## 📅 日期：2026-04-10
## 🚀 專案模組：RetailAI 庫存管理 (`/inventory`)

---

### 📌 功能概述
為了讓總部 / 店長對於後場的庫存週轉與盤點具備更深的精確度，本次我們對庫存頁面實施了兩大升級：
1. **即時進貨綁定有效期限**：原本單純按數字的進貨按鈕旁擴充了效期輸入框。
2. **精細化單品安全與叫貨門檻**：解鎖並實作了庫存清單中的編輯按鈕，開放獨立為每一個商品設定「警示庫存水位」與「週間七日每日最大叫貨基準」。

---

### 🛠️ 技術實作細節

#### 1. 資料庫變更 (Database Level)
透過 Supabase Migration 在 `inventory` 資料表加上了新的設定欄位：
```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_rules JSONB DEFAULT '{}'::jsonb;
```
此 JSON 欄位架構用來記錄如 `{"mon": 20, "tue": 15, ...}` 的每週安全訂貨基準數值。

#### 2. API 介接擴充 (`api.ts`)
- 為 `Product` 介面新增 `reorder_rules` 型別對應的 TypeScript 屬性。
- 修訂 `updateProduct` 與 `createProduct` 方法。當收到 `expiration_date` 或 `reorder_rules` 屬性時，會直接往後端 Database 同步覆寫，維持商業邏輯在伺服器端資料結構的一致性。

#### 3. 介面與互動設計 (`InventoryPage.tsx`)
- **現有商品進貨分頁 (Restock Tab)**：
  為每一個 `<div className="flex items-center gap-1">` 新增了一個 `<input type="date">` 欄位供選擇商品進廠效期。當按下「進貨」按鈕後，會同時將增長的 `stock` 數量與該商品的最新 `expiration_date` 一起送向資料庫。
- **編輯功能模組 (Config Modal)**：
  原本無功能的 `Edit2` 按鈕現已支援彈出設定視窗，內含：
  1. **安全庫存警示量**：`safety_stock` 輸入框。
  2. **一週七天叫貨上限**：以 `daysOfWeek` 巡迴產生的星期一～星期日七個 `reorder_rules` 輸入方塊，直覺且易用。修改完畢後透過統一儲存按鈕存入。

### ✅ 結案狀態
所有新增介面皆運作順暢並完全採用 `Supabase (PostgreSQL)` 原生寫入，達成了完全動態的店鋪參數設定方案。
