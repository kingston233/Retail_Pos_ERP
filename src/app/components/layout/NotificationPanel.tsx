import { X, AlertTriangle, Users, Package, TrendingUp, CheckCircle, Clock } from "lucide-react";

interface Notification {
  id: string;
  type: "danger" | "warning" | "info" | "success";
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: string;
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "danger",
    title: "庫存嚴重不足",
    message: "礦泉水 (550ml) 剩餘 3 件，低於安全庫存閾值 (20件)",
    time: "2 分鐘前",
    read: false,
    category: "庫存警示",
  },
  {
    id: "2",
    type: "danger",
    title: "排隊人數超載",
    message: "YOLOv8 邊緣運算偵測：結帳區現有 12 人排隊，超過上限 (8人)",
    time: "5 分鐘前",
    read: false,
    category: "客流警示",
  },
  {
    id: "3",
    type: "warning",
    title: "商品即將到期",
    message: "關東煮系列 5 項商品將於 2 天內到期，建議啟動 AI 折扣",
    time: "18 分鐘前",
    read: false,
    category: "效期警示",
  },
  {
    id: "4",
    type: "info",
    title: "AI 動態定價已啟動",
    message: "系統已對 8 項商品自動調整定價，預計提升今日營收 12%",
    time: "42 分鐘前",
    read: true,
    category: "AI 通知",
  },
  {
    id: "5",
    type: "success",
    title: "進貨訂單已確認",
    message: "供應商「統一企業」已確認今日下午 3:00 送達 24 項商品",
    time: "1 小時前",
    read: true,
    category: "進貨通知",
  },
  {
    id: "6",
    type: "warning",
    title: "銷量預測異常",
    message: "ML 模型預測明日飲料類銷量將暴增 45%，建議提前備貨",
    time: "2 小時前",
    read: true,
    category: "AI 通知",
  },
  {
    id: "7",
    type: "success",
    title: "今日目標達成",
    message: "今日累積營業額已達 NT$68,420，達成日目標 103%",
    time: "3 小時前",
    read: true,
    category: "業績通知",
  },
];

const typeConfig = {
  danger: {
    icon: AlertTriangle,
    iconColor: "#DC2626",
    bg: "#FEF2F2",
    badge: "#FEE2E2",
    badgeText: "#DC2626",
    border: "#FECACA",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "#D97706",
    bg: "#FFFBEB",
    badge: "#FEF3C7",
    badgeText: "#D97706",
    border: "#FDE68A",
  },
  info: {
    icon: TrendingUp,
    iconColor: "#0284C7",
    bg: "#F0F9FF",
    badge: "#E0F2FE",
    badgeText: "#0284C7",
    border: "#BAE6FD",
  },
  success: {
    icon: CheckCircle,
    iconColor: "#059669",
    bg: "#ECFDF5",
    badge: "#D1FAE5",
    badgeText: "#059669",
    border: "#A7F3D0",
  },
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)" }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full flex flex-col z-50 transition-transform duration-300 ease-in-out"
        style={{
          width: "min(400px, 100vw)",
          background: "#FFFFFF",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 border-b"
          style={{ height: "64px", borderColor: "#E2E8F0", flexShrink: 0 }}
        >
          <div className="flex items-center gap-3">
            <h2 style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 600 }}>
              通知中心
            </h2>
            {unreadCount > 0 && (
              <span
                className="flex items-center justify-center rounded-full px-2"
                style={{
                  height: "20px",
                  minWidth: "20px",
                  background: "#DC2626",
                  color: "#FFFFFF",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: "32px",
              height: "32px",
              color: "#64748B",
              background: "transparent",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter tabs */}
        <div
          className="flex items-center gap-2 px-5 py-3 border-b"
          style={{ borderColor: "#E2E8F0", flexShrink: 0 }}
        >
          {["全部", "未讀", "警示", "AI 通知"].map((tab, i) => (
            <button
              key={tab}
              className="px-3 rounded-full transition-colors"
              style={{
                height: "28px",
                fontSize: "0.75rem",
                fontWeight: i === 0 ? 600 : 400,
                background: i === 0 ? "#4F46E5" : "#F1F5F9",
                color: i === 0 ? "#FFFFFF" : "#64748B",
                border: "none",
                cursor: "pointer",
              }}
            >
              {tab}
            </button>
          ))}
          <button
            className="ml-auto"
            style={{ color: "#4F46E5", fontSize: "0.75rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
          >
            全部標為已讀
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto py-2 px-4">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type];
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className="flex gap-3 p-3 mb-2 rounded-xl border cursor-pointer transition-all"
                style={{
                  background: notif.read ? "#FFFFFF" : config.bg,
                  borderColor: notif.read ? "#E2E8F0" : config.border,
                  opacity: notif.read ? 0.85 : 1,
                }}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    background: config.badge,
                    marginTop: "2px",
                  }}
                >
                  <Icon size={17} style={{ color: config.iconColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div
                      style={{
                        color: "#1E293B",
                        fontSize: "0.8rem",
                        fontWeight: notif.read ? 500 : 700,
                        lineHeight: 1.3,
                      }}
                    >
                      {notif.title}
                      {!notif.read && (
                        <span
                          className="inline-block rounded-full ml-2"
                          style={{ width: "6px", height: "6px", background: config.iconColor, verticalAlign: "middle" }}
                        />
                      )}
                    </div>
                  </div>
                  <p
                    style={{
                      color: "#64748B",
                      fontSize: "0.72rem",
                      lineHeight: 1.45,
                      marginBottom: "6px",
                    }}
                  >
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 rounded-full"
                      style={{
                        background: config.badge,
                        color: config.badgeText,
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        padding: "2px 6px",
                      }}
                    >
                      {notif.category}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      style={{ color: "#94A3B8", fontSize: "0.68rem" }}
                    >
                      <Clock size={10} />
                      {notif.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="border-t px-5 py-4 text-center"
          style={{ borderColor: "#E2E8F0", flexShrink: 0 }}
        >
          <button
            style={{
              color: "#4F46E5",
              fontSize: "0.8rem",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            查看所有通知記錄 →
          </button>
        </div>
      </div>
    </>
  );
}
