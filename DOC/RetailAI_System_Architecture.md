# RetailAI 智慧零售管理系統 - 系統架構與功能總覽

## 1. 專案簡介 (Project Overview)
**RetailAI** 是一套專為現代化連鎖零售與超市設計的「全渠道智慧營運 ERP 與 POS 解決方案」。
系統旨在解決傳統零售業「前台收銀」與「後台庫存」脫鉤的問題，並透過導入 AI 數據分析、電腦視覺客流統計與動態定價模型，協助店鋪實現零時差的數位轉型。

本系統擁有極致的 UI/UX 設計，不僅支援完整的觸控式 POS 收銀流程，更提供數據導向的高階主管決策儀表板。

---

## 2. 系統技術架構 (Tech Stack)

### 前端 (Frontend)
- **核心框架**：React 18 + TypeScript + Vite
- **UI 與樣式**：Tailwind CSS (響應式設計)、Lucide React (高品質圖示集)
- **視覺呈現**：Glassmorphism (類玻璃透視感)、流暢的元件轉場與微動畫設計
- **圖表與數據**：Recharts (折線圖、長條圖與圓餅圖)

### 後端與資料庫 (Backend & Database)
- **BaaS 平台**：Supabase
- **核心資料庫**：PostgreSQL (具備強大的關聯查詢與資料一致性保障)
- **安全機制**：Row Level Security (RLS) 資料庫權限管控
- **特殊技術**：
  - `JSONB` 欄位：靈活儲存一週每日的不同叫貨基準點 (`reorder_rules`)。
  - `GENERATED ALWAYS`：利用資料庫底層虛擬欄位，確保交易明細 (`subtotal`) 計算的絕對精確無誤差。

### AI 與進階整合層 (AI & Edge Integration)
- **邊緣運算**：預留接收 YOLOv8 攝影機分析資料的資料表 (`edge_logs`)，用於客流熱區與排隊長度監測。
- **機器學習**：建立 `ml_forecasts` 資料表存放 FastAPI 分析出的 7 天銷量預測結果。

---

## 3. 核心模組功能介紹 (Core Features)

### 📊 1. 營運決策儀表板 (Dashboard)
做為店長與管理層的每日入口，全面展示當日即時 KPI：
- **即時營收追蹤**：讀取今日所有交易紀錄加總，並對比昨日營收變化。
- **緊急狀態中心**：動態掃描資料庫，主動列出「庫存為 0」或「低於安全庫存」的商品清單，亮紅燈示警。
- **數據視覺化**：結合長條圖、圓餅圖，剖析每日尖峰客流時段、銷售通路比重與付款方式 (Cash / LinePay / 信用卡) 佔比。

### 🛒 2. 智慧前台收銀 (POS 系統)
提供門市人員流暢且直覺的結帳介面：
- **購物車系統**：快速點選商品、即時搜尋，支援修改數量與清空購物車。
- **多元支付結帳**：完成結帳後會即時扣除 Supabase 中的雲端庫存，並將紀錄完整寫入 `transactions` (主單) 與 `transaction_items` (明細)。
- **防呆與零時差**：庫存為零時無法加入購物車，避免超賣問題。

### 📦 3. 進銷存與庫存管理 (Inventory ERP)
擺脫傳統的繁雜 Excel，具備現代化進銷存功能：
- **商品矩陣總覽**：條碼、分類、成本、供應商與存貨狀態一覽無遺。
- **智慧預警系統**：可為單一商品設定獨特的「安全庫存警示值 (`safety_stock`)」。
- **彈性叫貨規則**：以 JSONB 格式實作 `reorder_rules`，可設定週一到週日每天不同的最大補貨基準量。
- **批次進貨與效期管理**：在進貨時可同時輸入數量與「有效期限 (`expiration_date`)」，系統會自動判斷（過期、緊急、正常）狀態。

### 🧾 4. 交易明細稽核 (Transactions)
提供完整的營收覆核中心：
- 條列歷史結帳單，包含每筆訂單的時間、經手人與結帳方式。
- 可展開檢視每張訂單下買了哪些「商品明細 (Transaction Items)」，精確到每一件商品的數量與單價，滿足 ERP 財務審計需求。

### ⚙️ 5. 系統設定與資料庫管理 (Settings)
專為系統管理員 (Admin) 打造的技術維運後台：
- **真實架構視覺化**：動態調用 API，顯示 PostgreSQL 中各大資料表 (`inventory`, `transactions`, `alerts` 等) 的當下資料筆數。
- **環境管理**：內建一鍵執行資料庫遷移 (Migration) 與種子資料 (Seed) 初始化按鈕。
- **UI 與主題微調**：提供暗黑/明亮主題切換、UI 緊湊度等個人化介面設定。

---

## 4. 資料庫架構 (Database ERD Summary)
整體採用極度嚴謹的 3NF 關聯式架構：
- **Master Data (維度表)**：`categories` (類別), `suppliers` (供應商)
- **Core Entity (主表)**：`inventory` (商品庫存)
- **Transaction (交易表)**：經典的 Header-Detail 架構。`transactions` 作為表頭，透過 Foreign Key 串接 `transaction_items` 作為表身。
- **Analytics (分析表)**：`daily_kpi` (每日營運快取), `ml_forecasts` (預測模型結果), `edge_logs` (客流與邊緣視覺辨識)。
