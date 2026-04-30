import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Zap, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResetMode) {
      handleResetPassword();
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg("請輸入您的電子郵件以重設密碼");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="flex h-screen" style={{ background: "#F1F5F9" }}>
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{
          width: "45%",
          background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)",
          flexShrink: 0,
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute rounded-full"
          style={{
            width: "400px",
            height: "400px",
            top: "-100px",
            right: "-100px",
            background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: "300px",
            height: "300px",
            bottom: "-50px",
            left: "-50px",
            background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: "44px",
              height: "44px",
              background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
            }}
          >
            <Zap size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1.3rem", lineHeight: 1 }}>
              RetailAI
            </div>
            <div style={{ color: "#818CF8", fontSize: "0.72rem", marginTop: "2px" }}>
              智慧零售生態系
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: "2.4rem",
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: "20px",
            }}
          >
            智慧零售，
            <br />
            <span style={{ color: "#818CF8" }}>AI 驅動未來</span>
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "1rem", lineHeight: 1.7, marginBottom: "40px" }}>
            整合 YOLOv8 邊緣運算、機器學習動態定價與即時庫存管理，
            為您的零售事業注入智慧動能。
          </p>

          {/* Feature bullets */}
          {[
            { icon: "", text: "AI 動態定價，自動最佳化利潤" },
            { icon: "", text: "即時客流分析與熱力圖視覺化" },
            { icon: "", text: "智慧庫存預警，零缺貨損失" },
            { icon: "", text: "YOLOv8 邊緣運算，毫秒級響應" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 mb-3">
              <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
              <span style={{ color: "#CBD5E1", fontSize: "0.88rem" }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-8 relative z-10">
          {[
            { value: "2,400+", label: "合作店鋪" },
            { value: "98.5%", label: "系統可用率" },
            { value: "NT$1.2B", label: "月處理交易額" },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ color: "#FFFFFF", fontSize: "1.4rem", fontWeight: 800 }}>{stat.value}</div>
              <div style={{ color: "#64748B", fontSize: "0.72rem", marginTop: "2px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Store image overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "url('https://images.unsplash.com/photo-1759050486852-fdfe2fdc7bea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080') center/cover no-repeat",
            opacity: 0.07,
          }}
        />
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}
          >
            <Zap size={18} color="#FFFFFF" />
          </div>
          <span style={{ color: "#1E293B", fontWeight: 700, fontSize: "1.2rem" }}>RetailAI</span>
        </div>

        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Header */}
          <div className="mb-8">
            <h2 style={{ color: "#1E293B", fontSize: "1.6rem", fontWeight: 700, marginBottom: "6px" }}>
              {isResetMode ? "重設密碼" : "歡迎回來 👋"}
            </h2>
            <p style={{ color: "#64748B", fontSize: "0.88rem" }}>
              {isResetMode ? "請輸入您的電子郵件，我們將發送重設密碼的連結給您" : "請輸入您的帳號資訊以登入系統"}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: "0.85rem", border: "1px solid #F87171" }}>
              {errorMsg === "Invalid login credentials" ? "帳號或密碼錯誤" : errorMsg}
            </div>
          )}

          {resetSent && (
            <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "#F0FDF4", color: "#059669", fontSize: "0.85rem", border: "1px solid #34D399" }}>
              <CheckCircle2 size={16} />
              重設密碼信件已發送！請檢查您的信箱。
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="mb-4">
              <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                電子郵件
              </label>
              <div
                className="flex items-center gap-3 rounded-lg px-3 border transition-all"
                style={{
                  height: "44px",
                  background: "#FFFFFF",
                  borderColor: "#D1D5DB",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#4F46E5")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
              >
                <Mail size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 border-none outline-none bg-transparent"
                  style={{ color: "#1E293B", fontSize: "0.88rem" }}
                />
              </div>
            </div>

            {/* Password */}
            {!isResetMode && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600 }}>
                    密碼
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    style={{ color: "#4F46E5", fontSize: "0.78rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    忘記密碼？
                  </button>
                </div>
                <div
                  className="flex items-center gap-3 rounded-lg px-3 border transition-all"
                  style={{
                    height: "44px",
                    background: "#FFFFFF",
                    borderColor: "#D1D5DB",
                  }}
                >
                  <Lock size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="輸入您的密碼"
                    className="flex-1 border-none outline-none bg-transparent"
                    style={{ color: "#1E293B", fontSize: "0.88rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: "#9CA3AF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember me */}
            {!isResetMode && (
              <div className="flex items-center gap-2 mb-6 mt-4">
                <input
                  type="checkbox"
                  id="remember"
                  defaultChecked
                  className="rounded"
                  style={{ width: "15px", height: "15px", accentColor: "#4F46E5", cursor: "pointer" }}
                />
                <label htmlFor="remember" style={{ color: "#475569", fontSize: "0.82rem", cursor: "pointer" }}>
                  記住我的登入狀態 (30 天)
                </label>
              </div>
            )}

            {/* Submit */}
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
                marginTop: isResetMode ? "24px" : "0",
              }}
            >
              {loading ? (
                <>
                  <div
                    className="rounded-full border-2 border-white border-t-transparent animate-spin"
                    style={{ width: "16px", height: "16px" }}
                  />
                  驗證中...
                </>
              ) : (
                <>
                  {isResetMode ? "發送重設信件" : "登入系統"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {isResetMode && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setResetSent(false); setErrorMsg(""); }}
                  style={{ color: "#64748B", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}
                >
                  返回登入
                </button>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
            <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>或</span>
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
          </div>

          {/* SSO */}
          <button
            className="flex items-center justify-center gap-2 w-full rounded-lg border transition-all"
            style={{
              height: "42px",
              background: "#FFFFFF",
              borderColor: "#E2E8F0",
              color: "#475569",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 帳號登入
          </button>

          {/* Register link */}
          <p className="text-center mt-6" style={{ color: "#64748B", fontSize: "0.85rem" }}>
            還沒有帳號？{" "}
            <Link
              to="/register"
              style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}
            >
              立即免費註冊
            </Link>
          </p>

          {/* Security note */}
          <div
            className="flex items-center justify-center gap-2 mt-6 px-4 py-2 rounded-lg"
            style={{ background: "#F0FDF4" }}
          >
            <ShieldCheck size={13} style={{ color: "#059669" }} />
            <span style={{ color: "#059669", fontSize: "0.72rem" }}>
              SSL 加密連線，您的資料受到完整保護
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
