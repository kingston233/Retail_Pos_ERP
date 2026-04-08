import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Users, Search, Star, TrendingUp, TrendingDown,
  ShoppingBag, Calendar, Crown, ArrowUpRight, RefreshCcw, Loader2
} from "lucide-react";
import * as api from "../lib/api";

const tierConfig: Record<string, { bg: string; color: string }> = {
  "白金": { bg: "#F3F0FF", color: "#7C3AED" },
  "金卡": { bg: "#FFFBEB", color: "#D97706" },
  "銀卡": { bg: "#F8FAFC", color: "#64748B" },
  "普通": { bg: "#F1F5F9", color: "#94A3B8" },
};

export function CustomersPage() {
  const [customers, setCustomers] = useState<api.Customer[]>([]);
  const [visitFreq, setVisitFreq] = useState<api.VisitFreq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState("全部");

  const load = async () => {
    setLoading(true);
    try {
      const [custRes, freqRes] = await Promise.all([
        api.getCustomers(),
        api.getAnalyticsVisitFreq(),
      ]);
      setCustomers(custRes.data ?? []);
      setVisitFreq(freqRes.data ?? []);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tiers = ["全部", "白金", "金卡", "銀卡", "普通"];

  const filtered = customers.filter((c) => {
    const matchSearch = !search || c.name.includes(search) || c.id.includes(search);
    const matchTier = selectedTier === "全部" || c.tier === selectedTier;
    return matchSearch && matchTier;
  });

  const platinumCount = customers.filter((c) => c.tier === "白金").length;
  const avgSpent = customers.length ? Math.round(customers.reduce((s, c) => s + c.total_spent, 0) / customers.length) : 0;

  const statCards = [
    { label: "會員總數", value: customers.length.toLocaleString(), sub: "本月新增 +148", icon: Users, iconBg: "#EEF2FF", iconColor: "#4F46E5" },
    { label: "白金會員", value: platinumCount.toString(), sub: `佔比 ${customers.length ? ((platinumCount / customers.length) * 100).toFixed(1) : 0}%`, icon: Crown, iconBg: "#F3F0FF", iconColor: "#7C3AED" },
    { label: "本月回購率", value: "43.2%", sub: "↑ vs 上月 41.7%", icon: TrendingUp, iconBg: "#ECFDF5", iconColor: "#059669" },
    { label: "平均客單價", value: `NT$${avgSpent.toLocaleString()}`, sub: "↑ +0.8% MoM", icon: ShoppingBag, iconBg: "#FFFBEB", iconColor: "#D97706" },
  ];

  return (
    <div className="p-6" style={{ minHeight: "100%", background: "#F1F5F9" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={20} style={{ color: "#4F46E5" }} />
            <h1 style={{ color: "#1E293B", fontSize: "1.25rem", fontWeight: 700 }}>顧客洞察</h1>
          </div>
          <p style={{ color: "#64748B", fontSize: "0.78rem" }}>會員行為分析 · AI 精準行銷建議</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", color: "#64748B", cursor: "pointer", fontSize: "0.82rem" }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} 重新整理
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#4F46E5", color: "#FFFFFF", border: "none", cursor: "pointer", fontSize: "0.82rem" }}>
            <ArrowUpRight size={15} /> 匯出報告
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center justify-center rounded-xl" style={{ width: "38px", height: "38px", background: s.iconBg }}>
                  <Icon size={18} style={{ color: s.iconColor }} />
                </div>
              </div>
              <p style={{ color: "#1E293B", fontSize: "1.35rem", fontWeight: 700 }}>
                {loading ? <span className="inline-block rounded animate-pulse" style={{ width: "60px", height: "28px", background: "#E2E8F0" }} /> : s.value}
              </p>
              <p style={{ color: "#64748B", fontSize: "0.72rem", marginTop: "1px" }}>{s.label}</p>
              <p style={{ color: "#94A3B8", fontSize: "0.68rem", marginTop: "2px" }}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "1fr 320px" }}>
        {/* Customer Table */}
        <div className="rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "#F1F5F9" }}>
            <div className="flex items-center gap-2 flex-1 px-3 rounded-lg border" style={{ borderColor: "#E2E8F0", height: "34px" }}>
              <Search size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
              <input
                type="text" placeholder="搜尋會員姓名或編號..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: "none", outline: "none", flex: 1, fontSize: "0.78rem", color: "#1E293B", background: "transparent" }}
              />
            </div>
            <div className="flex items-center gap-1">
              {tiers.map((t) => (
                <button key={t} onClick={() => setSelectedTier(t)} className="px-2.5 py-1 rounded-lg border text-xs transition-colors" style={{ background: selectedTier === t ? "#4F46E5" : "#FFFFFF", borderColor: selectedTier === t ? "#4F46E5" : "#E2E8F0", color: selectedTier === t ? "#FFFFFF" : "#64748B", cursor: "pointer", fontSize: "0.72rem" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="grid px-4 py-2.5 border-b" style={{ borderColor: "#F1F5F9", gridTemplateColumns: "1fr 80px 80px 90px 90px 80px" }}>
            {["會員資訊", "會員等級", "消費次數", "累計消費", "客單價", "消費趨勢"].map((h) => (
              <div key={h} style={{ color: "#94A3B8", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid px-4 py-3 border-b items-center" style={{ borderColor: "#F8FAFC", gridTemplateColumns: "1fr 80px 80px 90px 90px 80px" }}>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full animate-pulse" style={{ width: "30px", height: "30px", background: "#E2E8F0" }} />
                    <div><div className="rounded animate-pulse mb-1" style={{ width: "80px", height: "12px", background: "#E2E8F0" }} /><div className="rounded animate-pulse" style={{ width: "60px", height: "10px", background: "#F1F5F9" }} /></div>
                  </div>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="rounded animate-pulse" style={{ height: "12px", background: "#E2E8F0", width: "50px" }} />
                  ))}
                </div>
              ))
            : filtered.map((c) => {
                const tier = tierConfig[c.tier] ?? tierConfig["普通"];
                return (
                  <div key={c.id} className="grid px-4 py-3 border-b hover:bg-slate-50 transition-colors cursor-pointer items-center" style={{ borderColor: "#F8FAFC", gridTemplateColumns: "1fr 80px 80px 90px 90px 80px" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: "30px", height: "30px", background: "#EEF2FF", color: "#4F46E5", fontSize: "0.72rem", fontWeight: 700 }}>{c.name[0]}</div>
                        <div>
                          <div style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 600 }}>{c.name}</div>
                          <div style={{ color: "#94A3B8", fontSize: "0.65rem" }}>{c.id} · {c.phone}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: tier.bg, color: tier.color, fontSize: "0.65rem", fontWeight: 600 }}>
                        {c.tier === "白金" && <Crown size={9} />}{c.tier}
                      </span>
                    </div>
                    <div style={{ color: "#475569", fontSize: "0.78rem", fontWeight: 500 }}>{c.visits} 次</div>
                    <div style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 600 }}>NT${c.total_spent.toLocaleString()}</div>
                    <div style={{ color: "#475569", fontSize: "0.78rem" }}>NT${c.avg_order.toLocaleString()}</div>
                    <div className="flex items-center gap-1" style={{ color: c.trend_up ? "#059669" : "#DC2626", fontSize: "0.72rem", fontWeight: 600 }}>
                      {c.trend_up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {c.change}
                    </div>
                  </div>
                );
              })}
          {!loading && filtered.length === 0 && (
            <div className="py-10 text-center" style={{ color: "#94A3B8", fontSize: "0.82rem" }}>找不到符合條件的會員</div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4">
          {/* Visit Frequency */}
          <div className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>消費頻次分佈</h3>
            <p style={{ color: "#94A3B8", fontSize: "0.68rem", marginBottom: "12px" }}>會員造訪次數統計</p>
            {loading
              ? <div className="rounded animate-pulse" style={{ height: "140px", background: "#E2E8F0" }} />
              : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={visitFreq} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => [`${v} 人`, "會員數"]} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.75rem" }} />
                    <Bar dataKey="count" fill="#4F46E5" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* AI Recommendations */}
          <div className="rounded-xl p-4 border" style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)", borderColor: "#3730A3" }}>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} style={{ color: "#818CF8" }} />
              <span style={{ color: "#E0E7FF", fontSize: "0.82rem", fontWeight: 700 }}>AI 行銷建議</span>
            </div>
            {[
              { text: "32 位流失風險會員可發送回購優惠券", color: "#FCD34D" },
              { text: "白金會員消費力提升 22%，建議推送新品預購", color: "#34D399" },
              { text: "週末消費尖峰可推播限時折扣提升轉換", color: "#818CF8" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 mb-2.5">
                <div className="rounded-full mt-1.5 flex-shrink-0" style={{ width: "5px", height: "5px", background: item.color }} />
                <span style={{ color: "#CBD5E1", fontSize: "0.7rem", lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Last Visit Stats */}
          <div className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} style={{ color: "#64748B" }} />
              <span style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 700 }}>最近消費分佈</span>
            </div>
            {[
              { label: "今日消費", count: 312, pct: 64, color: "#4F46E5" },
              { label: "近 7 天", count: 487, pct: 85, color: "#059669" },
              { label: "近 30 天", count: 1842, pct: 58, color: "#D97706" },
              { label: "超過 30 天", count: 541, pct: 17, color: "#94A3B8" },
            ].map((item) => (
              <div key={item.label} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#475569", fontSize: "0.7rem" }}>{item.label}</span>
                  <span style={{ color: "#1E293B", fontSize: "0.7rem", fontWeight: 600 }}>{item.count.toLocaleString()} 人</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: "4px", background: "#F1F5F9" }}>
                  <div className="rounded-full" style={{ height: "100%", width: `${item.pct}%`, background: item.color, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
