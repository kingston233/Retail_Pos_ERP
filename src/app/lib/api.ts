import { supabase } from "./supabase-client";
export { supabase };

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = async (): Promise<{ data: Product[] }> => {
  const { data, error } = await supabase.from("inventory").select("*, categories:category_id(name), suppliers:supplier_id(name)");
  if (error) throw error;
  
  const mapped = data.map((p: any) => ({
    id: p.id,
    image: `https://via.placeholder.com/150?text=${encodeURIComponent(p.name)}`, // 這裡可以換成真實圖片
    name: p.name,
    barcode: p.barcode,
    category: p.categories?.name || "未分類",
    original_price: Number(p.original_price ?? 0),
    ai_price: p.dynamic_price ? Number(p.dynamic_price) : Number(p.original_price ?? 0),
    ai_price_change: p.dynamic_price ? Number(p.dynamic_price) - Number(p.original_price ?? 0) : 0,
    stock: Number(p.current_stock ?? 0),
    safety_stock: Number(p.safety_stock ?? 0),
    expiry_date: p.expiration_date || "無",
    expiry_status: "normal",
    supplier: p.suppliers?.name || "未知供應商",
    created_at: p.created_at,
    updated_at: p.updated_at
  }));
  return { data: mapped as Product[] };
};

export const createProduct = async (body: Partial<Product>) => {
  const { data, error } = await supabase.from("inventory").insert([{
    barcode: body.barcode,
    name: body.name,
    original_price: body.original_price,
    current_stock: body.stock,
    safety_stock: body.safety_stock,
    unit: "件",
    is_active: true
  }]).select().single();
  if (error) throw error;
  return { data };
};

export const updateProduct = async (id: string, body: Partial<Product>) => {
  const { data, error } = await supabase.from("inventory").update({
    name: body.name,
    original_price: body.original_price,
    dynamic_price: body.ai_price === body.original_price ? null : body.ai_price,
    current_stock: body.stock,
    safety_stock: body.safety_stock,
    updated_at: new Date().toISOString()
  }).eq("id", id).select().single();
  if (error) throw error;
  return { data };
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
};

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions = async (): Promise<{ data: Transaction[] }> => {
  const { data, error } = await supabase.from("transactions").select("*, transaction_items(*, inventory(name))").order('created_at', { ascending: false });
  if (error) throw error;
  const mapped = data.map((t: any) => ({
    id: t.id,
    cashier: t.cashier_id || "系統",
    total: Number(t.total_amount ?? 0),
    payment_method: t.payment_method,
    items_count: t.transaction_items?.length || 0,
    items: t.transaction_items?.map((ti: any) => ({
      product_id: ti.inventory_id,
      name: ti.inventory?.name || "未知",
      qty: ti.quantity,
      price: Number(ti.unit_price)
    })) || [],
    created_at: t.created_at
  }));
  return { data: mapped };
};

