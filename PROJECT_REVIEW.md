# RetailAI POS/ERP 專案審查報告

**審查日期：** 2026-05-04  
**分支：** `MCP_Setting`  
**技術堆疊：** React 18 + TypeScript + Vite + Supabase + Tailwind CSS v4

---

## 專案概覽

RetailAI 是一個 React + TypeScript 零售管理系統，包含 13 個頁面（POS、庫存、分析、客戶等），以 Supabase/PostgreSQL 為後端，並支援條碼掃描、即時通知與深色/淺色主題切換。

---

## 已發現問題

### 🔴 嚴重問題（Critical）

#### 問題 1：`src/lib/supabase.ts` 在缺少環境變數時強制拋出錯誤

**檔案：** `src/lib/supabase.ts`（第 6-8 行）

```typescript
// 目前的程式碼 — 有問題
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

**影響範圍：**
- `src/app/contexts/AuthContext.tsx` 匯入此檔案
- `src/app/pages/LoginPage.tsx` 匯入此檔案
- `src/main.tsx` 在根元件層使用 `AuthProvider`

**問題說明：**  
專案在 `utils/supabase/info.tsx` 中已有硬編碼的 Supabase 憑證（由 Figma Make 自動生成），但此檔案要求額外設定 `.env` 環境變數。若沒有 `.env` 檔案，應用程式在啟動時就會直接崩潰，Auth 系統完全無法運作。

> ✅ **已在此次審查中修復**（見下方修復說明）

---

#### 問題 2：兩個獨立的 Supabase 客戶端實例

專案中有兩個分別建立 Supabase 連線的檔案：

| 檔案 | 憑證來源 | 使用者 |
|------|---------|--------|
| `src/lib/supabase.ts` | 環境變數（`.env`） | `AuthContext.tsx`, `LoginPage.tsx`, `RegisterPage.tsx` |
| `src/app/lib/supabase-client.ts` | `utils/supabase/info.tsx`（硬編碼） | `api.ts`（所有資料 API 呼叫）|

**問題說明：**  
Auth 操作（登入/登出/工作階段）使用第一個客戶端，資料查詢使用第二個客戶端。Supabase v2 將 auth 狀態存儲於 `localStorage`，因此兩個客戶端指向同一專案時會共享工作階段，目前不會造成功能錯誤，但維護風險高：
- 未來若修改其中一個客戶端的設定（如 `auth.persistSession`、攔截器）不會同步到另一個
- 程式碼難以追蹤實際使用哪個連線

**建議修復：** 統一使用單一 Supabase 客戶端，讓所有檔案匯入同一個來源。

---

### 🟡 中等問題（Medium）

#### 問題 3：`package.json` 中 React 被列為可選對等依賴（peerDependencies）

**檔案：** `package.json`（第 76-87 行）

```json
"peerDependencies": {
  "react": "18.3.1",
  "react-dom": "18.3.1"
},
"peerDependenciesMeta": {
  "react": { "optional": true },
  "react-dom": { "optional": true }
}
```

**問題說明：**  
`peerDependencies` 適用於函式庫，要求使用者自行安裝。但本專案是一個獨立應用程式，React 是必要的執行期依賴。執行 `npm install` 時 React **不會被自動安裝**，會導致新開發者或 CI 環境的 build 失敗。

> ✅ **已在此次審查中修復**（見下方修復說明）

---

#### 問題 4：`supabase-client.ts` 使用非標準的根目錄相對路徑匯入

**檔案：** `src/app/lib/supabase-client.ts`（第 2 行）

```typescript
import { projectId, publicAnonKey } from "/utils/supabase/info";
```

**問題說明：**  
以 `/` 開頭的匯入路徑在 Vite 中是「伺服器根目錄相對路徑」，可以正常運作，但這不是標準的 ES Module 語法。此寫法：
- 在非 Vite 環境（如 Jest、Vitest with Node runner）中無法解析
- IDE 型別檢查可能無法正確追蹤此路徑
- 與 `@` alias 慣例不一致

**建議修復：** 改用相對路徑 `../../../utils/supabase/info` 或在 `vite.config.ts` 新增 `@utils` alias。

---

#### 問題 5：Supabase 憑證硬編碼並提交至 Git

**檔案：** `utils/supabase/info.tsx`

```typescript
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsIn..."
```

**問題說明：**  
雖然 Supabase `anon key` 技術上是設計為公開的（限制存取由 RLS 策略控制），但直接提交至版本控制仍是不良實踐：
- 一旦 RLS 設定出現漏洞，攻擊者可直接使用硬編碼憑證
- `projectId` 也被公開，暴露專案端點

**建議修復：** 在專案根目錄建立 `.env` 檔案，透過環境變數傳入憑證，並將 `utils/supabase/info.tsx` 加入 `.gitignore`。

---

### 🟢 低優先問題（Low）

#### 問題 6：`utils/supabase/info.tsx` 副檔名應為 `.ts`

**檔案：** `utils/supabase/info.tsx`

此檔案只匯出純文字常數，不含任何 JSX，但副檔名為 `.tsx`。雖然不影響功能，但不符合慣例（`.tsx` 預期包含 JSX 語法）。

---

#### 問題 7：缺少 `tsconfig.json`

專案使用 TypeScript（`.tsx`、`.ts` 檔案），但根目錄沒有 `tsconfig.json`。目前完全依賴 Vite 的「轉譯模式」（只移除型別，不做型別檢查）。

**影響：**
- 無法執行 `tsc --noEmit` 進行靜態型別驗證
- IDE 型別提示可能不完整（路徑別名無法解析）
- 沒有嚴格模式保護（`strictNullChecks` 等）

---

#### 問題 8：`pg` 套件不應出現在瀏覽器專案中

**檔案：** `package.json`（第 54 行）

```json
"pg": "^8.20.0"
```

`pg` 是 Node.js 的 PostgreSQL 直連客戶端，無法在瀏覽器環境運行，且它是 `dependencies` 而非 `devDependencies`，會增加不必要的 bundle 體積（Vite 會嘗試打包它並失敗）。

---

#### 問題 9：通知數量硬編碼

**檔案：** `src/app/components/layout/AppLayout.tsx`（第 78-91 行）

```tsx
<Sidebar notificationCount={3} ... />
<TopBar notificationCount={3} ... />
```

通知數量 `3` 被硬編碼，沒有連接到實際的 `alerts` 資料表資料，即使已有 Supabase Realtime 訂閱也無法動態更新。

---

### 📘 資訊性說明（Info）

#### 問題 10：三個佔位符頁面沒有實際功能

以下頁面只有靜態載入動畫，沒有實際 API 呼叫或資料顯示：

| 頁面 | 路徑 | 描述 |
|------|------|------|
| `BehaviorPage.tsx` | `/behavior` | 「熱力圖與動線分析載入中...」 |
| `ForecastPage.tsx` | `/forecast` | 「AI 決策引擎運算中...」 |
| `QueuePage.tsx` | `/queue` | 「YOLOv8 邊緣運算模型持續監控中...」 |

這些是功能佔位符，未來需要實作。

---

## 已執行的修復

### 修復 1：`src/lib/supabase.ts` — 移除強制拋出，改用 info.tsx 憑證作為回退

**修改前：**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}
```

