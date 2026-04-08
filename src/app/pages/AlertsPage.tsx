import { useState, useEffect } from "react";
import {
  AlertTriangle, Users, Package, Brain, CheckCircle, Clock,
  Bell, BellOff, ChevronRight, RefreshCcw,
  Zap, Camera, Filter, ShieldAlert, Loader2
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import * as api from "../lib/api";

const typeConfig = {
  critical: { bg: "#FEF2F2", border: "#FECACA", iconBg: "#FEE2E2", iconColor: "#DC2626", badgeBg: "#DC2626", badgeText: "#FFFFFF", label: "緊急" },
  warning:  { bg: "#FFFBEB", border: "#FDE68A", iconBg: "#FEF3C7", iconColor: "#D97706", badgeBg: "#F59E0B", badgeText: "#FFFFFF", label: "警告" },
  info:     { bg: "#F0F9FF", border: "#BAE6FD", iconBg: "#E0F2FE", iconColor: "#0284C7", badgeBg: "#0284C7", badgeText: "#FFFFFF", label: "資訊" },
  success:  { bg: "#F0FDF4", border: "#BBF7D0", iconBg: "#DCFCE7", iconColor: "#059669", badgeBg: "#059669", badgeText: "#FFFFFF", label: "正常" },
};

const categoryIcons = { inventory: Package, crowd: Users, ai: Brain, system: Zap, expiry: Clock };
const categoryLabels = { inventory: "庫存警示", crowd: "客流警示", ai: "AI 通知", system: "系統狀態", expiry: "效期警示" };
const statusConfig = {
  active:       { label: "待處理", color: "#DC2626", bg: "#FEF2F2" },
  acknowledged: { label: "已確認", color: "#D97706", bg: "#FFFBEB" },
  resolved:     { label: "已解決", color: "#059669", bg: "#ECFDF5" },
};

const timeAgo = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "剛剛";
  if (diff < 60) return `${diff} 分鐘前`;
  if (diff < 1440) return `${Math.floor(diff / 60)} 小時前`;
  return `${Math.floor(diff / 1440)} 天前`;
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<api.Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("全部");
  const [filterStatus, setFilterStatus] = useState("全部");
  const [selectedAlert, setSelectedAlert] = useState<api.Alert | null>(null);
  const [queueData, setQueueData] = useState<{ time: string; queue: number }[]>([]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts();
      setAlerts(res.data ?? []);
      
      const edgeRes = await api.getEdgeLogs("queue_count", 20);
      const formattedQueue = (edgeRes.data ?? [])
        .slice()
        .reverse()
        .map(log => {
          const d = new Date(log.recorded_at || log.created_at || new Date());
          return {
            time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
            queue: log.numeric_value ?? 0
          };
        });
      if (formattedQueue.length > 0) setQueueData(formattedQueue);
    } catch (err) {
      console.error("Failed to load alerts/logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadAlerts(); 
    const channel = api.supabase
      .channel("alerts_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, (payload: any) => {
        if (payload.eventType === "INSERT") setAlerts(prev => [payload.new, ...prev]);
        if (payload.eventType === "UPDATE") setAlerts(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
      })
      .subscribe();
      
    return () => { api.supabase.removeChannel(channel); };
  }, []);

  const handleStatusChange = async (id: string, status: api.Alert["status"]) => {
    try {
      const res = await api.updateAlert(id, { status });
      setAlerts((prev) => prev.map((a) => a.id === id ? res.data : a));
      if (selectedAlert?.id === id) setSelectedAlert(null);
    } catch (err) {
      console.error("Failed to update alert:", err);
    }
  };

  const filtered = alerts.filter((a) => {
    const matchType = filterType === "全部" || a.type === filterType;
    const matchStatus = filterStatus === "全部" || a.status === filterStatus;
    return matchType && matchStatus;
  });

  const activeCount = alerts.filter((a) => a.status === "active").length;
  const criticalCount = alerts.filter((a) => a.type === "critical" && a.status === "active").length;

  const summaryCards = [
    { label: "待處理警示", value: activeCount, icon: Bell, color: "#DC2626", bg: "#FEF2F2" },
    { label: "緊急事件", value: criticalCount, icon: ShieldAlert, color: "#DC2626", bg: "#FEF2F2" },
    { label: "今日已解決", value: alerts.filter((a) => a.status === "resolved").length, icon: CheckCircle, color: "#059669", bg: "#ECFDF5" },
    { label: "AI 自動處理", value: alerts.filter((a) => a.auto_action).length, icon: Brain, color: "#4F46E5", bg: "#EEF2FF" },
  ];

  return (
    <div className="p-6" style={{ background: "#F1F5F9", minHeight: "100%" }}>
      {/* Summary cards */}
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
              <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: "42px", height: "42px", background: card.bg }}>
                <Icon size={20} style={{ color: card.color }} />
              </div>
              <div>
                <div style={{ color: "#1E293B", fontSize: "1.5rem", fontWeight: 800 }}>
                  {loading ? <div className="rounded animate-pulse" style={{ width: "30px", height: "28px", background: "#E2E8F0" }} /> : card.value}
                </div>
                <div style={{ color: "#94A3B8", fontSize: "0.72rem" }}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time alert banner */}
      {!loading && criticalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-5 py-3 mb-5 border" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
          <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: "32px", height: "32px", background: "#FEE2E2" }}>
            <AlertTriangle size={16} style={{ color: "#DC2626" }} />
          </div>
          <div className="flex-1">
            <span style={{ color: "#DC2626", fontWeight: 700, fontSize: "0.88rem" }}>⚡ 即時警示：目前有 {criticalCount} 則緊急事件需要立即處理</span>
            <span style={{ color: "#B91C1C", fontSize: "0.78rem", marginLeft: "8px" }}>請立即查看並採取行動</span>
          </div>
          <div className="rounded-full animate-ping" style={{ width: "8px", height: "8px", background: "#DC2626", opacity: 0.75 }} />
        </div>
      )}

      <div className="flex gap-5">
        {/* Alert list */}
        <div className="flex-1 min-w-0">
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {["全部", "critical", "warning", "info", "success"].map((t) => (
                <button key={t} onClick={() => setFilterType(t)} className="rounded-lg px-3 transition-all border" style={{ height: "30px", fontSize: "0.75rem", fontWeight: filterType === t ? 700 : 400, background: filterType === t ? (t === "全部" ? "#4F46E5" : (typeConfig[t as keyof typeof typeConfig]?.badgeBg ?? "#4F46E5")) : "#FFFFFF", color: filterType === t ? "#FFFFFF" : "#64748B", borderColor: filterType === t ? "transparent" : "#E2E8F0", cursor: "pointer" }}>
                  {t === "全部" ? "全部" : t === "critical" ? "🔴 緊急" : t === "warning" ? "🟡 警告" : t === "info" ? "🔵 資訊" : "🟢 正常"}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {["全部", "active", "acknowledged", "resolved"].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)} className="rounded-lg px-3 border transition-all" style={{ height: "30px", fontSize: "0.72rem", fontWeight: filterStatus === s ? 600 : 400, background: filterStatus === s ? "#1E293B" : "#FFFFFF", color: filterStatus === s ? "#FFFFFF" : "#64748B", borderColor: filterStatus === s ? "#1E293B" : "#E2E8F0", cursor: "pointer" }}>
                  {s === "全部" ? "全部狀態" : s === "active" ? "待處理" : s === "acknowledged" ? "已確認" : "已解決"}
                </button>
              ))}
            </div>
            <button onClick={loadAlerts} disabled={loading} className="flex items-center gap-1.5 rounded-xl px-3 border" style={{ height: "30px", background: "#FFFFFF", borderColor: "#E2E8F0", color: "#64748B", fontSize: "0.75rem", cursor: "pointer" }}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />} 重新整理
            </button>
          </div>

          {/* Alerts */}
          <div className="flex flex-col gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-4" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
                    <div className="flex gap-4">
                      <div className="rounded-xl animate-pulse" style={{ width: "40px", height: "40px", background: "#E2E8F0", flexShrink: 0 }} />
                      <div className="flex-1">
                        <div className="rounded animate-pulse mb-2" style={{ height: "14px", width: "60%", background: "#E2E8F0" }} />
                        <div className="rounded animate-pulse" style={{ height: "12px", width: "90%", background: "#E2E8F0" }} />
                      </div>
                    </div>
                  </div>
                ))
              : filtered.map((alert) => {
                  const config = typeConfig[alert.type];
                  const CatIcon = categoryIcons[alert.category];
                  const statusCfg = statusConfig[alert.status];
                  const isSelected = selectedAlert?.id === alert.id;
                  return (
                    <div key={alert.id} className="rounded-xl border cursor-pointer transition-all" style={{ background: isSelected ? config.bg : "#FFFFFF", borderColor: isSelected ? config.border : "#E2E8F0", boxShadow: isSelected ? `0 2px 12px ${config.iconColor}20` : "0 1px 3px rgba(0,0,0,0.04)" }} onClick={() => setSelectedAlert(isSelected ? null : alert)}>
                      <div className="flex items-start gap-4 p-4">
                        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: "40px", height: "40px", background: config.iconBg }}>
                          <CatIcon size={18} style={{ color: config.iconColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-full" style={{ background: config.badgeBg, color: config.badgeText, fontSize: "0.65rem", fontWeight: 700 }}>{config.label}</span>
                            <span className="px-2 py-0.5 rounded-full" style={{ background: "#F1F5F9", color: "#64748B", fontSize: "0.65rem", fontWeight: 500 }}>{categoryLabels[alert.category]}</span>
                            {alert.location && <span style={{ color: "#94A3B8", fontSize: "0.68rem" }}>📍 {alert.location}</span>}
                            <span className="ml-auto px-2 py-0.5 rounded-full" style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: "0.65rem", fontWeight: 600 }}>{statusCfg.label}</span>
                          </div>
                          <h4 style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 700, marginBottom: "4px" }}>{alert.title}</h4>
                          <p style={{ color: "#64748B", fontSize: "0.78rem", lineHeight: 1.5 }}>{alert.detail}</p>
                          {alert.value && (
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5">
                                <span style={{ color: "#94A3B8", fontSize: "0.7rem" }}>當前值：</span>
                                <span style={{ color: config.iconColor, fontSize: "0.78rem", fontWeight: 700 }}>{alert.value}</span>
                              </div>
                              {alert.threshold && (
                                <div className="flex items-center gap-1.5">
                                  <span style={{ color: "#94A3B8", fontSize: "0.7rem" }}>閾值：</span>
                                  <span style={{ color: "#64748B", fontSize: "0.78rem", fontWeight: 600 }}>{alert.threshold}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {alert.auto_action && (
                            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg" style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
                              <Zap size={12} style={{ color: "#4F46E5" }} />
                              <span style={{ color: "#4338CA", fontSize: "0.72rem" }}>AI 自動動作：{alert.auto_action}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span style={{ color: "#94A3B8", fontSize: "0.7rem" }}>{timeAgo(alert.created_at)}</span>
                          <div className="flex gap-1">
                            {alert.status === "active" && (
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(alert.id, "acknowledged"); }} className="rounded-lg px-2.5 py-1 border text-center" style={{ background: "#FFFBEB", borderColor: "#FDE68A", color: "#D97706", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>確認</button>
                            )}
                            {alert.status !== "resolved" && (
                              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(alert.id, "resolved"); }} className="rounded-lg px-2.5 py-1 border text-center" style={{ background: "#ECFDF5", borderColor: "#A7F3D0", color: "#059669", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>解決</button>
                            )}
                            <button className="flex items-center justify-center rounded-lg border" style={{ width: "26px", height: "26px", background: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748B", cursor: "pointer" }}>
                              <ChevronRight size={12} style={{ transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <BellOff size={40} style={{ color: "#E2E8F0", marginBottom: "12px" }} />
                <p style={{ color: "#94A3B8" }}>目前沒有符合條件的警示</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4" style={{ width: "300px", flexShrink: 0 }}>
          {/* Queue chart */}
          <div className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Camera size={15} style={{ color: "#D97706" }} />
              <span style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 700 }}>排隊人數趨勢</span>
              <div className="rounded-full animate-pulse ml-auto" style={{ width: "6px", height: "6px", background: "#DC2626" }} />
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={queueData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.75rem" }} />
                <ReferenceLine y={8} stroke="#DC2626" strokeDasharray="4 2" label={{ value: "上限", position: "insideTopRight", fill: "#DC2626", fontSize: 10 }} />
                <Line type="monotone" dataKey="queue" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: "#F59E0B", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* System health */}
          <div className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} style={{ color: "#4F46E5" }} />
              <span style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 700 }}>系統健康度</span>
            </div>
            {[
              { label: "POS 收銀系統", health: 100, color: "#059669" },
              { label: "庫存管理", health: 98, color: "#059669" },
              { label: "YOLOv8 邊緣推論", health: 92, color: "#D97706" },
              { label: "ML 預測模型", health: 99, color: "#059669" },
              { label: "通知推播服務", health: 100, color: "#059669" },
            ].map((item) => (
              <div key={item.label} className="mb-2.5">
                <div className="flex justify-between mb-1">
                  <span style={{ color: "#475569", fontSize: "0.72rem" }}>{item.label}</span>
                  <span style={{ color: item.color, fontSize: "0.72rem", fontWeight: 700 }}>{item.health}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: "4px", background: "#F1F5F9" }}>
                  <div className="rounded-full" style={{ height: "100%", width: `${item.health}%`, background: item.color, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Alert rules */}
          <div className="rounded-xl p-4 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter size={15} style={{ color: "#4F46E5" }} />
                <span style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 700 }}>警示規則</span>
              </div>
              <button style={{ color: "#4F46E5", fontSize: "0.72rem", background: "none", border: "none", cursor: "pointer" }}>管理</button>
            </div>
            {[
              { rule: "庫存低於安全值", enabled: true },
              { rule: "排隊超過 8 人", enabled: true },
              { rule: "效期 ≤ 2 天", enabled: true },
              { rule: "AI 模型異常", enabled: true },
              { rule: "設備離線超過 5 分鐘", enabled: false },
            ].map((item) => (
              <div key={item.rule} className="flex items-center justify-between mb-2">
                <span style={{ color: "#475569", fontSize: "0.75rem" }}>{item.rule}</span>
                <div className="rounded-full transition-all" style={{ width: "32px", height: "17px", background: item.enabled ? "#4F46E5" : "#E2E8F0", position: "relative", cursor: "pointer" }}>
                  <div className="absolute rounded-full" style={{ width: "13px", height: "13px", background: "#FFFFFF", top: "2px", left: item.enabled ? "17px" : "2px", transition: "left 0.2s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}