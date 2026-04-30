# RetailAI 更新日誌 — 2026-04-30
## RBAC 身分驗證系統 & 智慧分析模組

---

## 📌 本次更新摘要

本次更新為 RetailAI 引入了完整的 **角色型存取控制系統（RBAC）**，並新增三個智慧分析模組，同時修復了多項畫面與登出功能錯誤。

---

## 🗄️ 資料庫變動

### 新增資料表：`public.profiles`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `uuid` | 主鍵，外鍵關聯 `auth.users.id` |
| `name` | `varchar` | 使用者姓名（來自註冊表單）|
| `role_code` | `integer` | 身分代碼（預設為 `1`）|
| `created_at` | `timestamptz` | 建立時間 |
| `updated_at` | `timestamptz` | 最後更新時間 |

**RLS（行級安全政策）**：已啟用，使用者只能查詢與更新自己的資料列。

**外鍵**：`profiles.id → auth.users.id`（CASCADE DELETE）

### 新增 Database Trigger

```sql
-- 當新使用者在 auth.users 建立時，自動在 profiles 表建立對應記錄
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role_code)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    (new.raw_user_meta_data->>'role_code')::int
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 新增萬用管理員帳號（手動植入）

| 項目 | 值 |
|------|-----|
| **電子郵件** | `admin@retailai.tw` |
| **密碼** | `Admin` |
| **姓名** | 萬用管理員 |
| **身分代碼** | `0`（管理員 / 店長）|
| **建立方式** | 直接寫入 `auth.users`（密碼使用 `crypt()` bcrypt 雜湊）|

> ⚠️ **注意**：此帳號為開發測試用途，**正式上線前請務必修改密碼或停用此帳號**。

---

## 🔑 身分代碼規範（RBAC）

| `role_code` | 身分名稱 | 可見模組 |
|-------------|----------|---------|
| `0` | 管理員 / 店長 | **全部功能**（含三個進階分析頁面）|
| `1` | 一般店員 | 主要功能（POS、庫存、交易）+ 系統管理 |
| `2` | 經理 | 主要功能 + 銷售分析 + 顧客洞察（**不含**行為/排隊/預測）|

---

## 🆕 新增前端功能

### 1. 身份驗證核心 (`AuthContext.tsx`)
- 建立 `src/app/contexts/AuthContext.tsx`
- 統一管理 Supabase Session、使用者資訊與 `profiles` 資料
- 使用 `useAuth()` Hook 全域存取登入狀態

### 2. 登入頁面 (`LoginPage.tsx`)
- 串接 `supabase.auth.signInWithPassword()`
- 新增「忘記密碼」模式，觸發 `resetPasswordForEmail()` 發送重設信
- 新增錯誤提示 UI

### 3. 註冊頁面 (`RegisterPage.tsx`)
- 串接 `supabase.auth.signUp()`，同時傳遞 `name` 與 `role_code`
- 新增身分選擇下拉選單（店員 / 管理員 / 經理）

### 4. 路由保護 (`AppLayout.tsx`)
- 未登入使用者自動導向 `/login`
- 修正 React Hook 順序錯誤（`useEffect` 必須在早期返回之前呼叫）

### 5. 動態側邊欄 (`Sidebar.tsx`)
- 根據 `role_code` 動態過濾導航選單
- 新增智慧分析子項目：顧客行為感知、結帳區排隊監測、銷售預測與決策
- 登出按鈕正確呼叫 `supabase.auth.signOut()`

### 6. 頂部導覽列 (`TopBar.tsx`)
- 顯示真實使用者姓名、身分名稱、電子郵件（從 `AuthContext` 取得）
- 右上角下拉選單的「登出帳號」按鈕已正確串接登出邏輯

### 7. 新增三個智慧分析頁面
| 頁面 | 路由 | 說明 |
|------|------|------|
| `BehaviorPage.tsx` | `/behavior` | 顧客行為感知 |
| `QueuePage.tsx` | `/queue` | 結帳區排隊監測 |
| `ForecastPage.tsx` | `/forecast` | 銷售預測與決策 |

---

## 🐛 修復的問題

| 問題 | 修復方式 |
|------|---------|
| `useAuth` 重複宣告 | 移除 `AppLayout.tsx` 中重複的 import |
| React Hook 錯誤（fewer hooks than expected）| 將 `useEffect` 移至早期 return 之前 |
| 右上角登出按鈕無作用 | 綁定 `supabase.auth.signOut()` |
| 路徑錯誤（`../../lib/supabase` 找不到）| 修正為 `../../../lib/supabase` |
| TopBar 顯示硬編碼使用者名稱 | 改用 `profile?.name` 與 `user?.email` 動態顯示 |

---

## 📁 異動檔案清單

```
src/
├── lib/
│   └── supabase.ts                          [新增] Supabase 客戶端初始化
├── app/
│   ├── contexts/
│   │   └── AuthContext.tsx                  [新增] 全域身份驗證狀態管理
│   ├── pages/
│   │   ├── LoginPage.tsx                    [修改] 串接 Supabase Auth
│   │   ├── RegisterPage.tsx                 [修改] 串接 Supabase Auth + 身分選擇
│   │   ├── BehaviorPage.tsx                 [新增] 顧客行為感知頁面
│   │   ├── QueuePage.tsx                    [新增] 結帳區排隊監測頁面
│   │   └── ForecastPage.tsx                 [新增] 銷售預測與決策頁面
│   ├── components/layout/
│   │   ├── AppLayout.tsx                    [修改] 路由保護 + Hook 修復
│   │   ├── Sidebar.tsx                      [修改] RBAC 動態選單 + 登出
│   │   └── TopBar.tsx                       [修改] 動態使用者資訊 + 登出
│   └── routes.tsx                           [修改] 新增三個分析頁面路由
├── main.tsx                                 [修改] 加入 AuthProvider 包裝
.env                                         [新增] Supabase 環境變數
```

---

## 🚀 測試帳號

| 帳號 | 密碼 | 身分 | 用途 |
|------|------|------|------|
| `admin@retailai.tw` | `Admin` | 管理員（代碼 0）| 萬用測試帳號，可看到全部功能 |
| `kingstonlu2004@gmail.com` | *(自行設定)* | 管理員（代碼 0）| 開發者帳號 |
