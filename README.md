# RetailAI POS/ERP 系統

智慧零售管理平台，整合銷售、庫存、客戶分析與 AI 定價於一體。

---

## 功能模組

| 模組 | 路徑 | 說明 |
|------|------|------|
| 儀表板 | `/dashboard` | 即時 KPI、營收趨勢、庫存警示 |
| POS 銷售 | `/pos` | 條碼掃描結帳、購物車管理 |
| 交易記錄 | `/transactions` | 完整銷售明細查詢 |
| 庫存管理 | `/inventory` | 商品列表、到期日追蹤、AI 動態定價 |
| 警示中心 | `/alerts` | 即時庫存/系統警示（Supabase Realtime） |
| 智慧分析 | `/analytics` | 銷售圖表、品類分析 |
| 客戶管理 | `/customers` | 客戶資料與消費紀錄 |
| 設定 | `/settings` | 帳號、主題、系統偏好設定 |

---

## 技術堆疊

**前端**
- React 18 + TypeScript
- Vite 6（建置工具）
- React Router 7（路由）
- Tailwind CSS v4（樣式）
- Radix UI + shadcn/ui（UI 元件庫）
- Recharts（資料視覺化）
- Lucide React（圖示）
- Sonner（Toast 通知）
- Motion（動畫）

**後端 / 資料庫**
- Supabase（PostgreSQL BaaS）
- Supabase Auth（身份驗證）
- Supabase Realtime（即時推播）

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數（選用）

在專案根目錄建立 `.env` 檔案：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> 若未設定 `.env`，系統會自動使用 `utils/supabase/info.tsx` 中的預設憑證。

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 `http://localhost:5173`

### 4. 建置正式版本

```bash
npm run build
```

---

## 專案結構

```
├── src/
│   ├── main.tsx                    # 應用程式進入點
│   ├── lib/
│   │   └── supabase.ts             # Supabase 客戶端（Auth 用）
│   ├── styles/
│   │   ├── index.css               # 全域樣式進入點
│   │   └── theme.css               # 主題 CSS 變數
│   └── app/
│       ├── App.tsx                 # 根元件
│       ├── routes.tsx              # 路由設定
│       ├── components/
│       │   ├── layout/             # AppLayout、Sidebar、TopBar
│       │   └── ui/                 # 52 個 Radix/shadcn 基礎元件
│       ├── contexts/
│       │   ├── AuthContext.tsx     # 全域身份驗證狀態
│       │   └── ThemeContext.tsx    # 深色/淺色主題狀態
│       ├── lib/
│       │   ├── api.ts              # 所有 Supabase 資料 API
│       │   └── supabase-client.ts  # Supabase 客戶端（資料用）
│       └── pages/                  # 13 個頁面元件
├── utils/
│   └── supabase/
│       └── info.tsx                # Supabase 憑證（自動生成）
├── supabase/                       # Supabase 設定
├── DOC/                            # 專案文件
├── vite.config.ts
├── vercel.json                     # Vercel SPA 路由設定
└── package.json
```

---

## 資料庫結構（主要資料表）

| 資料表 | 說明 |
|--------|------|
| `inventory` | 商品資料（名稱、條碼、庫存、動態定價） |
| `transactions` | 銷售交易記錄 |
| `transaction_items` | 交易明細 |
| `customers` | 客戶資料 |
| `alerts` | 系統警示（支援 Realtime 訂閱） |
| `profiles` | 使用者個人資料與角色（RBAC） |
| `categories` | 商品分類 |
| `suppliers` | 供應商資料 |

---

## 權限系統（RBAC）

使用者角色透過 `profiles.role_code` 控制：

| role_code | 角色 |
|-----------|------|
| `1` | 系統管理員 |
| `2` | 店長 |
| `3` | 收銀員 |

---

## 部署

專案已設定 Vercel 部署，`vercel.json` 包含 SPA fallback 路由規則，直接連結 GitHub 儲存庫即可啟用自動部署。

```bash
# 本地預覽正式版本
npm run build
npx vite preview
```

---

## 開發注意事項

- `utils/supabase/info.tsx` 為自動生成檔案，**請勿手動編輯**，亦請勿將敏感憑證提交至公開儲存庫
- Tailwind CSS 版本為 v4，設定方式與 v3 不同，請勿降版
- Supabase Realtime 訂閱在 `AppLayout.tsx` 中初始化，監聽 `alerts` 資料表的 INSERT 事件
- 路由保護由 `AppLayout` 元件處理，未登入使用者會被導向 `/login`
