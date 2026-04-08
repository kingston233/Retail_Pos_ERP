import { useEffect, useState, useId } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { BarChart2, TrendingUp, ShoppingBag, Users, ArrowUpRight, ArrowDownRight, RefreshCcw, Loader2 } from "lucide-react";
import * as api from "../lib/api";

export function AnalyticsPage() {
  const uid = useId();
  const salesGradId = `salesGrad-${uid}`;

  const [monthly, setMonthly] = useState<api.MonthlyAnalytics[]>([]);
  const [weekday, setWeekday] = useState<api.WeekdayAnalytics[]>([]);
  const [categories, setCategories] = useState<api.CategoryAnalytics[]>([]);
  const [topProducts, setTopProducts] = useState<api.TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, wRes, cRes, tRes] = await Promise.all([
        api.getAnalyticsMonthly(),
        api.getAnalyticsWeekday(),
        api.getAnalyticsCategories(),
        api.getAnalyticsTopProducts(),
      ]);
      setMonthly(mRes.data ?? []);
      setWeekday(wRes.data ?? []);
      setCategories(cRes.data ?? []);
      setTopProducts(tRes.data ?? []);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentMonth = monthly[monthly.length - 1];

  const kpis = [
    { label: "本月總營收", value: currentMonth ? `NT$${(currentMonth.sales / 10000).toFixed(0)}萬` : "—", change: "+11.4%", up: true, icon: BarChart2, iconBg: "#EEF2FF", iconColor: "#4F46E5" },
    { label: "本月訂單數", value: currentMonth ? currentMonth.orders.toLocaleString() : "—", change: "+7.8%", up: true, icon: ShoppingBag, iconBg: "#ECFDF5", iconColor: "#059669" },
    { label: "客單價", value: currentMonth ? `NT$${currentMonth.avg_order}` : "—", change: "+0.8%", up: true, icon: TrendingUp, iconBg: "#FFFBEB", iconColor: "#D97706" },
    { label: "回頭客比例", value: "43.2%", change: "-1.5%", up: false, icon: Users, iconBg: "#FEF2F2", iconColor: "#DC2626" },
  ];

  const SkeletonBox = ({ h = 20 }: { h?: number }) => (
    <div className="rounded animate-pulse" style={{ width: "100%", height: h, background: "#E2E8F0" }} />
  );

  return (
    <div className="p-6" style={{ minHeight: "100%", background: "#F1F5F9" }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={20} style={{ color: "#4F46E5" }} />
            <h1 style={{ color: "#1E293B", fontSize: "1.25rem", fontWeight: 700 }}>銷售分析</h1>
          </div>
          <p style={{ color: "#64748B", fontSize: "0.78rem" }}>全通路銷售數據深度分析 · 自動更新</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", color: "#64748B", fontSize: "0.78rem", cursor: "pointer" }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />} 重新整理
          </button>
          {["本週", "本月", "本季", "本年"].map((t) => (
            <button key={t} className="px-3 py-1.5 rounded-lg border text-sm transition-colors" style={{ background: t === "本月" ? "#4F46E5" : "#FFFFFF", borderColor: t === "本月" ? "#4F46E5" : "#E2E8F0", color: t === "本月" ? "#FFFFFF" : "#64748B", fontSize: "0.78rem", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center justify-center rounded-xl" style={{ width: "38px", height: "38px", background: k.iconBg }}>
                  <Icon size={18} style={{ color: k.iconColor }} />
                </div>
                <div className="flex items-center gap-1" style={{ color: k.up ? "#059669" : "#DC2626", fontSize: "0.72rem", fontWeight: 600 }}>
                  {k.up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{k.change}
                </div>
              </div>
              {loading
                ? <SkeletonBox h={28} />
                : <p style={{ color: "#1E293B", fontSize: "1.35rem", fontWeight: 700 }}>{k.value}</p>}
              <p style={{ color: "#64748B", fontSize: "0.72rem", marginTop: "2px" }}>{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Monthly Sales Trend */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ color: "#1E293B", fontSize: "0.9rem", fontWeight: 700 }}>近七個月營收趨勢</h3>
              <p style={{ color: "#94A3B8", fontSize: "0.72rem", marginTop: "2px" }}>月度營業額與訂單量</p>
            </div>
          </div>
          {loading
            ? <SkeletonBox h={200} />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id={salesGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}萬`} />
                  <Tooltip formatter={(v: number, name: string) => [name === "sales" ? `NT$${v.toLocaleString()}` : `${v.toLocaleString()} 筆`, name === "sales" ? "營業額" : "訂單數"]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.78rem" }} />
                  <Legend formatter={(v) => v === "sales" ? "營業額" : "訂單數"} wrapperStyle={{ fontSize: "0.72rem" }} />
                  <Area key="sales" type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2.5} fill={`url(#${salesGradId})`} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Category Pie */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ color: "#1E293B", fontSize: "0.9rem", fontWeight: 700, marginBottom: "4px" }}>品類銷售佔比</h3>
          <p style={{ color: "#94A3B8", fontSize: "0.72rem", marginBottom: "8px" }}>本月各品類貢獻</p>
          {loading
            ? <SkeletonBox h={150} />
            : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                      {categories.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, "佔比"]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.78rem" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {categories.map((c) => (
                    <div key={c.name} className="flex items-center gap-1.5">
                      <div className="rounded-full" style={{ width: "8px", height: "8px", background: c.color, flexShrink: 0 }} />
                      <span style={{ color: "#475569", fontSize: "0.68rem" }}>{c.name} {c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Weekday Revenue */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ color: "#1E293B", fontSize: "0.9rem", fontWeight: 700, marginBottom: "4px" }}>週間銷售分佈</h3>
          <p style={{ color: "#94A3B8", fontSize: "0.72rem", marginBottom: "12px" }}>各星期營收與來客對比（近四週平均）</p>
          {loading
            ? <SkeletonBox h={160} />
            : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekday} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number, name: string) => [name === "revenue" ? `NT$${v.toLocaleString()}` : `${v} 人`, name === "revenue" ? "營收" : "來客"]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.78rem" }} />
                  <Legend formatter={(v) => v === "revenue" ? "營收" : "來客數"} wrapperStyle={{ fontSize: "0.72rem" }} />
                  <Bar key="revenue" dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Top Products */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ color: "#1E293B", fontSize: "0.9rem", fontWeight: 700, marginBottom: "4px" }}>熱銷商品排行</h3>
          <p style={{ color: "#94A3B8", fontSize: "0.72rem", marginBottom: "12px" }}>本月銷量前五名</p>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="mb-3"><div className="rounded animate-pulse" style={{ height: "36px", background: "#E2E8F0" }} /></div>)
            : topProducts.map((p) => (
                <div key={p.sku} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "#F8FAFC" }}>
                  <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: "24px", height: "24px", background: p.rank === 1 ? "#FEF3C7" : "#F8FAFC", fontSize: "0.7rem", fontWeight: 700, color: p.rank === 1 ? "#D97706" : "#94A3B8" }}>{p.rank}</div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ color: "#94A3B8", fontSize: "0.65rem" }}>{p.sku} · {p.sales.toLocaleString()} 件</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 600 }}>NT${p.revenue.toLocaleString()}</div>
                    <div className="flex items-center justify-end gap-0.5" style={{ color: p.up ? "#059669" : "#DC2626", fontSize: "0.65rem", fontWeight: 600 }}>
                      {p.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{p.change}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
