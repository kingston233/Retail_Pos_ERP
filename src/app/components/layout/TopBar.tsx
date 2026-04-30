import { Bell, Search, ChevronDown, Sun, Moon, User, Settings, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "營運儀表板", subtitle: "即時掌握店鋪營運狀況" },
  "/pos": { title: "POS 收銀結帳", subtitle: "快速結帳與交易管理" },
  "/inventory": { title: "庫存與商品管理", subtitle: "管理商品資料與庫存狀態" },
  "/alerts": { title: "全局警示中心", subtitle: "即時事件通知與異常處理" },
  "/analytics": { title: "銷售分析", subtitle: "深度分析銷售數據與趨勢" },
  "/customers": { title: "顧客洞察", subtitle: "客流分析與消費行為洞察" },
  "/settings": { title: "系統設定", subtitle: "管理店鋪偏好與系統配置" },
};

interface TopBarProps {
  onNotificationClick: () => void;
  notificationCount?: number;
  isMobile?: boolean;
  onMobileMenuToggle?: () => void;
}

export function TopBar({ onNotificationClick, notificationCount = 3, isMobile = false, onMobileMenuToggle }: TopBarProps) {
  const location = useLocation();
  const { user, profile } = useAuth();
  const pageInfo = pageTitles[location.pathname] || { title: "RetailAI", subtitle: "" };
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const roleNames: Record<number, string> = {
    0: "管理員 / 店長",
    1: "一般店員",
    2: "經理",
  };
  const roleName = profile?.role_code !== undefined ? roleNames[profile.role_code] : "未知";
  const firstChar = profile?.name ? profile.name.charAt(0).toUpperCase() : "U";

  return (
    <header
      className="flex items-center justify-between px-6 border-b"
      style={{
        height: "64px",
        background: "#FFFFFF",
        borderColor: "#E2E8F0",
        flexShrink: 0,
        zIndex: 20,
        position: "relative",
      }}
    >
      {/* Left: Hamburger (mobile) + Page title */}
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            onClick={onMobileMenuToggle}
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{
              width: "36px",
              height: "36px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              color: "#64748B",
              cursor: "pointer",
            }}
            aria-label="開啟選單"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 style={{ color: "#1E293B", fontSize: isMobile ? "0.95rem" : "1.05rem", fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pageInfo.title}
          </h1>
          {!isMobile && (
            <p style={{ color: "#94A3B8", fontSize: "0.72rem", marginTop: "1px" }}>
              {pageInfo.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Global search (desktop only) */}
        {!isMobile && (
          <div
            className="flex items-center gap-2 rounded-lg px-3"
            style={{
              height: "36px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              width: "200px",
            }}
          >
            <Search size={14} style={{ color: "#94A3B8" }} />
            <input
              type="text"
              placeholder="搜尋商品、訂單..."
              className="border-none outline-none bg-transparent flex-1"
              style={{ color: "#64748B", fontSize: "0.8rem" }}
            />
            <kbd
              className="px-1.5 rounded"
              style={{
                background: "#E2E8F0",
                color: "#94A3B8",
                fontSize: "0.6rem",
                fontFamily: "monospace",
              }}
            >
              ⌘K
            </kbd>
          </div>
        )}

        {/* Dark mode toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: "36px",
              height: "36px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              color: "#64748B",
              cursor: "pointer",
            }}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={onNotificationClick}
          className="relative flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: "36px",
            height: "36px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            color: "#64748B",
            cursor: "pointer",
          }}
        >
          <Bell size={16} />
          {notificationCount > 0 && (
            <span
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: "-4px",
                right: "-4px",
                width: "16px",
                height: "16px",
                background: "#DC2626",
                color: "#FFFFFF",
                fontSize: "0.6rem",
                fontWeight: 700,
              }}
            >
              {notificationCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", background: "#E2E8F0" }} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-2 transition-colors"
            style={{
              height: "36px",
              background: showUserMenu ? "#F1F5F9" : "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
            }}
          >
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                color: "#FFFFFF",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              {firstChar}
            </div>
            {!isMobile && (
              <div className="text-left" style={{ lineHeight: 1.2 }}>
                <div style={{ color: "#1E293B", fontSize: "0.78rem", fontWeight: 600 }}>{profile?.name || "使用者"}</div>
                <div style={{ color: "#94A3B8", fontSize: "0.65rem" }}>{roleName}</div>
              </div>
            )}
            <ChevronDown size={13} style={{ color: "#94A3B8", marginLeft: "2px" }} />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div
              className="absolute right-0 mt-1 rounded-xl border py-1.5 z-50"
              style={{
                top: "100%",
                width: "180px",
                background: "#FFFFFF",
                borderColor: "#E2E8F0",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}
            >
              <div className="px-3 py-2 border-b mb-1" style={{ borderColor: "#F1F5F9" }}>
                <div style={{ color: "#1E293B", fontSize: "0.8rem", fontWeight: 600 }}>{profile?.name || "使用者"}</div>
                <div style={{ color: "#94A3B8", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || ""}</div>
              </div>
              {[
                { icon: User, label: "個人資料" },
                { icon: Settings, label: "帳號設定" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-2 w-full px-3 py-2 transition-colors"
                  style={{ color: "#475569", fontSize: "0.8rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              <div className="border-t mt-1 pt-1" style={{ borderColor: "#F1F5F9" }}>
                <button
                  onClick={async () => {
                    const { supabase } = await import("../../../lib/supabase");
                    await supabase.auth.signOut();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 transition-colors"
                  style={{ color: "#DC2626", fontSize: "0.8rem", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <LogOut size={14} />
                  登出帳號
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
