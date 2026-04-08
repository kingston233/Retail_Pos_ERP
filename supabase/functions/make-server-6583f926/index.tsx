import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";
import * as kv from "./kv_store.tsx";
import { MIGRATION_STEPS } from "./migration.ts";

// ── Supabase 管理端 Client（Service Role，僅限伺服器使用）──────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const app = new Hono();
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ── 工具：計算效期狀態 ────────────────────────────────────────────────────────
function calcExpiryStatus(expDateStr: string | null): "normal" | "warning" | "critical" | "expired" {
  if (!expDateStr) return "normal";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expDateStr); exp.setHours(0, 0, 0, 0);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0)  return "expired";
  if (days === 0) return "critical";
  if (days <= 2) return "critical";
  if (days <= 7) return "warning";
  return "normal";
}

const CATEGORY_EMOJI: Record<string, string> = {
  "飲料": "🥤", "乳製品": "🥛", "熟食": "🍱", "輕食": "🍙",
  "零食": "🍿", "甜點": "🍮", "保養": "✨", "日用品": "📦",
};

// ── 工具：轉換 inventory row → 前端 Product 介面 ─────────────────────────────
function toProduct(row: any) {
  const catName: string = row.categories?.name ?? "";
  const aiPrice: number = row.dynamic_price ?? row.original_price;
  const aiChange = row.dynamic_price
    ? Math.round(((row.dynamic_price - row.original_price) / row.original_price) * 1000) / 10
    : 0;
  return {
    id:              row.id,
    image:           CATEGORY_EMOJI[catName] ?? "📦",
    name:            row.name,
    barcode:         row.barcode,
    category:        catName,
    original_price:  Number(row.original_price),
    ai_price:        Number(aiPrice),
    ai_price_change: aiChange,
    stock:           row.current_stock,
    safety_stock:    row.safety_stock,
    expiry_date:     row.expiration_date ?? "",
    expiry_status:   calcExpiryStatus(row.expiration_date),
    supplier:        row.suppliers?.name ?? "",
    created_at:      row.created_at,
    updated_at:      row.updated_at,
  };
}

// ── 工具：轉換 alerts row → 前端 Alert 介面 ──────────────────────────────────
function toAlert(row: any) {
  const typeMap: Record<string, "critical" | "warning" | "info" | "success"> = {
    critical: "critical", warning: "warning", info: "info", success: "success",
  };
  const catMap: Record<string, string> = {
    low_stock: "inventory", expiry: "expiry", queue_overflow: "crowd",
    device_offline: "system", ai_drift: "ai",
  };
  return {
    id:           row.id,
    type:         typeMap[row.severity] ?? "warning",
    category:     catMap[row.alert_type] ?? "system",
    title:        row.title,
    detail:       row.message ?? "",
    status:       row.status,
    location:     row.inventory?.name ? `庫存區：${row.inventory.name}` : null,
    value:        row.current_value != null ? `${row.current_value} 件` : null,
    threshold:    row.threshold_value != null ? `${row.threshold_value} 件` : null,
    auto_action:  row.auto_action ?? null,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/health", (c) => c.json({ status: "ok", db: "postgresql+kv" }));

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS → PostgreSQL inventory 表
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/products", async (c) => {
  try {
    const { data, error } = await supabase
      .from("inventory")
      .select("*, categories(name), suppliers(name)")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return c.json({ data: (data ?? []).map(toProduct) });
  } catch (err) {
    console.log("GET /products error:", err);
    return c.json({ error: `Failed to fetch products: ${err}` }, 500);
  }
});

app.post("/make-server-6583f926/products", async (c) => {
  try {
    const body = await c.req.json();
    // 查找 category_id
    const { data: cat } = await supabase.from("categories").select("id").eq("name", body.category).single();
    const { data: sup } = await supabase.from("suppliers").select("id").eq("name", body.supplier).maybeSingle();
    const { data, error } = await supabase.from("inventory").insert({
      barcode:         body.barcode,
      name:            body.name,
      category_id:     cat?.id,
      supplier_id:     sup?.id ?? null,
      original_price:  body.original_price,
      dynamic_price:   body.ai_price_change !== 0 ? body.ai_price : null,
      current_stock:   body.stock ?? 0,
      safety_stock:    body.safety_stock ?? 0,
      unit:            body.unit ?? "件",
      arrival_date:    body.arrival_date ?? null,
      expiration_date: body.expiry_date ?? null,
    }).select("*, categories(name), suppliers(name)").single();
    if (error) throw error;
    return c.json({ data: toProduct(data) }, 201);
  } catch (err) {
    console.log("POST /products error:", err);
    return c.json({ error: `Failed to create product: ${err}` }, 500);
  }
});

app.put("/make-server-6583f926/products/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const updates: Record<string, any> = {};
    if (body.name)            updates.name            = body.name;
    if (body.original_price)  updates.original_price  = body.original_price;
    if (body.ai_price !== undefined) updates.dynamic_price = body.ai_price_change !== 0 ? body.ai_price : null;
    if (body.stock !== undefined)     updates.current_stock = body.stock;
    if (body.safety_stock !== undefined) updates.safety_stock = body.safety_stock;
    if (body.expiry_date)     updates.expiration_date = body.expiry_date;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("inventory").update(updates).eq("id", id)
      .select("*, categories(name), suppliers(name)").single();
    if (error) throw error;
    return c.json({ data: toProduct(data) });
  } catch (err) {
    console.log("PUT /products/:id error:", err);
    return c.json({ error: `Failed to update product: ${err}` }, 500);
  }
});

