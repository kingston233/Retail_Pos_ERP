import { supabase } from "./supabase-client";
export { supabase };

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = async (): Promise<{ data: Product[] }> => {
  const { data, error } = await supabase.from("inventory").select("*, categories:category_id(name), suppliers:supplier_id(name)");
  if (error) throw error;
  
  const mapped = data.map((p: any) => {
    const catName = p.categories?.name || "未分類";
    let randomEmoji = "📦";
    if (catName.includes("飲料") || catName.includes("飲")) randomEmoji = "🥤";
    else if (catName.includes("食品") || catName.includes("麵") || catName.includes("便當")) randomEmoji = "🍱";
    else if (catName.includes("生鮮")) randomEmoji = "🥬";
    else if (catName.includes("雜貨") || catName.includes("用品")) randomEmoji = "🧴";
    else if (catName.includes("零食")) randomEmoji = "🍪";

    let expiryStatus = "normal";
    if (p.expiration_date) {
      const exp = new Date(p.expiration_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) expiryStatus = "expired";
      else if (diffDays === 0) expiryStatus = "critical";
      else if (diffDays <= 1) expiryStatus = "warning";
    }

    return {
      id: p.id,
      image: randomEmoji,
      name: p.name,
      barcode: p.barcode,
      category: catName,
      original_price: Number(p.original_price ?? 0),
      ai_price: p.dynamic_price ? Number(p.dynamic_price) : Number(p.original_price ?? 0),
      ai_price_change: p.dynamic_price ? Number(p.dynamic_price) - Number(p.original_price ?? 0) : 0,
      stock: Number(p.current_stock ?? 0),
      safety_stock: Number(p.safety_stock ?? 0),
      expiry_date: p.expiration_date || "無",
      expiry_status: expiryStatus,
      supplier: p.suppliers?.name || "未知供應商",
      reorder_rules: p.reorder_rules || {},
      created_at: p.created_at,
      updated_at: p.updated_at
    };
  });
  return { data: mapped as Product[] };
};

export const createProduct = async (body: any) => {
  const { data, error } = await supabase.from("inventory").insert([{
    barcode: body.barcode,
    name: body.name,
    category_id: body.category_id,
    supplier_id: body.supplier_id,
    original_price: body.original_price,
    current_stock: body.stock,
    safety_stock: body.safety_stock,
    expiration_date: body.expiration_date || null,
    reorder_rules: body.reorder_rules || {},
    unit: "件",
    is_active: true
  }]).select().single();
  if (error) throw error;
  return { data };
};

export const updateProduct = async (id: string, body: Partial<Product>) => {
  const updateData: any = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.original_price !== undefined) updateData.original_price = body.original_price;
  if (body.ai_price !== undefined) updateData.dynamic_price = body.ai_price === body.original_price ? null : body.ai_price;
  if (body.stock !== undefined) updateData.current_stock = body.stock;
  if (body.safety_stock !== undefined) updateData.safety_stock = body.safety_stock;
  if (body.expiration_date !== undefined) updateData.expiration_date = body.expiration_date;
  if (body.reorder_rules !== undefined) updateData.reorder_rules = body.reorder_rules;

  const { data, error } = await supabase.from("inventory").update(updateData).eq("id", id).select().single();
  if (error) throw error;
  return { data };
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
};

// ── Categories & Suppliers ───────────────────────────────────────────────────
export interface CategoryObj { id: string; name: string; }
export interface SupplierObj { id: string; name: string; }

export const getCategories = async (): Promise<{ data: CategoryObj[] }> => {
  const { data, error } = await supabase.from("categories").select("id, name").order('created_at', { ascending: true });
  if (error) throw error;
  return { data };
};

export const createCategory = async (name: string) => {
  const { data, error } = await supabase.from("categories").insert([{ name }]).select().single();
  if (error) throw error;
  return { data };
};

