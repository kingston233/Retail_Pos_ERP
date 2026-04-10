import { NavLink, useLocation } from "react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart2,
  Users,
  HelpCircle,
  LogOut,
  Store,
  Receipt,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  notificationCount?: number;
}

const navItems = [
  {
    group: "主要功能",
    items: [
      { path: "/dashboard", label: "營運儀表板", icon: LayoutDashboard },
      { path: "/pos", label: "POS 收銀", icon: ShoppingCart },
      { path: "/transactions", label: "交易明細", icon: Receipt },
      { path: "/inventory", label: "庫存管理", icon: Package },
    ],
  },
  {
    group: "智慧分析",
    items: [
      { path: "/analytics", label: "銷售分析", icon: BarChart2 },
      { path: "/customers", label: "顧客洞察", icon: Users },
    ],
  },
  {
    group: "系統管理",
    items: [
      { path: "/alerts", label: "警示中心", icon: Bell, badge: true },
      { path: "/settings", label: "系統設定", icon: Settings },
    ],
  },
];

export function Sidebar({ collapsed, onToggle, notificationCount = 3 }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className="relative flex flex-col h-full transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? "64px" : "240px",
        background: "#0F172A",
        borderRight: "1px solid #1E293B",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 border-b"
        style={{
          height: "64px",
          borderColor: "#1E293B",
          overflow: "hidden",
        }}
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
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: "#1E293B" }}
        >
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
        {navItems.map((group) => (
          <div key={group.group} className="mb-1">
            {!collapsed && (
              <div
                className="px-4 py-1 mb-1"
                style={{ color: "#334155", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
              >
                {group.group}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 mx-2 mb-0.5 rounded-lg transition-all duration-150 relative"
                  style={{
                    padding: collapsed ? "10px 0" : "9px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    background: isActive ? "rgba(99, 102, 241, 0.18)" : "transparent",
                    color: isActive ? "#FFFFFF" : "#94A3B8",
                    textDecoration: "none",
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <Icon
                      size={18}
                      style={{ color: isActive ? "#818CF8" : "#64748B" }}
                    />
                    {item.badge && notificationCount > 0 && (
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
                    <span style={{ fontSize: "0.8rem", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>
                      {item.label}
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
            })}
            {!collapsed && <div style={{ height: "4px" }} />}
          </div>
        ))}
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
          }}
          title={collapsed ? "說明" : undefined}
        >
          <HelpCircle size={17} />
          {!collapsed && <span style={{ fontSize: "0.8rem" }}>說明與支援</span>}
        </button>
        <button
          className="flex items-center gap-3 w-full mx-2 rounded-lg transition-all duration-150"
          style={{
            padding: collapsed ? "9px 0" : "9px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "#64748B",
            width: "calc(100% - 16px)",
          }}
          title={collapsed ? "登出" : undefined}
        >
          <LogOut size={17} />
          {!collapsed && <span style={{ fontSize: "0.8rem" }}>登出帳號</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
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
    </aside>
  );
}
