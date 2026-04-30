import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Zap, User, Mail, Lock, ArrowRight, Check, Briefcase } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role_code: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return;
    setLoading(true);
    setErrorMsg("");
    
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role_code: form.role_code,
        }
      }
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      alert("註冊成功！請檢查您的信箱進行驗證，或直接登入。");
      navigate("/login");
    }
  };

  const passwordStrength = (p: string) => {
    if (p.length === 0) return 0;
    let strength = 0;
    if (p.length >= 8) strength++;
    if (/[A-Z]/.test(p)) strength++;
    if (/[0-9]/.test(p)) strength++;
    if (/[^A-Za-z0-9]/.test(p)) strength++;
    return strength;
  };

  const strength = passwordStrength(form.password);
  const strengthLabels = ["", "弱", "普通", "良好", "強"];
  const strengthColors = ["", "#DC2626", "#D97706", "#059669", "#059669"];

  return (
    <div className="flex h-screen overflow-auto" style={{ background: "#F1F5F9" }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{
          width: "40%",
          background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)",
          flexShrink: 0,
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: "350px", height: "350px",
            top: "-80px", right: "-80px",
            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: "44px", height: "44px", background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}
          >
            <Zap size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.3rem" }}>RetailAI</div>
            <div style={{ color: "#818CF8", fontSize: "0.72rem" }}>智慧零售生態系</div>
          </div>
        </div>

        {/* Plans */}
        <div className="relative z-10">
          <h2 style={{ color: "#FFFFFF", fontSize: "1.6rem", fontWeight: 700, marginBottom: "8px" }}>
            選擇適合您的方案
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "0.88rem", marginBottom: "32px" }}>
            免費試用 14 天，無需信用卡
          </p>

          {[
            {
              id: "starter",
              name: "入門版",
              price: "免費",
              features: ["1 間店鋪", "基礎 POS 收銀", "庫存管理", "基礎報表"],
            },
            {
              id: "pro",
              name: "專業版",
              price: "NT$1,299/月",
              features: ["5 間店鋪", "AI 動態定價", "YOLOv8 客流分析", "進階報表與預測"],
            },
          ].map((plan) => (
            <div
              key={plan.id}
              className="mb-3 p-4 rounded-xl border transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "#1E293B",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: "#FFFFFF", fontSize: "0.9rem", fontWeight: 600 }}>{plan.name}</span>
                <span style={{ color: "#818CF8", fontSize: "0.85rem", fontWeight: 700 }}>{plan.price}</span>
              </div>
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-2 mb-1">
                  <Check size={12} style={{ color: "#34D399" }} />
                  <span style={{ color: "#CBD5E1", fontSize: "0.75rem" }}>{f}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ color: "#475569", fontSize: "0.72rem" }}>
          © 2026 RetailAI Inc. 保留所有權利
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: "url('https://images.unsplash.com/photo-1773713612984-fcc59de6fffd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800') center/cover no-repeat",
            opacity: 0.05,
          }}
        />
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div className="mb-7">
            <h2 style={{ color: "#1E293B", fontSize: "1.5rem", fontWeight: 700, marginBottom: "6px" }}>
              建立您的帳號 🚀
            </h2>
            <p style={{ color: "#64748B", fontSize: "0.88rem" }}>
              加入 2,400+ 家使用 RetailAI 的零售商
            </p>
          </div>
          
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "0.85rem", border: "1px solid #F87171" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="mb-3.5">
              <label style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "5px" }}>
                姓名 <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div
                className="flex items-center gap-3 rounded-lg px-3 border"
                style={{ height: "42px", background: "#FFFFFF", borderColor: "#D1D5DB" }}
              >
                <User size={15} style={{ color: "#9CA3AF" }} />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="您的姓名"
                  required
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{ color: "#1E293B", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Role Code */}
            <div className="mb-3.5">
              <label style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "5px" }}>
                註冊身分 <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div
                className="flex items-center gap-3 rounded-lg px-3 border"
                style={{ height: "42px", background: "#FFFFFF", borderColor: "#D1D5DB" }}
              >
                <Briefcase size={15} style={{ color: "#9CA3AF" }} />
                <select
                  value={form.role_code}
                  onChange={(e) => setForm({ ...form, role_code: parseInt(e.target.value) })}
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{ color: "#1E293B", fontSize: "0.85rem", appearance: "none", cursor: "pointer" }}
                >
                  <option value={1}>一般店員</option>
                  <option value={0}>管理員 / 店長</option>
                  <option value={2}>經理</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div className="mb-3.5">
              <label style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "5px" }}>
                電子郵件 <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div
                className="flex items-center gap-3 rounded-lg px-3 border"
                style={{ height: "42px", background: "#FFFFFF", borderColor: "#D1D5DB" }}
              >
                <Mail size={15} style={{ color: "#9CA3AF" }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@store.com"
                  required
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{ color: "#1E293B", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-3.5">
              <label style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "5px" }}>
                設定密碼 <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div
                className="flex items-center gap-3 rounded-lg px-3 border"
                style={{ height: "42px", background: "#FFFFFF", borderColor: "#D1D5DB" }}
              >
                <Lock size={15} style={{ color: "#9CA3AF" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="至少 8 個字元"
                  required
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{ color: "#1E293B", fontSize: "0.85rem" }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength meter */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full"
                        style={{
                          height: "3px",
                          background: i <= strength ? strengthColors[strength] : "#E2E8F0",
                          transition: "all 0.2s",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ color: strengthColors[strength], fontSize: "0.7rem" }}>
                    密碼強度：{strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="mb-5">
              <label style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "5px" }}>
                確認密碼 <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <div
                className="flex items-center gap-3 rounded-lg px-3 border"
                style={{
                  height: "42px",
                  background: "#FFFFFF",
                  borderColor: form.confirm && form.confirm !== form.password ? "#DC2626" : "#D1D5DB",
                }}
              >
                <Lock size={15} style={{ color: "#9CA3AF" }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="再次輸入密碼"
                  required
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{ color: "#1E293B", fontSize: "0.85rem" }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p style={{ color: "#DC2626", fontSize: "0.72rem", marginTop: "4px" }}>密碼不一致</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2 mb-5">
              <input
                type="checkbox"
                id="terms"
                required
                style={{ marginTop: "2px", accentColor: "#4F46E5", cursor: "pointer" }}
              />
              <label htmlFor="terms" style={{ color: "#64748B", fontSize: "0.8rem", cursor: "pointer", lineHeight: 1.4 }}>
                我同意{" "}
                <a href="#" style={{ color: "#4F46E5", textDecoration: "none" }}>服務條款</a>{" "}
                與{" "}
                <a href="#" style={{ color: "#4F46E5", textDecoration: "none" }}>隱私政策</a>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full rounded-lg transition-all"
              style={{
                height: "46px",
                background: loading ? "#818CF8" : "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
                color: "#FFFFFF",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
              }}
            >
              {loading ? (
                <>
                  <div className="rounded-full border-2 border-white border-t-transparent animate-spin"
                    style={{ width: "16px", height: "16px" }} />
                  建立帳號中...
                </>
              ) : (
                <>
                  建立帳號，免費開始
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-5" style={{ color: "#64748B", fontSize: "0.85rem" }}>
            已有帳號？{" "}
            <Link to="/login" style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>
              前往登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
