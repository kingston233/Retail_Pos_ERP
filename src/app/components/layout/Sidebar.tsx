import { NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  BarChart2,
  Users,
  HelpCircle,
  LogOut,
  Store,
  Receipt,
  Compass,
  Activity,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  notificationCount?: number;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, notificationCount = 3, isMobile = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const roleCode = profile?.role_code ?? 1;

  // Track which accordion groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "數位化門市管理": true,
    "銷售預測與決策": false,
    "結帳區排隊監測": false,
    "顧客行為感知": false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Analytics items visible per role
  const analyticsBasic = [
    { path: "/analytics", label: "銷售分析", icon: BarChart2 },
    { path: "/customers", label: "顧客洞察", icon: Users },
  ];
  const analyticsAdvanced = [
    { path: "/behavior", label: "顧客行為感知", icon: Compass },
    { path: "/queue", label: "結帳區排隊監測", icon: Activity },
    { path: "/forecast", label: "銷售預測與決策", icon: TrendingUp },
  ];
  const visibleAnalytics =
    roleCode === 1
      ? []
      : roleCode === 2
      ? analyticsBasic
      : [...analyticsBasic, ...analyticsAdvanced];

  // Advanced analytics items as accordion parents (role 0 only)
  const advancedAccordion =
    roleCode === 0
      ? [
          {
            key: "顧客行為感知",
            icon: Compass,
            children: [{ path: "/behavior", label: "查看詳情" }],
          },
          {
            key: "結帳區排隊監測",
            icon: Activity,
            children: [{ path: "/queue", label: "查看詳情" }],
          },
          {
            key: "銷售預測與決策",
            icon: TrendingUp,
            children: [{ path: "/forecast", label: "查看詳情" }],
          },
        ]
      : [];

  const systemItems = [
    { path: "/alerts", label: "警示中心", icon: Bell, badge: true },
    { path: "/settings", label: "系統設定", icon: Settings },
  ];

  const mainChildren = [
    { path: "/dashboard", label: "營運儀表板", icon: LayoutDashboard },
    { path: "/pos", label: "POS 收銀", icon: ShoppingCart },
    { path: "/transactions", label: "交易明細", icon: Receipt },
    { path: "/inventory", label: "庫存管理", icon: Package },
  ];

  const renderNavLink = (
    path: string,
    label: string,
    Icon: React.ElementType,
    badge?: boolean,
    indent?: boolean
  ) => {
    const isActive = location.pathname === path;
    return (
      <NavLink
        key={path}
        to={path}
        onClick={() => isMobile && onMobileClose?.()}
        className="flex items-center gap-3 mx-2 mb-0.5 rounded-lg transition-all duration-150 relative"
        style={{
          padding: collapsed ? "10px 0" : indent ? "8px 12px 8px 32px" : "9px 12px",
          justifyContent: collapsed ? "center" : "flex-start",
          background: isActive ? "rgba(99, 102, 241, 0.18)" : "transparent",
          color: isActive ? "#FFFFFF" : "#94A3B8",
          textDecoration: "none",
        }}
        title={collapsed ? label : undefined}
      >
        <div className="relative flex-shrink-0">
          <Icon size={indent ? 14 : 18} style={{ color: isActive ? "#818CF8" : indent ? "#475569" : "#64748B" }} />
          {badge && notificationCount > 0 && (
            <span
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: "-5px",
                right: "-5px",
                width: "14px",
                height: "14px",
                background: "#DC2626",
                color: "#FFFFFF",
                fontSize: "0.6rem",
                fontWeight: 700,
              }}
            >
              {notificationCount}
            </span>
          )}
        </div>
        {!collapsed && (
          <span style={{ fontSize: indent ? "0.75rem" : "0.8rem", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap", color: indent ? "#64748B" : undefined }}>
            {label}
          </span>
        )}
        {isActive && (
          <div
            className="absolute left-0 rounded-r"
            style={{ width: "3px", height: "60%", top: "20%", background: "#818CF8" }}
          />
        )}
      </NavLink>
    );
  };

  const renderAccordion = (
    key: string,
    Icon: React.ElementType,
    children: { path: string; label: string }[]
  ) => {
    const isOpen = openGroups[key];
    const anyChildActive = children.some(c => location.pathname === c.path);

    return (
      <div key={key}>
        <button
          onClick={() => toggleGroup(key)}
          className="flex items-center gap-3 mx-2 mb-0.5 rounded-lg transition-all duration-150 relative w-full"
          style={{
            padding: collapsed ? "10px 0" : "9px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: anyChildActive ? "rgba(99, 102, 241, 0.12)" : "transparent",
            color: anyChildActive ? "#FFFFFF" : "#94A3B8",
            border: "none",
            cursor: "pointer",
            width: "calc(100% - 16px)",
          }}
          title={collapsed ? key : undefined}
        >
          <Icon
            size={18}
            style={{ color: anyChildActive ? "#818CF8" : "#64748B", flexShrink: 0 }}
          />
          {!collapsed && (
            <>
              <span style={{ fontSize: "0.8rem", fontWeight: anyChildActive ? 600 : 400, whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
                {key}
              </span>
              <ChevronDown
                size={14}
                style={{
                  color: "#475569",
                  transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.2s ease",
                  flexShrink: 0,
                }}
              />
            </>
          )}
        </button>

        {/* Animated children */}
        <div
          style={{
            maxHeight: isOpen && !collapsed ? `${children.length * 44}px` : "0px",
            overflow: "hidden",
            transition: "max-height 0.25s ease",
          }}
        >
          {children.map(child => (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={() => isMobile && onMobileClose?.()}
              className="flex items-center gap-2 mx-2 mb-0.5 rounded-lg transition-all duration-150"
              style={{
                padding: "7px 12px 7px 36px",
                background: location.pathname === child.path ? "rgba(99, 102, 241, 0.18)" : "transparent",
                color: location.pathname === child.path ? "#818CF8" : "#64748B",
                textDecoration: "none",
                fontSize: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: location.pathname === child.path ? "#818CF8" : "#334155",
                  flexShrink: 0,
                }}
              />
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  };

  const mobileStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        height: "100%",
        width: "240px",
        zIndex: 50,
        transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease",
        background: "#0F172A",
        borderRight: "1px solid #1E293B",
        flexShrink: 0,
      }
    : {
        width: collapsed ? "64px" : "240px",
        background: "#0F172A",
        borderRight: "1px solid #1E293B",
        flexShrink: 0,
      };

  return (
    <aside
      className="relative flex flex-col h-full transition-all duration-300 ease-in-out"
      style={mobileStyle}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 border-b"
        style={{ height: "64px", borderColor: "#1E293B", overflow: "hidden" }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
          }}
        >
          <Zap size={18} color="#FFFFFF" />
        </div>
        {!collapsed && (
          <div className="flex flex-col" style={{ overflow: "hidden" }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>
              RetailAI
            </span>
            <span style={{ color: "#64748B", fontSize: "0.7rem", lineHeight: 1 }}>
              智慧零售生態系
            </span>
          </div>
        )}
      </div>

      {/* Store info */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#1E293B" }}>
          <div
            className="flex items-center justify-center rounded-md flex-shrink-0"
            style={{ width: "28px", height: "28px", background: "#1E293B" }}
          >
            <Store size={14} color="#818CF8" />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ color: "#CBD5E1", fontSize: "0.75rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              全家便利商店
            </div>
            <div style={{ color: "#475569", fontSize: "0.65rem" }}>信義旗艦店</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ overflowX: "hidden" }}>

        {/* ── 數位化門市管理 Accordion ── */}
        {renderAccordion("數位化門市管理", Building2, mainChildren.map(i => ({ path: i.path, label: i.label })))}

        {/* ── 智慧分析 Section (basic items: 銷售分析 / 顧客洞察) ── */}
        {visibleAnalytics.length > 0 && (
          <div className="mt-1">
            {!collapsed && (
              <div
                className="px-4 py-1 mb-1"
                style={{ color: "#334155", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
              >
                智慧分析
              </div>
            )}
            {analyticsBasic
              .filter(i => visibleAnalytics.some(v => v.path === i.path))
              .map(item => renderNavLink(item.path, item.label, item.icon))}
          </div>
        )}

        {/* ── Advanced analytics as accordion (role 0 only) ── */}
        {advancedAccordion.length > 0 && (
          <div className="mt-1">
            {advancedAccordion.map(item =>
              renderAccordion(item.key, item.icon, item.children)
            )}
          </div>
        )}

        {/* ── 系統管理 ── */}
        <div className="mt-1">
          {!collapsed && (
            <div
              className="px-4 py-1 mb-1"
              style={{ color: "#334155", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              系統管理
            </div>
          )}
          {systemItems.map(item => renderNavLink(item.path, item.label, item.icon, item.badge))}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="border-t py-2" style={{ borderColor: "#1E293B" }}>
        <button
          className="flex items-center gap-3 w-full mx-2 rounded-lg transition-all duration-150"
          style={{
            padding: collapsed ? "9px 0" : "9px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "#64748B",
            width: "calc(100% - 16px)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          title={collapsed ? "說明" : undefined}
        >
          <HelpCircle size={17} />
          {!collapsed && <span style={{ fontSize: "0.8rem" }}>說明與支援</span>}
        </button>
        <button
          onClick={async () => {
            const { supabase } = await import("../../../lib/supabase");
            await supabase.auth.signOut();
          }}
          className="flex items-center gap-3 w-full mx-2 rounded-lg transition-all duration-150"
          style={{
            padding: collapsed ? "9px 0" : "9px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "#64748B",
            width: "calc(100% - 16px)",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          title={collapsed ? "登出" : undefined}
        >
          <LogOut size={17} />
          {!collapsed && <span style={{ fontSize: "0.8rem" }}>登出帳號</span>}
        </button>
      </div>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="absolute flex items-center justify-center rounded-full border transition-all duration-200"
          style={{
            top: "76px",
            right: "-12px",
            width: "24px",
            height: "24px",
            background: "#1E293B",
            borderColor: "#334155",
            color: "#94A3B8",
            zIndex: 10,
            cursor: "pointer",
          }}
          aria-label={collapsed ? "展開側欄" : "收合側欄"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      )}
    </aside>
  );
}