export const getSuppliers = async (): Promise<{ data: SupplierObj[] }> => {
  const { data, error } = await supabase.from("suppliers").select("id, name").order('name', { ascending: true });
  if (error) throw error;
  return { data };
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
    items_count: t.transaction_items?.reduce((sum: number, ti: any) => sum + ti.quantity, 0) || 0,
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
export const getDashboardKPI = async (): Promise<{ data: DailyKPI & { low_stock_items: Product[] } }> => {
  const dateStr = new Date().toISOString().split('T')[0];
  
  // 1. Fetch base KPI for yesterday's revenue / fallback
  const { data: baseKpi } = await supabase.from("daily_kpi").select("*").eq("date", dateStr).maybeSingle();
  
  // 2. Fetch today's transactions
  const { data: txData } = await supabase.from("transactions")
    .select("total_amount")
    .gte("created_at", `${dateStr}T00:00:00Z`);

  const realRevenue = (txData || []).reduce((sum, tx) => sum + (Number(tx.total_amount) || 0), 0);

  // 3. Fetch inventory for low stock
  const { data: invData } = await supabase.from("inventory").select("id, name, barcode, current_stock, safety_stock");
  let lowStockCount = 0;
  let criticalCount = 0;
  const lowStockItems: any[] = [];

  (invData || []).forEach(p => {
    if (p.current_stock <= p.safety_stock) {
      lowStockCount++;
      lowStockItems.push(p);
      if (p.current_stock === 0) criticalCount++;
    }
  });

  const prevRev = baseKpi?.prev_revenue || 0;
  const revenueChange = prevRev > 0 ? Math.round(((realRevenue - prevRev) / prevRev) * 100) : 0;

  const kpiData = baseKpi || {
    date: dateStr, revenue: 0, prev_revenue: 0, revenue_change: 0,
    customers: txData?.length || 0, customers_change: 0,
    low_stock_count: 0, low_stock_critical: 0, alert_count: 0,
    peak_hour: "12:00", daily_target: 100000, target_achievement: 0
  };

  return { 
    data: {
      ...kpiData,
      revenue: realRevenue,
      revenue_change: revenueChange,
      low_stock_count: lowStockCount,
      low_stock_critical: criticalCount,
      customers: txData?.length || kpiData.customers,
      low_stock_items: lowStockItems
    }
  };
};

const getKvData = async <T>(key: string, defaultValue: T): Promise<{ data: T }> => {
  const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
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

export const getDatabaseStats = async () => {
  const tables = [
    { name: "categories", desc: "商品類別維度表 · id, name, description", fk: "" },
    { name: "suppliers", desc: "供應商資料表 · id, name, contact_name, phone, email, address", fk: "" },
    { name: "inventory", desc: "商品庫存主表 · barcode, name, original_price, dynamic_price, current_stock, safety_stock, arrival/exp_date", fk: "FK→categories, FK→suppliers" },
    { name: "transactions", desc: "交易主單表 · total_amount, payment_method", fk: "FK→auth.users" },
    { name: "transaction_items", desc: "交易明細表 · quantity, unit_price, subtotal(GENERATED ALWAYS)", fk: "FK→transactions, FK→inventory" },
    { name: "alerts", desc: "統一警示表（Realtime 推播）· alert_type, severity, status, auto_action", fk: "FK→inventory" },
    { name: "edge_logs", desc: "YOLOv8 邊緣數據 · camera_id, log_type, numeric_value, json_features", fk: "" },
    { name: "ml_forecasts", desc: "FastAPI ML 銷量預測 · forecast_date, forecast_quantity", fk: "FK→inventory" },
  ];

  const results = await Promise.all(
    tables.map(async t => {
      const { count } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
      return { ...t, count: count || 0 };
    })
  );

  return { data: results };
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
export interface Product { id: string; image: string; name: string; barcode: string; category: string; original_price: number; ai_price: number; ai_price_change: number; stock: number; safety_stock: number; expiry_date: string; expiry_status: "normal" | "warning" | "critical" | "expired"; supplier: string; created_at?: string; updated_at?: string; reorder_rules?: Record<string, number>; }
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