export const createTransaction = async (body: Partial<Transaction>) => {
  // Use RPC
  const payload = body.items?.map(i => ({ inventory_id: i.product_id, quantity: i.qty }));
  const { data, error } = await supabase.rpc("process_checkout", { p_items: payload, p_payment_method: body.payment_method || "cash" });
  if (error) throw error;
  return { data };
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const getCustomers = async (): Promise<{ data: Customer[] }> => {
  const { data, error } = await supabase.from("customers").select("*").order('created_at', { ascending: false });
  if (error) throw error;
  return { data: data as Customer[] };
};

export const updateCustomer = async (id: string, body: Partial<Customer>) => {
  const { data, error } = await supabase.from("customers").update(body).eq("id", id).select().single();
  if (error) throw error;
  return { data };
};

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = async (): Promise<{ data: Alert[] }> => {
  const { data, error } = await supabase.from("alerts").select("*, inventory(name, barcode)").order('created_at', { ascending: false });
  if (error) throw error;
  const mapped = data.map((a: any) => ({
    id: a.id,
    type: a.severity || "warning",
    category: a.alert_type === "low_stock" || a.alert_type === "expiry" ? "inventory" : (a.alert_type === "queue_overflow" ? "crowd" : "system"),
    title: a.title,
    detail: a.message,
    status: a.status,
    value: a.current_value?.toString(),
    threshold: a.threshold_value?.toString(),
    auto_action: a.auto_action,
    created_at: a.created_at,
    updated_at: a.updated_at
  }));
  return { data: mapped as Alert[] };
};

export const updateAlert = async (id: string, body: Partial<Alert>) => {
  const { data, error } = await supabase.from("alerts").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return { data };
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardKPI = async (): Promise<{ data: DailyKPI }> => {
  const { data, error } = await supabase.from("daily_kpi").select("*").eq("date", new Date().toISOString().split('T')[0]).single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 is not found
  if (!data) return { data: { date: new Date().toISOString(), revenue: 0, prev_revenue: 0, revenue_change: 0, customers: 0, customers_change: 0, low_stock_count: 0, low_stock_critical: 0, alert_count: 0, peak_hour: "12:00", daily_target: 100000, target_achievement: 0 } };
  return { data };
};

const getKvData = async <T>(key: string, defaultValue: T): Promise<{ data: T }> => {
  const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).single();
  if (error && error.code !== "PGRST116") throw error;
  return { data: data ? data.value as T : defaultValue };
};

export const getDashboardForecast = () => getKvData<ForecastPoint[]>("dashboard_forecast", []);
export const getDashboardHourly = () => getKvData<HourlyTraffic[]>("dashboard_hourly", []);
export const getDashboardPayments = () => getKvData<PaymentMethod[]>("dashboard_payments", []);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getAnalyticsMonthly    = () => getKvData<MonthlyAnalytics[]>("analytics_monthly", []);
export const getAnalyticsWeekday    = () => getKvData<WeekdayAnalytics[]>("analytics_weekday", []);
export const getAnalyticsCategories = () => getKvData<CategoryAnalytics[]>("analytics_categories", []);
export const getAnalyticsTopProducts = () => getKvData<TopProduct[]>("analytics_top_products", []);
export const getAnalyticsVisitFreq  = () => getKvData<VisitFreq[]>("analytics_visit_freq", []);


// ── Edge Logs ─────────────────────────────────────────────────────────────────
export const getEdgeLogs = async (type = "queue_count", limit = 100): Promise<{ data: EdgeLog[] }> => {
  const { data, error } = await supabase.from("edge_logs").select("*").eq("log_type", type).order('recorded_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return { data: data as EdgeLog[] };
};

export const createEdgeLog = async (body: Partial<EdgeLog>) => {
  const { data, error } = await supabase.from("edge_logs").insert([body]).select().single();
  if (error) throw error;
  return { data };
};

// ── ML Forecasts ──────────────────────────────────────────────────────────────
export const upsertMlForecasts = async (rows: Partial<MlForecast>[]) => { return { data: [] as MlForecast[], count: 0 }; };

// ── Seed & Migration (UI Mocks - Cannot do DDL from frontend) ────────────────
export const seedDatabase = async () => {
  throw new Error("無法從前端直接執行: 請到 Supabase Dashboard 貼上 setup.sql 執行");
};
export const runMigration = async () => {
  throw new Error("前端受限於安全規範，無法建立資料表。請到 Supabase 後台 SQL Editor 貼上我們準備的 setup.sql 執行！");
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Product { id: string; image: string; name: string; barcode: string; category: string; original_price: number; ai_price: number; ai_price_change: number; stock: number; safety_stock: number; expiry_date: string; expiry_status: "normal" | "warning" | "critical" | "expired"; supplier: string; created_at?: string; updated_at?: string; }
export interface TransactionItem { product_id: string; name: string; qty: number; price: number; }
export interface Transaction { id: string; cashier: string; total: number; payment_method: string; items_count: number; items: TransactionItem[]; created_at: string; }
export interface Customer { id: string; name: string; phone: string; tier: "白金" | "金卡" | "銀卡" | "普通"; visits: number; total_spent: number; last_visit: string; avg_order: number; change: string; trend_up: boolean; created_at?: string; }
export interface Alert { id: string; type: "critical" | "warning" | "info" | "success"; category: "inventory" | "crowd" | "ai" | "system" | "expiry"; title: string; detail: string; status: "active" | "resolved" | "acknowledged"; location?: string | null; value?: string | null; threshold?: string | null; auto_action?: string | null; created_at: string; updated_at?: string; }
export interface DailyKPI { date: string; revenue: number; prev_revenue: number; revenue_change: number; customers: number; customers_change: number; low_stock_count: number; low_stock_critical: number; alert_count: number; peak_hour: string; daily_target: number; target_achievement: number; }
export interface ForecastPoint { day: string; actual: number | null; forecast: number; }
export interface HourlyTraffic { date: string; hour: string; customers: number; }
export interface PaymentMethod { method: string; pct: number; color: string; }
export interface MonthlyAnalytics { year_month: string; month: string; sales: number; orders: number; avg_order: number; }
export interface WeekdayAnalytics { day: string; revenue: number; customers: number; }
export interface CategoryAnalytics { name: string; value: number; color: string; }
export interface TopProduct { rank: number; name: string; sku: string; sales: number; revenue: number; change: string; up: boolean; }
export interface VisitFreq { range: string; count: number; }
export interface EdgeLog { id?: string; camera_id: string; location?: string; log_type: "heatmap" | "queue_count" | "people_count" | "anomaly"; numeric_value?: number; json_features?: Record<string, unknown>; recorded_at?: string; created_at?: string; }
export interface MlForecast { id?: string; inventory_id: string; forecast_date: string; forecast_quantity: number; confidence_score?: number; model_version?: string; created_at?: string; }
export interface MigrationResult { step: string; status: "ok" | "error"; message?: string; }