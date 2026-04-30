import { useState, useEffect } from "react";
import {
  Settings, Store, Bell, Shield, Cpu, Users, ChevronRight,
  Save, Mail, Smartphone, Database, Loader2, CheckCircle, AlertTriangle
} from "lucide-react";
import * as api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const menuItems = [
  { id: "store", label: "門市資訊", icon: Store },
  { id: "notifications", label: "通知設定", icon: Bell },
  { id: "ai", label: "AI 模型設定", icon: Cpu },
  { id: "security", label: "帳號安全", icon: Shield },
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

function AccountSecurity() {
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const show = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { supabase } = await import("../../lib/supabase");
      if (email !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) { show("error", error.message); setSaving(false); return; }
      }
      const { error: pe } = await supabase.from("profiles").update({ name }).eq("id", user!.id);
      if (pe) { show("error", pe.message); } else { show("success", "資料已更新！如更改郵件請檢查信符1"); }
    } finally { setSaving(false); }
  };

  const handleChangePw = async () => {
    if (newPw !== confirmPw) { show("error", "新密碼與確認密碼不一致"); return; }
    if (newPw.length < 6) { show("error", "密碼至少 6 個字元"); return; }
    setSaving(true);
    try {
      const { supabase } = await import("../../lib/supabase");
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { show("error", error.message); } else { show("success", "密碼已更新！"); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    } finally { setSaving(false); }
  };

  const inputStyle = { height: "38px", borderColor: "#E2E8F0", fontSize: "0.82rem", color: "#1E293B", outline: "none", background: "#FAFAFA", borderRadius: "8px", padding: "0 12px", width: "100%", border: "1px solid #E2E8F0" };
  const labelStyle = { color: "#475569", fontSize: "0.75rem", fontWeight: 600 as const, display: "block" as const, marginBottom: "6px" };

  return (
    <div>
      <h2 style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>帳號安全</h2>
      <p style={{ color: "#64748B", fontSize: "0.78rem", marginBottom: "24px" }}>修改您的姓名、電子郵件與登入密碼</p>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg" style={{ background: msg.type === "success" ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${msg.type === "success" ? "#BBF7D0" : "#FECACA"}`, color: msg.type === "success" ? "#059669" : "#DC2626", fontSize: "0.82rem", fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Profile info */}
      <div className="rounded-xl border p-5 mb-5" style={{ borderColor: "#E2E8F0" }}>
        <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "16px" }}>基本資料</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={labelStyle}>姓名</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="輸入姓名" />
          </div>
          <div>
            <label style={labelStyle}>電子郵件</label>
            <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="輸入郵件" type="email" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleSaveProfile} disabled={saving} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "儲存中..." : "儲存變更"}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border p-5" style={{ borderColor: "#E2E8F0" }}>
        <h3 style={{ color: "#1E293B", fontSize: "0.85rem", fontWeight: 700, marginBottom: "16px" }}>變更密碼</h3>
        <div className="grid gap-4">
          <div>
            <label style={labelStyle}>新密碼</label>
            <input value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} type="password" placeholder="輸入新密碼（至少 6 位）" />
          </div>
          <div>
            <label style={labelStyle}>確認新密碼</label>
            <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} type="password" placeholder="再輸入一次新密碼" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleChangePw} disabled={saving || !newPw} style={{ background: newPw ? "#DC2626" : "#E2E8F0", color: newPw ? "#fff" : "#94A3B8", border: "none", borderRadius: "8px", padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, cursor: (saving || !newPw) ? "not-allowed" : "pointer" }}>
            {saving ? "更新中..." : "變更密碼"}
          </button>
        </div>
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
      case "security": return <AccountSecurity />;
      
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