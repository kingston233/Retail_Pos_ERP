import { useEffect, useState, useId } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Package, AlertTriangle,
  Brain, Eye, RefreshCcw, ChevronRight, Clock, Zap, Loader2
} from "lucide-react";
import * as api from "../lib/api";

function getHeatColor(value: number) {
  if (value < 20) return "#EFF6FF";
  if (value < 35) return "#BFDBFE";
  if (value < 50) return "#60A5FA";
  if (value < 65) return "#3B82F6";
  if (value < 80) return "#F59E0B";
  return "#EF4444";
}

const generateHeatmap = () => {
  const rows = 8; const cols = 10; const data = [];
  const hotspots = [
    { r: 1, c: 1, intensity: 90 }, { r: 1, c: 8, intensity: 85 },
    { r: 4, c: 5, intensity: 75 }, { r: 6, c: 2, intensity: 60 }, { r: 3, c: 8, intensity: 50 },
  ];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      let val = 5 + Math.random() * 20;
      for (const hs of hotspots) {
        const dist = Math.sqrt((r - hs.r) ** 2 + (c - hs.c) ** 2);
        val += hs.intensity * Math.exp(-dist * 0.8);
      }
      row.push(Math.min(100, val));
    }
    data.push(row);
  }
  return data;
};
const heatmapData = generateHeatmap();

const storeZones = [
  { label: "入口區", r: 1, c: 1 }, { label: "收銀台", r: 1, c: 8 },
  { label: "飲料區", r: 6, c: 2 }, { label: "零食區", r: 3, c: 8 },
];

function SkeletonBox({ w = "100%", h = 20 }: { w?: string | number; h?: number }) {
  return <div className="rounded animate-pulse" style={{ width: w, height: h, background: "#E2E8F0" }} />;
}

