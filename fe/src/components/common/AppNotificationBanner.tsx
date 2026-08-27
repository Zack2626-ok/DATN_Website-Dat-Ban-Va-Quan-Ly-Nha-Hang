import React, { useEffect } from "react";
import { X, CheckCircle, Info, AlertTriangle, CreditCard, Utensils } from "lucide-react";

export interface AppNotification {
  id: string;
  type?: "info" | "success" | "warning" | "payment" | "food";
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  autoCloseMs?: number;
}

interface AppNotificationBannerProps {
  notifications: AppNotification[];
  onClose: (id: string) => void;
}

export const AppNotificationBanner: React.FC<AppNotificationBannerProps> = ({
  notifications,
  onClose,
}) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-3">
      {notifications.map((item) => (
        <SingleNotificationCard key={item.id} item={item} onClose={onClose} />
      ))}
    </div>
  );
};

const SingleNotificationCard: React.FC<{
  item: AppNotification;
  onClose: (id: string) => void;
}> = ({ item, onClose }) => {
  const { id, type = "info", title, message, actionText, onAction, autoCloseMs = 4000 } = item;

  useEffect(() => {
    if (autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [id, autoCloseMs, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="text-emerald-500 shrink-0" size={20} />;
      case "payment":
        return <CreditCard className="text-amber-500 shrink-0 animate-bounce" size={20} />;
      case "food":
        return <Utensils className="text-orange-500 shrink-0 animate-pulse" size={20} />;
      case "warning":
        return <AlertTriangle className="text-rose-500 shrink-0" size={20} />;
      default:
        return <Info className="text-sky-500 shrink-0" size={20} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "border-emerald-300 bg-emerald-50/95 text-emerald-950 shadow-emerald-500/10";
      case "payment":
        return "border-amber-300 bg-amber-50/95 text-amber-950 shadow-amber-500/10";
      case "food":
        return "border-orange-300 bg-orange-50/95 text-orange-950 shadow-orange-500/10";
      case "warning":
        return "border-rose-300 bg-rose-50/95 text-rose-950 shadow-rose-500/10";
      default:
        return "border-sky-300 bg-sky-50/95 text-sky-950 shadow-sky-500/10";
    }
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${getBorderColor()}`}
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black tracking-tight leading-snug">{title}</div>
        {message && <div className="text-[11px] opacity-85 mt-0.5 line-clamp-2 leading-relaxed">{message}</div>}
        {actionText && onAction && (
          <button
            onClick={() => {
              onAction();
              onClose(id);
            }}
            className="mt-2 text-[11px] font-black px-3 py-1 rounded-lg bg-white/80 hover:bg-white border border-black/10 shadow-xs cursor-pointer transition-colors active:scale-95 flex items-center gap-1"
          >
            {actionText} →
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="p-1 rounded-full hover:bg-black/10 transition-colors text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
        title="Đóng thông báo"
      >
        <X size={15} />
      </button>
    </div>
  );
};