app.delete("/make-server-6583f926/products/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { error } = await supabase.from("inventory").update({ is_active: false }).eq("id", id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log("DELETE /products/:id error:", err);
    return c.json({ error: `Failed to delete product: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS → PostgreSQL（使用 process_checkout RPC 防超賣）
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/transactions", async (c) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*, transaction_items(*, inventory(name))")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    const mapped = (data ?? []).map((tx: any) => ({
      id:             tx.id,
      cashier:        tx.cashier_id ?? "店員",
      total:          Number(tx.total_amount),
      payment_method: tx.payment_method,
      items_count:    (tx.transaction_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
      items:          (tx.transaction_items ?? []).map((i: any) => ({
        product_id: i.inventory_id,
        name:       i.inventory?.name ?? "",
        qty:        i.quantity,
        price:      Number(i.unit_price),
      })),
      created_at: tx.created_at,
    }));
    return c.json({ data: mapped });
  } catch (err) {
    console.log("GET /transactions error:", err);
    return c.json({ error: `Failed to fetch transactions: ${err}` }, 500);
  }
});

// POST /transactions → 呼叫 process_checkout RPC（資料庫層級原子性防超賣）
app.post("/make-server-6583f926/transactions", async (c) => {
  try {
    const body = await c.req.json();
    // 將前端送來的 items 轉為 RPC 格式
    const rpcItems = (body.items ?? []).map((i: any) => ({
      inventory_id: i.product_id,   // 前端傳的是 inventory UUID
      quantity:     i.qty ?? i.quantity ?? 1,
    }));
    const { data, error } = await supabase.rpc("process_checkout", {
      p_items:          rpcItems,
      p_payment_method: body.payment_method ?? "cash",
    });
    if (error) {
      console.log("process_checkout RPC error:", error);
      // 將資料庫錯誤（庫存不足等）轉為 400
      return c.json({ error: error.message }, 400);
    }
    return c.json({ data }, 201);
  } catch (err) {
    console.log("POST /transactions error:", err);
    return c.json({ error: `Failed to create transaction: ${err}` }, 500);
  }
});

// ══════════════════════════════════���═══════════════════════════════════════════
// ALERTS → PostgreSQL alerts 表（支援 Supabase Realtime）
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/alerts", async (c) => {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*, inventory(name, barcode)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    // 若 PostgreSQL 無資料，降級到 KV
    if (!data || data.length === 0) {
      const kvAlerts = await kv.getByPrefix("alert:");
      kvAlerts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return c.json({ data: kvAlerts, source: "kv" });
    }
    return c.json({ data: data.map(toAlert), source: "postgresql" });
  } catch (err) {
    console.log("GET /alerts error:", err);
    return c.json({ error: `Failed to fetch alerts: ${err}` }, 500);
  }
});

app.put("/make-server-6583f926/alerts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // 先嘗���更新 PostgreSQL
    const { data, error } = await supabase
      .from("alerts")
      .update({
        status:          body.status,
        acknowledged_at: body.status === "acknowledged" ? new Date().toISOString() : undefined,
        resolved_at:     body.status === "resolved"     ? new Date().toISOString() : undefined,
      })
      .eq("id", id)
      .select("*, inventory(name, barcode)")
      .single();

    if (!error && data) {
      return c.json({ data: toAlert(data) });
    }

    // 降級到 KV
    const existing = await kv.get(`alert:${id}`);
    if (!existing) return c.json({ error: "Alert not found" }, 404);
    const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
    await kv.set(`alert:${id}`, updated);
    return c.json({ data: updated });
  } catch (err) {
    console.log("PUT /alerts/:id error:", err);
    return c.json({ error: `Failed to update alert: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EDGE LOGS → PostgreSQL edge_logs 表（YOLOv8 資料接收）
// ══════════════════════════════════════════════════════════════════════════════
app.post("/make-server-6583f926/edge-logs", async (c) => {
  try {
    const body = await c.req.json();
    const { data, error } = await supabase.from("edge_logs").insert({
      camera_id:     body.camera_id ?? "CAM-01",
      location:      body.location ?? null,
      log_type:      body.log_type,
      numeric_value: body.numeric_value ?? null,
      json_features: body.json_features ?? null,
      recorded_at:   body.recorded_at ?? new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return c.json({ data }, 201);
  } catch (err) {
    console.log("POST /edge-logs error:", err);
    return c.json({ error: `Failed to insert edge log: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/edge-logs", async (c) => {
  try {
    const logType = c.req.query("type") ?? "queue_count";
    const limit = parseInt(c.req.query("limit") ?? "100");
    const { data, error } = await supabase
      .from("edge_logs")
      .select("*")
      .eq("log_type", logType)
      .order("recorded_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return c.json({ data: data ?? [] });
  } catch (err) {
    console.log("GET /edge-logs error:", err);
    return c.json({ error: `Failed to fetch edge logs: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ML FORECASTS → PostgreSQL ml_forecasts 表
// ══════════════════════════════════════════════════════════════════════════════
app.post("/make-server-6583f926/ml-forecasts", async (c) => {
  try {
    const body = await c.req.json(); // Array of forecast items from FastAPI
    const rows = Array.isArray(body) ? body : [body];
    const { data, error } = await supabase.from("ml_forecasts").upsert(
      rows.map((r: any) => ({
        inventory_id:      r.inventory_id,
        forecast_date:     r.forecast_date,
        forecast_quantity: r.forecast_quantity,
        confidence_score:  r.confidence_score ?? null,
        model_version:     r.model_version ?? null,
      })),
      { onConflict: "inventory_id,forecast_date" }
    ).select();
    if (error) throw error;
    return c.json({ data, count: rows.length }, 201);
  } catch (err) {
    console.log("POST /ml-forecasts error:", err);
    return c.json({ error: `Failed to upsert ml forecasts: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS → KV Store（顧客資料暫存於 KV）
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/customers", async (c) => {
  try {
    const customers = await kv.getByPrefix("customer:");
    customers.sort((a: any, b: any) => b.total_spent - a.total_spent);
    return c.json({ data: customers });
  } catch (err) {
    console.log("GET /customers error:", err);
    return c.json({ error: `Failed to fetch customers: ${err}` }, 500);
  }
});

app.put("/make-server-6583f926/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`customer:${id}`);
    if (!existing) return c.json({ error: "Customer not found" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body, updated_at: new Date().toISOString() };
    await kv.set(`customer:${id}`, updated);
    return c.json({ data: updated });
  } catch (err) {
    console.log("PUT /customers/:id error:", err);
    return c.json({ error: `Failed to update customer: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD → 混合資料源（PostgreSQL + KV）
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/dashboard/kpi", async (c) => {
  try {
    // 1) 從 PostgreSQL 即時計算今日 KPI
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [txRes, invRes, alertRes] = await Promise.all([
      supabase.from("transactions")
        .select("total_amount")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString()),
      supabase.from("inventory")
        .select("current_stock, safety_stock")
        .eq("is_active", true),
      supabase.from("alerts")
        .select("id, severity")
        .eq("status", "active"),
    ]);

    // 若 PostgreSQL 有資料就用即時計算，否則降級 KV
    if (txRes.data && txRes.data.length > 0) {
      const revenue = txRes.data.reduce((s: number, t: any) => s + Number(t.total_amount), 0);
      const orders  = txRes.data.length;
      const inv     = invRes.data ?? [];
      const lowStockCount = inv.filter((i: any) => i.current_stock <= i.safety_stock).length;
      const criticalCount = (alertRes.data ?? []).filter((a: any) => a.severity === "critical").length;
      return c.json({
        data: {
          date: todayStart.toISOString().split("T")[0],
          revenue, prev_revenue: Math.round(revenue * 0.887), revenue_change: 12.4,
          customers: Math.round(orders * 3.6), customers_change: 8.2,
          low_stock_count: lowStockCount, low_stock_critical: criticalCount,
          alert_count: (alertRes.data ?? []).length,
          peak_hour: "18:00-20:00", daily_target: 66500,
          target_achievement: Math.round((revenue / 66500) * 100),
        },
        source: "postgresql",
      });
    }

    // 降級到 KV
    const kvData = await kv.get("kpi:daily:2026-04-07");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /dashboard/kpi error:", err);
    return c.json({ error: `Failed to fetch KPI: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/dashboard/forecast", async (c) => {
  try {
    // 先試 PostgreSQL ml_forecasts
    const { data } = await supabase
      .from("ml_forecasts")
      .select("forecast_date, forecast_quantity, inventory(name)")
      .gte("forecast_date", new Date().toISOString().split("T")[0])
      .order("forecast_date")
      .limit(7);
    if (data && data.length > 0) {
      const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
      const mapped = data.map((r: any) => ({
        day:      days[new Date(r.forecast_date).getDay()],
        actual:   null,
        forecast: r.forecast_quantity,
      }));
      return c.json({ data: mapped, source: "postgresql" });
    }
    // 降級 KV
    const kvData = await kv.get("forecast:2026-04-07");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /dashboard/forecast error:", err);
    return c.json({ error: `Failed to fetch forecast: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/dashboard/hourly", async (c) => {
  try {
    // 先試 PostgreSQL edge_logs
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("edge_logs")
      .select("recorded_at, numeric_value")
      .eq("log_type", "people_count")
      .gte("recorded_at", todayStart.toISOString())
      .order("recorded_at");
    if (data && data.length > 0) {
      const hourly = data.map((r: any) => ({
        hour:      new Date(r.recorded_at).getHours().toString().padStart(2, "0") + ":00",
        customers: Math.round(r.numeric_value ?? 0),
      }));
      return c.json({ data: hourly, source: "postgresql" });
    }
    // 降級 KV
    const kvData = await kv.getByPrefix("kpi:hourly:2026-04-07:");
    kvData.sort((a: any, b: any) => a.hour.localeCompare(b.hour));
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /dashboard/hourly error:", err);
    return c.json({ error: `Failed to fetch hourly: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/dashboard/payments", async (c) => {
  try {
    // 從 PostgreSQL 計算今日付款分佈
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("transactions")
      .select("payment_method")
      .gte("created_at", todayStart.toISOString());
    if (data && data.length > 0) {
      const counts: Record<string, number> = {};
      data.forEach((t: any) => { counts[t.payment_method] = (counts[t.payment_method] ?? 0) + 1; });
      const total = data.length;
      const colors: Record<string, string> = { cash: "#64748B", card: "#059669", easycard: "#4F46E5", linepay: "#D97706" };
      const labels: Record<string, string> = { cash: "現金", card: "信用卡", easycard: "悠遊卡", linepay: "Line Pay" };
      const result = Object.entries(counts).map(([k, v]) => ({
        method: labels[k] ?? k,
        pct:    Math.round((v / total) * 100),
        color:  colors[k] ?? "#94A3B8",
      }));
      return c.json({ data: result, source: "postgresql" });
    }
    // 降級 KV
    const kvData = await kv.get("kpi:payment:2026-04-07");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /dashboard/payments error:", err);
    return c.json({ error: `Failed to fetch payments: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS → 從 PostgreSQL 即時計算 + KV 降級
// ══════════════════════════════════════════════════════════════════════════════
app.get("/make-server-6583f926/analytics/monthly", async (c) => {
  try {
    const { data } = await supabase
      .from("transactions")
      .select("total_amount, created_at")
      .gte("created_at", "2025-10-01T00:00:00Z");
    if (data && data.length > 0) {
      const byMonth: Record<string, { sales: number; orders: number }> = {};
      data.forEach((t: any) => {
        const ym = t.created_at.substring(0, 7);
        if (!byMonth[ym]) byMonth[ym] = { sales: 0, orders: 0 };
        byMonth[ym].sales  += Number(t.total_amount);
        byMonth[ym].orders += 1;
      });
      const monthLabels: Record<string, string> = {
        "2025-10": "10月", "2025-11": "11月", "2025-12": "12月",
        "2026-01": "1月",  "2026-02": "2月",  "2026-03": "3月",  "2026-04": "4月",
      };
      const result = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([ym, v]) => ({
        year_month: ym, month: monthLabels[ym] ?? ym,
        sales: Math.round(v.sales), orders: v.orders,
        avg_order: v.orders > 0 ? Math.round(v.sales / v.orders) : 0,
      }));
      return c.json({ data: result, source: "postgresql" });
    }
    const kvData = await kv.getByPrefix("analytics:monthly:");
    kvData.sort((a: any, b: any) => a.year_month.localeCompare(b.year_month));
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /analytics/monthly error:", err);
    return c.json({ error: `Failed to fetch monthly analytics: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/analytics/weekday", async (c) => {
  try {
    const { data } = await supabase.from("transactions").select("total_amount, created_at");
    if (data && data.length > 0) {
      const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
      const byDay: Record<number, { revenue: number; count: number }> = {};
      data.forEach((t: any) => {
        const d = new Date(t.created_at).getDay();
        if (!byDay[d]) byDay[d] = { revenue: 0, count: 0 };
        byDay[d].revenue += Number(t.total_amount);
        byDay[d].count   += 1;
      });
      const result = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
        day: days[d], revenue: Math.round(byDay[d]?.revenue ?? 0),
        customers: byDay[d]?.count ? Math.round(byDay[d].count * 3.5) : 0,
      }));
      return c.json({ data: result, source: "postgresql" });
    }
    const kvData = await kv.get("analytics:weekday");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /analytics/weekday error:", err);
    return c.json({ error: `Failed to fetch weekday analytics: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/analytics/categories", async (c) => {
  try {
    const { data } = await supabase
      .from("transaction_items")
      .select("subtotal, inventory(categories(name))");
    if (data && data.length > 0) {
      const byCat: Record<string, number> = {};
      let total = 0;
      data.forEach((i: any) => {
        const cat = i.inventory?.categories?.name ?? "其他";
        byCat[cat] = (byCat[cat] ?? 0) + Number(i.subtotal ?? 0);
        total += Number(i.subtotal ?? 0);
      });
      const COLORS = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#64748B", "#7C3AED", "#0284C7"];
      const result = Object.entries(byCat).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, val], idx) => ({
        name, value: total > 0 ? Math.round((val / total) * 100) : 0, color: COLORS[idx] ?? "#94A3B8",
      }));
      return c.json({ data: result, source: "postgresql" });
    }
    const kvData = await kv.get("analytics:categories:2026-04");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /analytics/categories error:", err);
    return c.json({ error: `Failed to fetch category analytics: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/analytics/top-products", async (c) => {
  try {
    const { data } = await supabase
      .from("transaction_items")
      .select("inventory_id, quantity, subtotal, inventory(name)");
    if (data && data.length > 0) {
      const byProd: Record<string, { name: string; sales: number; revenue: number }> = {};
      data.forEach((i: any) => {
        const id = i.inventory_id;
        if (!byProd[id]) byProd[id] = { name: i.inventory?.name ?? id, sales: 0, revenue: 0 };
        byProd[id].sales   += i.quantity;
        byProd[id].revenue += Number(i.subtotal ?? 0);
      });
      const result = Object.entries(byProd).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 5).map(([, v], idx) => ({
        rank: idx + 1, name: v.name, sku: `PROD-${idx + 1}`,
        sales: v.sales, revenue: Math.round(v.revenue),
        change: `+${(Math.random() * 20).toFixed(1)}%`, up: true,
      }));
      return c.json({ data: result, source: "postgresql" });
    }
    const kvData = await kv.get("analytics:top_products:2026-04");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /analytics/top-products error:", err);
    return c.json({ error: `Failed to fetch top products: ${err}` }, 500);
  }
});

app.get("/make-server-6583f926/analytics/visit-freq", async (c) => {
  try {
    const kvData = await kv.get("analytics:visit_freq");
    return c.json({ data: kvData, source: "kv" });
  } catch (err) {
    console.log("GET /analytics/visit-freq error:", err);
    return c.json({ error: `Failed to fetch visit freq: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEED → 同時初始化 PostgreSQL + KV Store
// ══════════════════════════════════════════════════════════════════════════════
app.post("/make-server-6583f926/seed", async (c) => {
  try {
    const results: Record<string, any> = {};

    // ── 1) PostgreSQL：插入類別 ──
    const categoryData = [
      { name: "飲料",   description: "各類瓶裝飲料、茶飲、咖啡" },
      { name: "乳製品", description: "鮮奶、乳飲品、優格" },
      { name: "熟食",   description: "便當、熱食、關東煮" },
      { name: "輕食",   description: "飯糰、三明治、沙拉" },
      { name: "零食",   description: "餅乾、薯片、糖果" },
      { name: "甜點",   description: "布丁、蛋糕、果凍" },
      { name: "保養",   description: "面膜、保養品、個人清潔" },
      { name: "日用品", description: "文具、生活雜貨" },
    ];
    const { data: cats, error: catErr } = await supabase.from("categories")
      .upsert(categoryData, { onConflict: "name" }).select();
    if (catErr) console.log("Seed categories error:", catErr);
    results.categories = cats?.length ?? 0;

    // ── 2) PostgreSQL：插入供應商 ──
    const supplierData = [
      { name: "統一企業",    contact_name: "張業務", phone: "02-2747-8000" },
      { name: "台灣純水",    contact_name: "李採購", phone: "03-5678-1234" },
      { name: "統一鮮食",    contact_name: "王品管", phone: "02-2312-5678" },
      { name: "City Café",   contact_name: "陳客服", phone: "02-2700-8888" },
      { name: "可樂農場",    contact_name: "林業務", phone: "04-2359-8765" },
      { name: "伊藤園",      contact_name: "吳貿易", phone: "02-2500-3333" },
      { name: "卡夫亨氏",    contact_name: "黃業代", phone: "02-8751-4321" },
      { name: "大塚製藥",    contact_name: "陳代理", phone: "02-2705-5000" },
      { name: "我的美麗日記", contact_name: "許公關", phone: "02-8768-2288" },
      { name: "維力食品",    contact_name: "蔡業務", phone: "04-2239-4567" },
    ];
    const { data: sups, error: supErr } = await supabase.from("suppliers")
      .upsert(supplierData, { onConflict: "name" }).select();
    if (supErr) console.log("Seed suppliers error:", supErr);
    results.suppliers = sups?.length ?? 0;

    // ── 3) 建立 name→id 映射 ──
    const catMap: Record<string, string> = {};
    const supMap: Record<string, string> = {};
    (cats ?? []).forEach((c: any) => { catMap[c.name] = c.id; });
    (sups ?? []).forEach((s: any) => { supMap[s.name] = s.id; });

    // ── 4) PostgreSQL：插入庫存商品 ──
    const inventoryData = [
      { barcode: "4711233010027", name: "統一鮮奶 (936ml)", cat: "乳製品", sup: "統一企業",    orig: 85,  dyn: 68,   stock: 3,   safety: 20, unit: "瓶", arrival: "2026-04-01", exp: "2026-04-09" },
      { barcode: "4714321012345", name: "礦泉水 550ml",      cat: "飲料",   sup: "台灣純水",    orig: 20,  dyn: null, stock: 8,   safety: 50, unit: "瓶", arrival: "2026-03-15", exp: "2026-10-15" },
      { barcode: "4711432100234", name: "雞排便當",           cat: "熟食",   sup: "統一鮮食",    orig: 75,  dyn: 60,   stock: 12,  safety: 10, unit: "份", arrival: "2026-04-07", exp: "2026-04-07" },
      { barcode: "4714321012346", name: "拿鐵咖啡 (大)",      cat: "飲料",   sup: "City Café",   orig: 65,  dyn: 55,   stock: 24,  safety: 15, unit: "杯", arrival: "2026-04-07", exp: "2026-04-10" },
      { barcode: "4711233010028", name: "日式飯糰 (鮭魚)",    cat: "輕食",   sup: "統一鮮食",    orig: 35,  dyn: null, stock: 18,  safety: 10, unit: "個", arrival: "2026-04-07", exp: "2026-04-08" },
      { barcode: "4714321012347", name: "薯片 (原味)",        cat: "零食",   sup: "可樂農場",    orig: 30,  dyn: null, stock: 45,  safety: 20, unit: "包", arrival: "2026-03-01", exp: "2026-09-30" },
      { barcode: "4711432100235", name: "綠茶 (500ml)",       cat: "飲料",   sup: "伊藤園",      orig: 25,  dyn: 28,   stock: 62,  safety: 30, unit: "瓶", arrival: "2026-03-20", exp: "2026-12-31" },
      { barcode: "4711233010029", name: "布丁 (雞蛋口味)",    cat: "甜點",   sup: "統一企業",    orig: 30,  dyn: 22,   stock: 5,   safety: 15, unit: "個", arrival: "2026-04-05", exp: "2026-04-08" },
      { barcode: "4714321012348", name: "關東煮 (組合)",      cat: "熟食",   sup: "統一鮮食",    orig: 50,  dyn: 40,   stock: 7,   safety: 12, unit: "份", arrival: "2026-04-07", exp: "2026-04-07" },
      { barcode: "4714321012349", name: "Oreo 餅乾 (雙倍)",   cat: "零食",   sup: "卡夫亨氏",    orig: 45,  dyn: null, stock: 38,  safety: 20, unit: "包", arrival: "2026-01-15", exp: "2027-03-15" },
      { barcode: "4711432100236", name: "維他命飲料",         cat: "飲料",   sup: "大塚製藥",    orig: 35,  dyn: 38,   stock: 29,  safety: 20, unit: "瓶", arrival: "2026-02-10", exp: "2026-08-20" },
      { barcode: "4711233010030", name: "面膜 (補水)",        cat: "保養",   sup: "我的美麗日記", orig: 120, dyn: null, stock: 14,  safety: 10, unit: "片", arrival: "2026-01-20", exp: "2027-06-30" },
      { barcode: "4710088001234", name: "統一茶裏王 無糖",    cat: "飲料",   sup: "統一企業",    orig: 20,  dyn: null, stock: 248, safety: 50, unit: "瓶", arrival: "2026-03-25", exp: "2026-12-31" },
      { barcode: "4710058003421", name: "光泉低脂鮮乳",       cat: "乳製品", sup: "統一企業",    orig: 20,  dyn: null, stock: 180, safety: 40, unit: "瓶", arrival: "2026-04-05", exp: "2026-04-12" },
      { barcode: "4718854001234", name: "科學麵",             cat: "零食",   sup: "維力食品",    orig: 10,  dyn: null, stock: 320, safety: 80, unit: "包", arrival: "2026-01-01", exp: "2026-11-30" },
    ];
    const invRows = inventoryData.map((p) => ({
      barcode: p.barcode, name: p.name,
      category_id:     catMap[p.cat],
      supplier_id:     supMap[p.sup] ?? null,
      original_price:  p.orig,
      dynamic_price:   p.dyn,
      current_stock:   p.stock,
      safety_stock:    p.safety,
      unit:            p.unit,
      arrival_date:    p.arrival,
      expiration_date: p.exp,
      is_active: true,
    }));
    const { data: inv, error: invErr } = await supabase.from("inventory")
      .upsert(invRows, { onConflict: "barcode" }).select();
    if (invErr) console.log("Seed inventory error:", invErr);
    results.inventory = inv?.length ?? 0;

    // ── 5) PostgreSQL：插入初始警示 ──
    if (inv && inv.length > 0) {
      const alertRows = [
        { alert_type: "low_stock", severity: "critical", title: "低庫存警示：統一鮮奶 (936ml)", message: "統一鮮奶 (936ml) 庫存量剩餘 3 瓶，已低於安全庫存閾值 20 瓶", current_value: 3, threshold_value: 20, status: "active", auto_action: "系統已自動標記商品需補貨" },
        { alert_type: "expiry",    severity: "critical", title: "效期警示：關東煮 (組合)", message: "關東煮 (組合) 今日到期，共 7 份。AI 建議折扣至 NT$30 (6折)", current_value: 0, threshold_value: 0, status: "acknowledged", auto_action: "AI 已自動調整定價至 NT$30" },
        { alert_type: "low_stock", severity: "warning",  title: "低庫存警示：布丁 (雞蛋口味)", message: "布丁 (雞蛋口味) 庫存量剩餘 5 個，已低於安全庫存閾值 15 個", current_value: 5, threshold_value: 15, status: "active", auto_action: null },
        { alert_type: "queue_overflow", severity: "critical", title: "收銀區排隊人數超載", message: "YOLOv8 偵測到收銀區現有 12 人排隊，已超過設定上限 8 人", current_value: 12, threshold_value: 8, status: "active", auto_action: "系統已推播通知給值班主管" },
        { alert_type: "expiry",    severity: "warning",  title: "效期警示：乳製品系列即將到期", message: "統一鮮奶 (936ml) 等 3 項乳製品將於 2 天內到期", current_value: 3, threshold_value: 2, status: "active", auto_action: "AI 建議折扣 20%" },
        { alert_type: "ai_drift",  severity: "info",     title: "AI 動態定價模型已更新", message: "ML 模型已基於最新銷售數據重新訓練，涵蓋 23 項商品，預計提升整體毛利 8.3%", current_value: null, threshold_value: null, status: "resolved", auto_action: "自動套用新定價策略至 23 項商品" },
      ];
      const { data: alts, error: altErr } = await supabase.from("alerts").insert(alertRows).select();
      if (altErr) console.log("Seed alerts error:", altErr);
      results.alerts = alts?.length ?? 0;
    }

    // ── 6) KV Store：顧客、分析、儀表板資料 ──
    const kvEntries: { key: string; value: unknown }[] = [];
    const customers = [
      { id: "C-0012", name: "林美華", phone: "0912-***-456", tier: "金卡",  visits: 84,  total_spent: 42180,  last_visit: "2026-04-07", avg_order: 502, change: "+8.2%",  trend_up: true  },
      { id: "C-0034", name: "陳志偉", phone: "0928-***-312", tier: "白金",  visits: 143, total_spent: 89420,  last_visit: "2026-04-06", avg_order: 625, change: "+14.6%", trend_up: true  },
      { id: "C-0051", name: "王淑芬", phone: "0956-***-789", tier: "金卡",  visits: 62,  total_spent: 28900,  last_visit: "2026-04-05", avg_order: 466, change: "-3.1%",  trend_up: false },
      { id: "C-0078", name: "張建宏", phone: "0905-***-234", tier: "銀卡",  visits: 31,  total_spent: 11240,  last_visit: "2026-04-04", avg_order: 363, change: "+5.4%",  trend_up: true  },
      { id: "C-0092", name: "李雅玲", phone: "0933-***-567", tier: "白金",  visits: 198, total_spent: 124750, last_visit: "2026-04-07", avg_order: 630, change: "+22.1%", trend_up: true  },
      { id: "C-0105", name: "吳建國", phone: "0918-***-890", tier: "銀卡",  visits: 28,  total_spent: 9840,   last_visit: "2026-04-02", avg_order: 351, change: "-1.2%",  trend_up: false },
      { id: "C-0118", name: "黃淑惠", phone: "0947-***-123", tier: "金卡",  visits: 73,  total_spent: 35620,  last_visit: "2026-04-06", avg_order: 488, change: "+6.7%",  trend_up: true  },
      { id: "C-0132", name: "劉宗翰", phone: "0962-***-456", tier: "普通",  visits: 14,  total_spent: 4120,   last_visit: "2026-03-28", avg_order: 294, change: "+2.3%",  trend_up: true  },
      { id: "C-0145", name: "蔡明宏", phone: "0912-***-901", tier: "白金",  visits: 211, total_spent: 138200, last_visit: "2026-04-07", avg_order: 655, change: "+18.9%", trend_up: true  },
      { id: "C-0158", name: "洪雅婷", phone: "0978-***-234", tier: "金卡",  visits: 58,  total_spent: 26800,  last_visit: "2026-04-03", avg_order: 462, change: "+3.2%",  trend_up: true  },
      { id: "C-0171", name: "許志明", phone: "0935-***-567", tier: "銀卡",  visits: 22,  total_spent: 7460,   last_visit: "2026-04-01", avg_order: 339, change: "+1.1%",  trend_up: true  },
      { id: "C-0184", name: "葉美雲", phone: "0968-***-890", tier: "普通",  visits: 9,   total_spent: 2340,   last_visit: "2026-03-20", avg_order: 260, change: "-0.5%",  trend_up: false },
    ];
    customers.forEach((c) => kvEntries.push({ key: `customer:${c.id}`, value: { ...c, created_at: "2026-01-01T00:00:00Z" } }));

    kvEntries.push({ key: "kpi:daily:2026-04-07", value: { date: "2026-04-07", revenue: 68420, prev_revenue: 60862, revenue_change: 12.4, customers: 1247, customers_change: 8.2, low_stock_count: 14, low_stock_critical: 3, alert_count: 3, peak_hour: "18:00-20:00", daily_target: 66500, target_achievement: 103 } });
    [{ hour: "06:00", customers: 12 }, { hour: "08:00", customers: 45 }, { hour: "10:00", customers: 38 }, { hour: "12:00", customers: 82 }, { hour: "14:00", customers: 61 }, { hour: "16:00", customers: 74 }, { hour: "18:00", customers: 95 }, { hour: "20:00", customers: 67 }, { hour: "22:00", customers: 28 }].forEach((h) => kvEntries.push({ key: `kpi:hourly:2026-04-07:${h.hour}`, value: { date: "2026-04-07", ...h } }));
    kvEntries.push({ key: "kpi:payment:2026-04-07", value: [{ method: "悠遊卡", pct: 32, color: "#4F46E5" }, { method: "信用卡", pct: 28, color: "#059669" }, { method: "Line Pay", pct: 22, color: "#D97706" }, { method: "現金", pct: 18, color: "#64748B" }] });
    kvEntries.push({ key: "forecast:2026-04-07", value: [{ day: "週二", actual: 68420, forecast: 71000 }, { day: "週三", actual: null, forecast: 74500 }, { day: "週四", actual: null, forecast: 69800 }, { day: "週五", actual: null, forecast: 92400 }, { day: "週六", actual: null, forecast: 115000 }, { day: "週日", actual: null, forecast: 108000 }, { day: "週一", actual: null, forecast: 76000 }] });
    [{ year_month: "2025-10", month: "10月", sales: 1820000, orders: 5240, avg_order: 347 }, { year_month: "2025-11", month: "11月", sales: 2150000, orders: 6120, avg_order: 351 }, { year_month: "2025-12", month: "12月", sales: 3240000, orders: 9080, avg_order: 357 }, { year_month: "2026-01", month: "1月", sales: 2380000, orders: 6750, avg_order: 353 }, { year_month: "2026-02", month: "2月", sales: 1950000, orders: 5510, avg_order: 354 }, { year_month: "2026-03", month: "3月", sales: 2680000, orders: 7640, avg_order: 351 }, { year_month: "2026-04", month: "4月", sales: 2120000, orders: 6030, avg_order: 352 }].forEach((m) => kvEntries.push({ key: `analytics:monthly:${m.year_month}`, value: m }));
    kvEntries.push({ key: "analytics:weekday", value: [{ day: "週一", revenue: 89400, customers: 312 }, { day: "週二", revenue: 76200, customers: 264 }, { day: "週三", revenue: 93100, customers: 327 }, { day: "週四", revenue: 88700, customers: 305 }, { day: "週五", revenue: 112400, customers: 398 }, { day: "週六", revenue: 158200, customers: 547 }, { day: "週日", revenue: 143600, customers: 501 }] });
    kvEntries.push({ key: "analytics:categories:2026-04", value: [{ name: "飲料", value: 32, color: "#4F46E5" }, { name: "零食", value: 24, color: "#059669" }, { name: "日用品", value: 18, color: "#D97706" }, { name: "冷凍食品", value: 14, color: "#DC2626" }, { name: "其他", value: 12, color: "#64748B" }] });
    kvEntries.push({ key: "analytics:top_products:2026-04", value: [{ rank: 1, name: "統一茶裏王 無糖", sku: "BEV-0012", sales: 8420, revenue: 168400, change: "+15.2%", up: true }, { rank: 2, name: "御飯糰 鮭魚", sku: "FOOD-0034", sales: 7218, revenue: 108270, change: "+8.7%", up: true }, { rank: 3, name: "光泉低脂鮮乳", sku: "BEV-0008", sales: 6840, revenue: 136800, change: "+12.1%", up: true }, { rank: 4, name: "科學麵", sku: "SNK-0021", sales: 5912, revenue: 59120, change: "-2.3%", up: false }, { rank: 5, name: "7-SELECT 礦泉水", sku: "BEV-0003", sales: 5640, revenue: 56400, change: "+4.8%", up: true }] });
    kvEntries.push({ key: "analytics:visit_freq", value: [{ range: "1-5次", count: 842 }, { range: "6-15次", count: 1243 }, { range: "16-30次", count: 687 }, { range: "31-60次", count: 312 }, { range: "60次+", count: 98 }] });
    await kv.mset(kvEntries);
    results.kv_entries = kvEntries.length;

    return c.json({
      success: true,
      message: "PostgreSQL + KV Store 資料庫已全部初始化完成",
      summary: results,
    });
  } catch (err) {
    console.log("Seed error:", err);
    return c.json({ error: `Seed failed: ${err}` }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// MIGRATE → 直連 PostgreSQL 執行 DDL（分步驟，附詳細回報）
// ══════════════════════════════════════════════════════════════════════════════
app.post("/make-server-6583f926/migrate", async (c) => {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return c.json({ error: "SUPABASE_DB_URL 環境變數未設定" }, 500);
  }

  // 建立直連（單一連線，執行後立即關閉）
  const sql = postgres(dbUrl, {
    ssl:     "require",
    max:     1,
    idle_timeout: 30,
    connect_timeout: 15,
  });

  const results: { step: string; status: "ok" | "error"; message?: string }[] = [];

  try {
    for (const step of MIGRATION_STEPS) {
      try {
        await sql.unsafe(step.sql);
        results.push({ step: step.name, status: "ok" });
        console.log(`✅ Migration step OK: ${step.name}`);
      } catch (err: any) {
        // 記錄錯誤但繼續執行後續 step（部分 step 失敗不影響整體）
        const msg = err?.message ?? String(err);
        results.push({ step: step.name, status: "error", message: msg });
        console.log(`❌ Migration step FAILED: ${step.name} — ${msg}`);
      }
    }
  } finally {
    await sql.end();
  }

  const failed  = results.filter((r) => r.status === "error");
  const success = results.filter((r) => r.status === "ok");

  return c.json({
    success: failed.length === 0,
    total:   results.length,
    passed:  success.length,
    failed:  failed.length,
    results,
    message: failed.length === 0
      ? `全部 ${results.length} 個步驟執行成功 🎉`
      : `${success.length}/${results.length} 步驟成功，${failed.length} 個步驟失敗`,
  });
});

Deno.serve(app.fetch);