export function DashboardPage() {
  const uid = useId();
  const forecastGradId = `fg-${uid}`;
  const actualGradId = `ag-${uid}`;

  const [kpi, setKpi] = useState<api.DailyKPI | null>(null);
  const [forecast, setForecast] = useState<api.ForecastPoint[]>([]);
  const [hourly, setHourly] = useState<api.HourlyTraffic[]>([]);
  const [payments, setPayments] = useState<api.PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<api.Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [kpiRes, forecastRes, hourlyRes, paymentsRes, txRes] = await Promise.all([
        api.getDashboardKPI(),
        api.getDashboardForecast(),
        api.getDashboardHourly(),
        api.getDashboardPayments(),
        api.getTransactions(),
      ]);
      setKpi(kpiRes.data);
      setForecast(forecastRes.data ?? []);
      setHourly(hourlyRes.data ?? []);
      setPayments(paymentsRes.data ?? []);
      setTransactions((txRes.data ?? []).slice(0, 5));
      setLastRefresh(new Date().toLocaleString("zh-TW"));
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const kpiCards = kpi
    ? [
        {
          title: "今日營業額", value: `NT$${kpi.revenue.toLocaleString()}`,
          change: `+${kpi.revenue_change}%`, trend: "up",
          sub: `vs 昨日 NT$${kpi.prev_revenue.toLocaleString()}`,
          icon: DollarSign, iconBg: "#EEF2FF", iconColor: "#4F46E5",
        },
        {
          title: "今日來客數", value: kpi.customers.toLocaleString(),
          change: `+${kpi.customers_change}%`, trend: "up",
          sub: `高峰期 ${kpi.peak_hour}`,
          icon: Users, iconBg: "#ECFDF5", iconColor: "#059669",
        },
        {
          title: "低庫存商品", value: `${kpi.low_stock_count} 項`,
          change: "需立即補貨", trend: "down",
          sub: `${kpi.low_stock_critical} 項低於安全閾值`,
          icon: Package, iconBg: "#FFFBEB", iconColor: "#D97706",
        },
        {
          title: "AI 警示", value: `${kpi.alert_count} 則`,
          change: "排隊超載 × 1", trend: "down",
          sub: "庫存警示 × 2",
          icon: AlertTriangle, iconBg: "#FEF2F2", iconColor: "#DC2626",
        },
      ]
    : [];

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "剛剛";
    if (diff < 60) return `${diff} 分鐘前`;
    return `${Math.floor(diff / 60)} 小時前`;
  };

  return (
    <div className="p-6" style={{ minHeight: "100%", background: "#F1F5F9" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p style={{ color: "#64748B", fontSize: "0.82rem" }}>
            <Clock size={12} style={{ display: "inline", marginRight: "4px" }} />
            最後更新：{lastRefresh || "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
            <div className="rounded-full animate-pulse" style={{ width: "6px", height: "6px", background: "#059669" }} />
            <span style={{ color: "#059669", fontSize: "0.75rem", fontWeight: 600 }}>系統運行正常</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors"
            style={{ background: "#FFFFFF", borderColor: "#E2E8F0", color: "#64748B", fontSize: "0.78rem", cursor: "pointer" }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
            重新整理
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
                <SkeletonBox h={14} w="60%" />
                <div className="mt-2"><SkeletonBox h={32} w="80%" /></div>
                <div className="mt-2"><SkeletonBox h={12} w="50%" /></div>
              </div>
            ))
          : kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="rounded-xl p-5 border transition-all" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: 500, marginBottom: "4px" }}>{card.title}</p>
                      <p style={{ color: "#1E293B", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>{card.value}</p>
                    </div>
                    <div className="flex items-center justify-center rounded-xl" style={{ width: "42px", height: "42px", background: card.iconBg }}>
                      <Icon size={20} style={{ color: card.iconColor }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.trend === "up"
                      ? <TrendingUp size={13} style={{ color: "#059669" }} />
                      : <TrendingDown size={13} style={{ color: "#D97706" }} />}
                    <span style={{ color: card.trend === "up" ? "#059669" : "#D97706", fontSize: "0.75rem", fontWeight: 600 }}>{card.change}</span>
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: "0.7rem", marginTop: "2px" }}>{card.sub}</p>
                </div>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* ML Forecast */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Brain size={16} style={{ color: "#4F46E5" }} />
                <h3 style={{ color: "#1E293B", fontSize: "0.9rem", fontWeight: 700 }}>未來七天銷量預測</h3>
                <span className="px-2 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "0.65rem", fontWeight: 700 }}>ML 模型</span>
              </div>
              <p style={{ color: "#94A3B8", fontSize: "0.72rem" }}>基於歷史數據 + 天氣 + 節假日因子</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#059669", fontSize: "0.8rem", fontWeight: 700 }}>+18.2%</div>
              <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>預測週成長</div>
            </div>
          </div>
          {loading
            ? <SkeletonBox h={200} />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={forecast} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={forecastGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={actualGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number, name: string) => [`NT$${v?.toLocaleString() ?? "—"}`, name === "forecast" ? "AI 預測" : "實際"]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.78rem" }} />
                  <Legend formatter={(v) => v === "forecast" ? "AI 預測值" : "實際營業額"} wrapperStyle={{ fontSize: "0.72rem" }} />
                  <Area key="actual" type="monotone" dataKey="actual" stroke="#059669" strokeWidth={2.5} fill={`url(#${actualGradId})`} connectNulls dot={{ fill: "#059669", r: 4 }} />
                  <Area key="forecast" type="monotone" dataKey="forecast" stroke="#4F46E5" strokeWidth={2} strokeDasharray="6 3" fill={`url(#${forecastGradId})`} dot={{ fill: "#4F46E5", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Store Heatmap */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Eye size={16} style={{ color: "#D97706" }} />
                <h3 style={{ color: "#1E293B", fontSize: "0.9rem", fontWeight: 700 }}>店鋪客流熱力圖</h3>
                <span className="px-2 py-0.5 rounded-full" style={{ background: "#FFFBEB", color: "#D97706", fontSize: "0.65rem", fontWeight: 700 }}>YOLOv8</span>
              </div>
              <p style={{ color: "#94A3B8", fontSize: "0.72rem" }}>邊緣運算即時更新 · 每 5 秒</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#DC2626", fontSize: "0.8rem", fontWeight: 700 }}>⚠ 排隊擁擠</div>
              <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>收銀區 12 人</div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
              {heatmapData.map((row, ri) => (
                <div key={ri} className="flex">
                  {row.map((val, ci) => (
                    <div key={ci} style={{ flex: 1, height: "18px", background: getHeatColor(val), opacity: 0.85, transition: "all 0.3s" }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
              <div className="grid" style={{ gridTemplateColumns: "repeat(10, 1fr)", gridTemplateRows: "repeat(8, 1fr)", width: "100%", height: "100%" }}>
                {storeZones.map((zone) => (
                  <div key={zone.label} style={{ gridColumn: zone.c + 1, gridRow: zone.r + 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ background: "rgba(0,0,0,0.65)", color: "#FFFFFF", fontSize: "0.48rem", padding: "1px 3px", borderRadius: "2px", fontWeight: 600, whiteSpace: "nowrap" }}>{zone.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span style={{ color: "#94A3B8", fontSize: "0.65rem" }}>人流密度</span>
            <div className="flex items-center gap-1">
              {["#EFF6FF", "#60A5FA", "#3B82F6", "#F59E0B", "#EF4444"].map((c, i) => (
                <div key={i} className="rounded-sm" style={{ width: "20px", height: "8px", background: c }} />
              ))}
              <span style={{ color: "#94A3B8", fontSize: "0.65rem", marginLeft: "4px" }}>高</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr 320px" }}>
        {/* Hourly traffic */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 700, marginBottom: "16px" }}>今日每時客流</h3>
          {loading
            ? <SkeletonBox h={150} />
            : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={hourly} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.78rem" }} formatter={(v: number) => [`${v} 人`, "來客數"]} />
                  <Bar dataKey="customers" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Recent transactions */}
        <div className="rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 700 }}>最近交易記錄</h3>
            <button style={{ color: "#4F46E5", fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>
              查看全部 <ChevronRight size={13} />
            </button>
          </div>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-3"><SkeletonBox h={36} /></div>)
            : (
              <div>
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "#F8FAFC" }}>
                    <div>
                      <div style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 600 }}>{tx.id}</div>
                      <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>{tx.cashier} · {tx.items_count} 項商品 · {tx.payment_method}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ color: "#059669", fontSize: "0.82rem", fontWeight: 700 }}>NT${tx.total.toLocaleString()}</div>
                      <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>{timeAgo(tx.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Payment methods & AI status */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-4 border flex-1" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px" }}>付款方式分佈</h3>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-3"><SkeletonBox h={20} /></div>)
              : payments.map((p) => (
                  <div key={p.method} className="mb-2.5">
                    <div className="flex justify-between mb-1">
                      <span style={{ color: "#475569", fontSize: "0.72rem" }}>{p.method}</span>
                      <span style={{ color: "#1E293B", fontSize: "0.72rem", fontWeight: 600 }}>{p.pct}%</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: "5px", background: "#F1F5F9" }}>
                      <div className="rounded-full" style={{ height: "100%", width: `${p.pct}%`, background: p.color, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))}
          </div>

          {/* AI Status */}
          <div className="rounded-xl p-4 border" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)", borderColor: "#3730A3" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: "#818CF8" }} />
              <span style={{ color: "#E0E7FF", fontSize: "0.82rem", fontWeight: 700 }}>AI 引擎狀態</span>
            </div>
            {[
              { label: "動態定價模型", status: "運行中", color: "#34D399" },
              { label: "YOLOv8 邊緣推論", status: "運行中", color: "#34D399" },
              { label: "銷量預測模型", status: "更新中", color: "#FCD34D" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between mb-2">
                <span style={{ color: "#94A3B8", fontSize: "0.72rem" }}>{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="rounded-full animate-pulse" style={{ width: "6px", height: "6px", background: item.color }} />
                  <span style={{ color: item.color, fontSize: "0.68rem", fontWeight: 600 }}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Items List */}
      {kpi && (kpi as any).low_stock_items?.length > 0 && (
        <div className="mt-5 rounded-xl p-5 border" style={{ background: "#FFFFFF", borderColor: "#FECACA", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} style={{ color: "#DC2626" }} />
            <h3 style={{ color: "#1E293B", fontSize: "0.95rem", fontWeight: 700 }}>需立即補貨商品清單</h3>
            <span className="px-2 py-0.5 rounded-full ml-2" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "0.75rem", fontWeight: 700 }}>
              {(kpi as any).low_stock_critical} 項緊急
            </span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
            {(kpi as any).low_stock_items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: item.current_stock === 0 ? "#FECACA" : "#FDE68A", background: item.current_stock === 0 ? "#FEF2F2" : "#FFFBEB" }}>
                <div>
                  <div style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 700 }}>{item.name}</div>
                  <div style={{ color: "#64748B", fontSize: "0.7rem", marginTop: "2px" }}>{item.barcode}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: item.current_stock === 0 ? "#DC2626" : "#D97706", fontSize: "0.9rem", fontWeight: 800 }}>{item.current_stock}</div>
                  <div style={{ color: "#94A3B8", fontSize: "0.65rem" }}>/ {item.safety_stock} 警示值</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
