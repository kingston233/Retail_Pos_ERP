import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router";
import { Toaster, toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NotificationPanel } from "./NotificationPanel";
import { supabase } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export function AppLayout() {
  const { user, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    // 訂閱 PostgreSQL 的 alerts 表 INSERT 事件
    const channel = supabase
      .channel("public:alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload: any) => {
          const alert = payload.new;
          // 按嚴重程度選擇不同的 Toast 樣式
          if (alert.type === "critical") {
            toast.error(`🚨 ${alert.title}`, { description: alert.detail, duration: 8000 });
          } else if (alert.type === "warning") {
            toast.warning(`⚠️ ${alert.title}`, { description: alert.detail, duration: 5000 });
          } else if (alert.type === "success") {
            toast.success(`✅ ${alert.title}`, { description: alert.detail, duration: 4000 });
          } else {
            toast.info(`ℹ️ ${alert.title}`, { description: alert.detail, duration: 4000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center" style={{ background: "#F1F5F9" }}>載入中...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F1F5F9" }}>
      <Toaster position="bottom-right" expand={true} richColors />

      {/* Mobile backdrop */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        notificationCount={3}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar
          onNotificationClick={() => setNotificationOpen(true)}
          notificationCount={3}
          isMobile={isMobile}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
}