**修改後：**
```typescript
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? `https://${projectId}.supabase.co`;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? publicAnonKey;
```

環境變數優先，但不強制要求。若未設定 `.env`，自動回退至 `info.tsx` 的硬編碼憑證。

---

### 修復 2：`package.json` — 將 React 移至 `dependencies`

將 `react` 和 `react-dom` 從 `peerDependencies`（可選）移至 `dependencies`（必要），確保 `npm install` 能正確安裝所有執行期依賴。

---

## 待辦事項（未在此次修復）

| 優先級 | 項目 | 工作量 |
|--------|------|--------|
| 🔴 高 | 統一 Supabase 客戶端，消除雙重實例（問題 2） | 中（需測試 Auth 流程） |
| 🟡 中 | 將 Supabase 憑證移至 `.env` 檔案（問題 5） | 小 |
| 🟡 中 | 新增 `tsconfig.json` 啟用型別檢查（問題 7） | 小 |
| 🟢 低 | 從 `dependencies` 移除 `pg` 套件（問題 8） | 小 |
| 🟢 低 | 將通知數量連接至真實資料（問題 9） | 中 |
| 🟢 低 | 修正 `utils/supabase/info.tsx` 副檔名為 `.ts`（問題 6） | 極小 |

---

*此報告由 Claude Code 自動生成於 2026-05-04。*
