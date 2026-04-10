import { useState, useEffect } from "react";
import {
  Settings, Store, Bell, Shield, Cpu, Users, ChevronRight,
  Save, Globe, Mail, Smartphone, Database, CheckCircle, Loader2, AlertTriangle
} from "lucide-react";
import * as api from "../lib/api";

const menuItems = [
  { id: "store", label: "門市資訊", icon: Store },
  { id: "notifications", label: "通知設定", icon: Bell },
  { id: "ai", label: "AI 模型設定", icon: Cpu },
  { id: "security", label: "帳號安全", icon: Shield },
  { id: "team", label: "團隊成員", icon: Users },
  { id: "database", label: "資料庫管理", icon: Database },
];

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}
function Toggle({ value, onChange, color = "#4F46E5" }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative rounded-full transition-colors flex-shrink-0"
      style={{
        width: "36px", height: "20px",
        background: value ? color : "#CBD5E1",
        border: "none", cursor: "pointer", padding: 0,
      }}
    >
      <div
        className="absolute rounded-full bg-white transition-all"
        style={{ width: "14px", height: "14px", top: "3px", left: value ? "19px" : "3px", transition: "left 0.2s" }}
      />
    </button>
  );
}

function StoreSettings() {
  return (
    <div>
      <h2 style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>門市資訊</h2>
      <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: "24px" }}>管理門市基本資料與營業設定</p>
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {[
          { label: "門市名稱", value: "全家便利商店 信義旗艦店" },
          { label: "門市代碼", value: "FMB-SY-001" },
          { label: "地址", value: "台北市信義區信義路五段 7 號" },
          { label: "電話", value: "02-2345-6789" },
          { label: "統一編號", value: "12345678" },
          { label: "時區", value: "Asia/Taipei (UTC+8)" },
        ].map((f) => (
          <div key={f.label}>
            <label style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>{f.label}</label>
            <input
              defaultValue={f.value}
              className="w-full px-3 rounded-lg border"
              style={{ height: "36px", borderColor: "#E2E8F0", fontSize: "0.82rem", color: "#1E293B", outline: "none", background: "#FAFAFA" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <label style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>營業時間</label>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["週一", "週二", "週三", "週四", "週五", "週六", "週日"].map((d) => (
            <div key={d} className="text-center p-2 rounded-lg border" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
              <div style={{ color: "#64748B", fontSize: "0.65rem", marginBottom: "4px" }}>{d}</div>
              <div style={{ color: "#1E293B", fontSize: "0.7rem", fontWeight: 600 }}>07:00</div>
              <div style={{ color: "#94A3B8", fontSize: "0.6rem" }}>— 23:00</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    lowStock: true, expiry: true, queueAlert: true, aiReport: false,
    emailNotify: true, smsNotify: false, appNotify: true,
    dailyDigest: true, weeklyReport: true,
  });
  const toggle = (k: keyof typeof settings) => setSettings((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div>
      <h2 style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>通知設定</h2>
      <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: "24px" }}>設定警示觸發條件與通知渠道</p>

      <div className="mb-6">
        <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px" }}>通知渠道</h3>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
          {[
            { key: "emailNotify" as const, icon: Mail, label: "電子郵件通知", sub: "admin@retailai.com.tw" },
            { key: "smsNotify" as const, icon: Smartphone, label: "簡訊通知", sub: "0912-345-678" },
            { key: "appNotify" as const, icon: Bell, label: "系統內通知", sub: "瀏覽器推播與側欄通知" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-center justify-between p-4" style={{ borderBottom: i < 2 ? "1px solid #F1F5F9" : "none" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg" style={{ width: "34px", height: "34px", background: "#EEF2FF" }}>
                    <Icon size={15} style={{ color: "#4F46E5" }} />
                  </div>
                  <div>
                    <div style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 600 }}>{item.label}</div>
                    <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>{item.sub}</div>
                  </div>
                </div>
                <Toggle value={settings[item.key]} onChange={() => toggle(item.key)} />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px" }}>警示觸發設定</h3>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
          {[
            { key: "lowStock" as const, label: "低庫存警示", sub: "庫存低於安全閾值時通知" },
            { key: "expiry" as const, label: "效期警示", sub: "商品距效期 3 天內通知" },
            { key: "queueAlert" as const, label: "排隊擁擠警示", sub: "YOLOv8 偵測排隊超過 8 人" },
            { key: "aiReport" as const, label: "AI 每日分析報告", sub: "每日 08:00 自動發送摘要" },
            { key: "dailyDigest" as const, label: "每日營業摘要", sub: "打烊後自動整理當日數據" },
            { key: "weeklyReport" as const, label: "週報表", sub: "每週一 09:00 發送週分析" },
          ].map((item, i, arr) => (
            <div key={item.key} className="flex items-center justify-between p-4" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div>
                <div style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 500 }}>{item.label}</div>
                <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>{item.sub}</div>
              </div>
              <Toggle value={settings[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AISettings() {
  const [pricing, setPricing] = useState(true);
  const [yolo, setYolo] = useState(true);
  const [forecast, setForecast] = useState(true);
  const [aggressiveness, setAggressiveness] = useState(60);

  return (
    <div>
      <h2 style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>AI 模型設定</h2>
      <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: "24px" }}>調整各 AI 模型的運行參數與策略</p>

      <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: "#E2E8F0" }}>
        {[
          { label: "動態定價模型", sub: "根據庫存、競品與時段自動調整售價", value: pricing, set: setPricing, status: "運行中", statusColor: "#059669" },
          { label: "YOLOv8 客流偵測", sub: "邊緣運算即時辨識人流與排隊狀況", value: yolo, set: setYolo, status: "運行中", statusColor: "#059669" },
          { label: "銷量預測模型", sub: "整合歷史數據、天氣與節假日預測銷量", value: forecast, set: setForecast, status: "更新中", statusColor: "#D97706" },
        ].map((item, i) => (
          <div key={item.label} className="flex items-center justify-between p-4" style={{ borderBottom: i < 2 ? "1px solid #F1F5F9" : "none" }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-lg" style={{ width: "34px", height: "34px", background: "linear-gradient(135deg, #EEF2FF, #F3F0FF)" }}>
                <Cpu size={15} style={{ color: "#4F46E5" }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#1E293B", fontSize: "0.82rem", fontWeight: 600 }}>{item.label}</span>
                  <span className="px-1.5 py-0.5 rounded-full" style={{ background: item.statusColor + "20", color: item.statusColor, fontSize: "0.6rem", fontWeight: 700 }}>{item.status}</span>
                </div>
                <div style={{ color: "#94A3B8", fontSize: "0.68rem" }}>{item.sub}</div>
              </div>
            </div>
            <Toggle value={item.value} onChange={item.set} color="#4F46E5" />
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4 border" style={{ borderColor: "#E2E8F0" }}>
        <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px" }}>動態定價積極程度</h3>
        <div className="flex items-center gap-3 mb-2">
          <span style={{ color: "#64748B", fontSize: "0.72rem" }}>保守</span>
          <input
            type="range" min={0} max={100} value={aggressiveness}
            onChange={(e) => setAggressiveness(Number(e.target.value))}
            className="flex-1" style={{ accentColor: "#4F46E5" }}
          />
          <span style={{ color: "#64748B", fontSize: "0.72rem" }}>積極</span>
          <span className="px-2 py-0.5 rounded-lg" style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "0.72rem", fontWeight: 700 }}>{aggressiveness}%</span>
        </div>
        <p style={{ color: "#94A3B8", fontSize: "0.68rem" }}>
          積極程度越高，AI 調價幅度越大（最高 ±25%）。建議根據商品毛利率設定。
        </p>
      </div>
    </div>
  );
}

function DatabaseSettings() {
  const [migrating, setMigrating] = useState(false);
  const [seeding,   setSeeding]   = useState(false);
  const [migrateResult, setMigrateResult] = useState<api.MigrationResult[] | null>(null);
  const [migrateMsg,    setMigrateMsg]    = useState<{ success: boolean; message: string; passed?: number; total?: number } | null>(null);
  const [seedResult,    setSeedResult]    = useState<{ success: boolean; message: string; summary?: Record<string, number> } | null>(null);
  const [expandSteps,   setExpandSteps]   = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  
  useEffect(() => {
    api.getDatabaseStats().then(res => setTables(res.data)).catch(console.error);
  }, []);

  const handleMigrate = async () => {
    if (!confirm("確定要執行 PostgreSQL 資料庫遷移？這將重建所有資料表與函數（現有資料將被清除）。")) return;
    setMigrating(true);
    setMigrateResult(null);
    setMigrateMsg(null);
    setExpandSteps(false);
    try {
      const res = await api.runMigration();
      setMigrateResult(res.results);
      setMigrateMsg({ success: res.success, message: res.message, passed: res.passed, total: res.total });
    } catch (err: any) {
      setMigrateMsg({ success: false, message: `連線失敗：${err.message}` });
    } finally {
      setMigrating(false);
      api.getDatabaseStats().then(res => setTables(res.data));
    }
  };

  const handleSeed = async () => {
    if (!confirm("確定要寫入種子資料？這將覆蓋現有同名資料。")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await api.seedDatabase();
      setSeedResult({ success: true, message: res.message, summary: res.summary });
    } catch (err: any) {
      setSeedResult({ success: false, message: err.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <h2 style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>資料庫管理</h2>
      <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: "24px" }}>
        管理 PostgreSQL 關聯式資料庫與 KV Store，建置資料表、函數、Trigger 與 RLS 政策
      </p>

      {/* PostgreSQL Schema 說明 */}
      <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: "#E2E8F0" }}>
        <div className="px-4 py-3 border-b" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
          <div className="flex items-center gap-3">
            <span style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700 }}>PostgreSQL 關聯式資料庫（3NF）</span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "0.65rem", fontWeight: 700 }}>主要資料源</span>
          </div>
        </div>
        {tables.length === 0 ? <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div> : tables.map((item, i, arr) => (
          <div key={item.name} className="flex items-start justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <div className="flex items-start gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0" style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "0.6rem", fontWeight: 700 }}>PG</span>
              <div className="min-w-0">
                <code style={{ color: "#1E293B", fontSize: "0.75rem", fontWeight: 700 }}>{item.name}</code>
                {item.fk && <span className="ml-2 px-1.5 py-0.5 rounded" style={{ background: "#FEF3C7", color: "#92400E", fontSize: "0.58rem", fontWeight: 600 }}>{item.fk}</span>}
                <p style={{ color: "#64748B", fontSize: "0.68rem", marginTop: "2px", lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full flex-shrink-0 ml-3" style={{ background: "#F1F5F9", color: "#4F46E5", fontSize: "0.65rem", fontWeight: 700, whiteSpace: "nowrap" }}>{item.count} 筆</span>
          </div>
        ))}
      </div>

      {/* KV Store Schema 說明 */}
      <div className="rounded-xl border overflow-hidden mb-6" style={{ borderColor: "#E2E8F0" }}>
        <div className="px-4 py-3 border-b" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
          <div className="flex items-center gap-3">
            <span style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700 }}>KV Store（備援 / 非關聯資料）</span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: "#F0FDF4", color: "#059669", fontSize: "0.65rem", fontWeight: 700 }}>自動降級</span>
          </div>
        </div>
        {[
          { prefix: "customer:{id}",             desc: "顧客資料（等級、消費次數、累計金額）", count: "12 筆" },
          { prefix: "kpi:daily:{date}",           desc: "每日 KPI 快照（PostgreSQL 有資料時自動改用即時計算）", count: "1 筆" },
          { prefix: "kpi:hourly:{date}:{hour}",   desc: "每小時客流量（YOLOv8 edge_logs 備援）", count: "9 筆" },
          { prefix: "kpi:payment:{date}",         desc: "付款方式分佈快照", count: "1 筆" },
          { prefix: "forecast:{date}",            desc: "ML 七日銷量預測快照（ml_forecasts 備援）", count: "1 筆" },
          { prefix: "analytics:monthly:{ym}",     desc: "月度銷售分析快照", count: "7 筆" },
          { prefix: "analytics:visit_freq",       desc: "顧客消費頻次分佈", count: "1 筆" },
        ].map((item, i, arr) => (
          <div key={item.prefix} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <div className="min-w-0">
              <code style={{ color: "#059669", fontSize: "0.72rem", fontWeight: 600, background: "#F0FDF4", padding: "2px 6px", borderRadius: "4px" }}>{item.prefix}</code>
              <p style={{ color: "#64748B", fontSize: "0.68rem", marginTop: "3px" }}>{item.desc}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full flex-shrink-0 ml-3" style={{ background: "#F1F5F9", color: "#64748B", fontSize: "0.65rem", fontWeight: 600, whiteSpace: "nowrap" }}>{item.count}</span>
          </div>
        ))}
      </div>

      {/* ── STEP 1：PostgreSQL 遷移 ── */}
      <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "#C7D2FE" }}>
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #EEF2FF, #F3F0FF)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ background: "#4F46E5", color: "#FFF", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>1</span>
                <span style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 700 }}>執行 PostgreSQL 資料庫遷移</span>
              </div>
              <p style={{ color: "#4338CA", fontSize: "0.72rem", lineHeight: 1.5, paddingLeft: "28px" }}>
                建立所有資料表（19 個步驟）、索引、RPC 函數 <code style={{ background: "#E0E7FF", padding: "0 3px", borderRadius: "3px" }}>process_checkout</code>、
                低庫存 Trigger、RLS 政策，並寫入初始種子資料（categories / suppliers / inventory / alerts）。
                <strong style={{ color: "#DC2626" }}> ⚠ 會清除現有同名資料表。</strong>
              </p>
            </div>
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
              style={{ background: migrating ? "#C7D2FE" : "#4F46E5", color: "#FFF", border: "none", cursor: migrating ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap", minWidth: "140px", justifyContent: "center" }}
            >
              {migrating ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
              {migrating ? "遷移中..." : "執行 SQL 遷移"}
            </button>
          </div>
        </div>

        {/* 遷移結果 */}
        {migrateMsg && (
          <div className="px-5 py-4 border-t" style={{ borderColor: "#C7D2FE", background: "#FAFBFF" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {migrateMsg.success
                  ? <CheckCircle size={16} style={{ color: "#059669" }} />
                  : <AlertTriangle size={16} style={{ color: "#DC2626" }} />}
                <span style={{ color: migrateMsg.success ? "#059669" : "#DC2626", fontWeight: 700, fontSize: "0.82rem" }}>
                  {migrateMsg.message}
                </span>
              </div>
              {migrateResult && (
                <button
                  onClick={() => setExpandSteps(!expandSteps)}
                  style={{ color: "#4F46E5", fontSize: "0.72rem", background: "none", border: "none", cursor: "pointer" }}
                >
                  {expandSteps ? "收起" : `查看詳細 (${migrateMsg.passed}/${migrateMsg.total})`}
                </button>
              )}
            </div>

            {/* 步驟摘要：永遠顯示失敗的步驟 */}
            {migrateResult && (
              <div>
                {/* 失敗項目（永遠顯示） */}
                {migrateResult.filter(r => r.status === "error").map((r) => (
                  <div key={r.step} className="flex items-start gap-2 mb-1.5 p-2 rounded-lg" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                    <span style={{ color: "#DC2626", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>✗</span>
                    <div>
                      <div style={{ color: "#DC2626", fontSize: "0.72rem", fontWeight: 700 }}>{r.step}</div>
                      <div style={{ color: "#B91C1C", fontSize: "0.65rem", fontFamily: "monospace", marginTop: "2px", wordBreak: "break-all" }}>{r.message}</div>
                    </div>
                  </div>
                ))}

                {/* 展開時顯示所有步驟 */}
                {expandSteps && (
                  <div className="rounded-lg overflow-hidden border mt-2" style={{ borderColor: "#E2E8F0" }}>
                    {migrateResult.map((r, i) => (
                      <div key={r.step} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: i < migrateResult.length - 1 ? "1px solid #F1F5F9" : "none", background: r.status === "ok" ? "#FAFFFE" : "#FFF9F9" }}>
                        <span style={{ color: r.status === "ok" ? "#059669" : "#DC2626", fontSize: "0.72rem", fontWeight: 700, width: "14px", flexShrink: 0 }}>
                          {r.status === "ok" ? "✓" : "✗"}
                        </span>
                        <span style={{ color: r.status === "ok" ? "#374151" : "#DC2626", fontSize: "0.72rem" }}>{r.step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2：KV 種子資料 ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#A7F3D0" }}>
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #F0FDF4, #ECFDF5)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ background: "#059669", color: "#FFF", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>2</span>
                <span style={{ color: "#1E293B", fontSize: "0.88rem", fontWeight: 700 }}>寫入 KV 種子資料（顧客 / 儀表板 / 分析）</span>
              </div>
              <p style={{ color: "#065F46", fontSize: "0.72rem", lineHeight: 1.5, paddingLeft: "28px" }}>
                將顧客資料、每日 KPI、小時客流、付款分佈、ML 預測快照、月度/週間分析等備援資料寫入 KV Store。
                PostgreSQL 遷移完成後建議也執行此步驟。
              </p>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
              style={{ background: seeding ? "#A7F3D0" : "#059669", color: "#FFF", border: "none", cursor: seeding ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap", minWidth: "140px", justifyContent: "center" }}
            >
              {seeding ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
              {seeding ? "寫入中..." : "寫入 KV 資���"}
            </button>
          </div>
        </div>

        {seedResult && (
          <div className="px-5 py-4 border-t" style={{ borderColor: "#A7F3D0", background: "#FAFFFE" }}>
            <div className="flex items-center gap-2 mb-3">
              {seedResult.success ? <CheckCircle size={15} style={{ color: "#059669" }} /> : <AlertTriangle size={15} style={{ color: "#DC2626" }} />}
              <span style={{ color: seedResult.success ? "#059669" : "#DC2626", fontWeight: 700, fontSize: "0.78rem" }}>{seedResult.message}</span>
            </div>
            {seedResult.summary && (
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                {Object.entries(seedResult.summary).map(([k, v]) => (
                  <div key={k} className="rounded-lg px-3 py-2 text-center border" style={{ background: "#FFF", borderColor: "#D1FAE5" }}>
                    <div style={{ color: "#059669", fontSize: "1rem", fontWeight: 700 }}>{v}</div>
                    <div style={{ color: "#64748B", fontSize: "0.62rem", marginTop: "1px" }}>{k.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [active, setActive] = useState("database");

  const renderContent = () => {
    switch (active) {
      case "store": return <StoreSettings />;
      case "notifications": return <NotificationSettings />;
      case "ai": return <AISettings />;
      case "database": return <DatabaseSettings />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "#94A3B8" }}>
            <Settings size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
            <p style={{ fontSize: "0.85rem" }}>此設定頁面即將推出</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6" style={{ minHeight: "100%", background: "#F1F5F9" }}>
      <div className="flex items-center gap-2 mb-6">
        <Settings size={20} style={{ color: "#4F46E5" }} />
        <h1 style={{ color: "#1E293B", fontSize: "1.25rem", fontWeight: 700 }}>系統設定</h1>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "220px 1fr" }}>
        {/* Sidebar Menu */}
        <div className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", alignSelf: "start" }}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                  background: isActive ? "#EEF2FF" : "transparent",
                  borderBottom: i < menuItems.length - 1 ? "1px solid #F8FAFC" : "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} style={{ color: isActive ? "#4F46E5" : "#64748B" }} />
                  <span style={{ color: isActive ? "#4F46E5" : "#475569", fontSize: "0.82rem", fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight size={14} style={{ color: isActive ? "#4F46E5" : "#CBD5E1" }} />
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="rounded-xl p-6 border" style={{ background: "#FFFFFF", borderColor: "#E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {renderContent()}
          <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: "#F1F5F9" }}>
            <button
              className="flex items-center gap-2 px-5 py-2 rounded-lg"
              style={{ background: "#4F46E5", color: "#FFFFFF", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}
            >
              <Save size={14} />
              儲存設定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}