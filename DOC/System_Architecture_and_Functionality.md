# RetailAI 系統架構与功能介紹

## 1. 專案概述

RetailAI 是一個專為現代零售業打造的智能化管理系統（UI/UX 源自 Figma 設計）。該系統結合了前端的現代化網頁技術與後端的 Supabase 雲端資料庫，提供包含銷售（POS）、庫存管理、客戶關係管理（CRM）、數據分析及機器學習預測等全方位功能。

## 2. 系統架構

### 2.1 前端架構 (Frontend)
前端採用現代化的 React 技術棧進行開發，並注重高效的開發體驗與流暢的使用者介面：
- **核心框架**：React 18 + Vite
- **路由管理**：React Router (支援 Dashboard、POS、Inventory 等多頁面導航)
- **UI/樣式系統**：Tailwind CSS + Radix UI (無頭元件庫，用於打造高無障礙標準的組件) + 少量 Material UI Icons 及 Framer Motion (`motion`) 用於動畫。
- **後端通訊**：使用 `@supabase/supabase-js` 與後端資料庫和 Edge Functions 進行即時互動與資料存取。

### 2.2 後端架構 (Backend - Supabase)
後端完全託管於 Supabase (專案名稱：`Retail_Official`)，提供 PostgreSQL 資料庫、身分驗證 (Auth) 以及無伺服器邊緣函式 (Edge Functions)。

#### 2.2.1 資料庫設計 (PostgreSQL Schema)
系統的核心資料表設計涵蓋了零售業的各個面向：
- **商品與庫存模組**：
  - `categories`: 商品分類。
  - `suppliers`: 供應商資訊。
  - `inventory`: 核心庫存表，包含商品條碼 (`barcode`)、價格 (`original_price`, `dynamic_price`)、當前庫存 (`current_stock`) 及安全庫存 (`safety_stock`)。
- **銷售與交易模組**：
  - `transactions`: 記錄每一筆收銀交易，包含總金額及支付方式，關聯至收銀員 (Auth user)。
  - `transaction_items`: 記錄交易中的具體商品及數量、小計。
- **數據與 AI 預測模組**：
  - `edge_logs`: 記錄邊緣裝置（如攝影機）傳送的日誌，可能用於客流統計或異常偵測。
  - `ml_forecasts`: 儲存機器學習對未來庫存或銷售的預測資料 (`forecast_quantity`, `confidence_score`)。
  - `daily_kpi`: 記錄每日關鍵績效指標（營收、客流量、達標率等）。
- **客戶關係管理 (CRM)**：
  - `customers`: 顧客資料，包含會員等級 (`tier`)、消費總額 (`total_spent`) 及光顧次數。
- **系統與通知模組**：
  - `alerts`: 系統警告通知（如庫存不足、設備異常），包含警告層級與處理狀態。
  - `kv_store`: 用於儲存系統設定或環境變數的鍵值對。

#### 2.2.2 邊緣運算 (Edge Functions)
- **`make-server-6583f926`**：處於 Active 狀態的 Edge Function，負責處理特定的伺服器端邏輯、第三方 API 串接或做為 Webhook 的接收端點。

## 3. 核心功能模組

根據專案的路由設定 (`routes.tsx`) 以及資料表結構，系統具備以下核心功能：

1. **Dashboard (總覽面板)**
   - 結合 `daily_kpi` 與 `alerts` 呈現當日營收、來客數變動及系統重要通知，提供管理者全局視角。
2. **POS 系統 (Point of Sale)**
   - 供收銀員使用的結帳介面，可快速掃描條碼 (`inventory.barcode`)，計算總價並生成 `transactions` 與 `transaction_items` 紀錄。
3. **庫存管理 (Inventory)**
   - 提供商品的新增、修改、刪除及查詢。支援動態定價 (`dynamic_price`) 以及安全庫存量 (`safety_stock`) 的控管。
4. **交易紀錄 (Transactions)**
   - 檢視歷史銷售訂單與明細，方便對帳與退換貨處理。
5. **智能預測與分析 (Analytics & ML Forecasts)**
   - 結合 `ml_forecasts` 資料表，視覺化呈現未來的銷售趨勢與進貨建議，降低庫存成本。
6. **會員與客戶管理 (Customers)**
   - 追蹤顧客消費行為（最近到店時間、平均客單價），並進行會員等級管理（白金、金卡、銀卡、普通）。
7. **系統警報 (Alerts)**
   - 自動捕捉庫存不足或邊緣裝置異常等事件，提醒人員及時處理 (`acknowledged_by`, `resolved_at`)。
8. **使用者設定與權限 (Settings/Auth)**
   - 提供管理者設定介面（透過 `kv_store`），並整合 Supabase Auth 提供 Login/Register 功能以管控員工存取權限。
