import React, { useEffect, useState, useMemo } from "react";
import { useToaster, toast, Toast } from "react-hot-toast";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  CalendarCheck,
  Lock,
} from "lucide-react";
// Inlined lightweight Web Audio API Sound Synthesizer (No external audio file dependencies)
class ToastSoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem("app_sound_enabled");
      if (stored !== null) this.soundEnabled = stored === "true";
    } catch {
      this.soundEnabled = true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playSuccess(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const frequencies = [587.33, 739.99, 880];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.05);
        gain.gain.setValueAtTime(0, now + index * 0.05);
        gain.gain.linearRampToValueAtTime(0.08 / (index + 1), now + index * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.05 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.05);
        osc.stop(now + index * 0.05 + 0.45);
      });
    } catch {}
  }

  public playError(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(240, now + 0.2);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  public playAlert(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch {}
  }
}

const soundFx = new ToastSoundManager();

export const AppToaster: React.FC = () => {
  const { toasts, handlers } = useToaster({
    duration: 4000,
  });

  return (
    <div
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full px-3"
      onMouseEnter={handlers.startPause}
      onMouseLeave={handlers.endPause}
    >
      {toasts
        .filter((t) => t.visible)
        .map((t) => (
          <ToastCardItem key={t.id} toastItem={t} />
        ))}
    </div>
  );
};

const ToastCardItem: React.FC<{ toastItem: Toast }> = ({ toastItem }) => {
  // Check if current route is a staff/management route
  const isStaffRoute =
    typeof window !== "undefined" &&
    /^\/(manager|admin|cashier|chef|waiter)/i.test(window.location.pathname);

  const rawMessage =
    typeof toastItem.message === "function"
      ? toastItem.message(toastItem)
      : toastItem.message;

  const duration = toastItem.duration || 4000;
  const [progress, setProgress] = useState(100);

  // Smooth progress bar countdown
  useEffect(() => {
    if (toastItem.type === "loading" || duration === Infinity) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [duration, toastItem.type]);

  // Sound effect for client side
  useEffect(() => {
    if (!isStaffRoute) {
      if (toastItem.type === "success") {
        soundFx.playSuccess();
      } else if (toastItem.type === "error") {
        soundFx.playError();
      } else if (toastItem.type === "loading") {
        // quiet
      } else {
        soundFx.playAlert();
      }
    }
  }, [toastItem.type, isStaffRoute]);

  // If in staff/management back-office, preserve the standard concise toast style
  if (isStaffRoute) {
    const isError = toastItem.type === "error";
    return (
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1C1815] text-white border shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-top-3 ${isError ? "border-rose-500/40" : "border-[#DFB05B]/35"
          }`}
        style={{
          boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.5)",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        <div className="shrink-0">
          {toastItem.type === "loading" ? (
            <Loader2 className="w-5 h-5 text-[#DFB05B] animate-spin" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[#DFB05B]" />
          )}
        </div>
        <div className="flex-1 text-sm font-medium">
          {typeof rawMessage === "string" ? rawMessage : "Thông báo hệ thống"}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(toastItem.id)}
          className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // --- CLIENT-SIDE LUXURY SOPHISTICATED NOTIFICATION ---
  const messageStr = typeof rawMessage === "string" ? rawMessage : "";

  // Derive smart title & subtitle based on message context
  const { title, subtitle, badge, icon, themeStyles } = useMemo(() => {
    const lower = messageStr.toLowerCase();
    const type = toastItem.type;

    if (type === "loading") {
      return {
        title: "Đang xử lý yêu cầu...",
        subtitle: messageStr || "Vui lòng chờ trong giây lát",
        badge: "Đang tải",
        icon: <Loader2 className="w-5 h-5 text-[#DFB05B] animate-spin" />,
        themeStyles: {
          border: "border-[#DFB05B]/40",
          glow: "shadow-[0_16px_40px_-10px_rgba(223,176,91,0.25)]",
          badgeBg: "bg-[#DFB05B]/15 text-[#DFB05B] border-[#DFB05B]/30",
          iconBg: "bg-[#DFB05B]/20 border-[#DFB05B]/35",
          progressBar: "bg-gradient-to-r from-amber-600 to-[#DFB05B]",
        },
      };
    }

    if (
      type === "error" ||
      lower.includes("thất bại") ||
      lower.includes("lỗi") ||
      lower.includes("không thể")
    ) {
      return {
        title: "Thông báo không thành công",
        subtitle: messageStr || "Đã có lỗi xảy ra trong quá trình xử lý.",
        badge: "Cần chú ý",
        icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
        themeStyles: {
          border: "border-rose-500/40",
          glow: "shadow-[0_16px_40px_-10px_rgba(244,63,94,0.3)]",
          badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
          iconBg: "bg-rose-500/20 border-rose-500/35",
          progressBar: "bg-gradient-to-r from-rose-600 to-red-400",
        },
      };
    }

    // Contextual Successes
    if (lower.includes("mật khẩu")) {
      return {
        title: "Bảo mật tài khoản",
        subtitle: messageStr,
        badge: "Mật khẩu",
        icon: <Lock className="w-5 h-5 text-[#DFB05B]" />,
        themeStyles: {
          border: "border-[#DFB05B]/40",
          glow: "shadow-[0_16px_40px_-10px_rgba(223,176,91,0.3)]",
          badgeBg: "bg-[#DFB05B]/20 text-[#DFB05B] border-[#DFB05B]/35",
          iconBg: "bg-[#DFB05B]/20 border-[#DFB05B]/35",
          progressBar: "bg-gradient-to-r from-amber-600 via-[#DFB05B] to-amber-200",
        },
      };
    }

    if (lower.includes("đặt bàn") || lower.includes("bàn")) {
      return {
        title: "Dịch vụ Đặt bàn",
        subtitle: messageStr,
        badge: "Đặt bàn",
        icon: <CalendarCheck className="w-5 h-5 text-[#DFB05B]" />,
        themeStyles: {
          border: "border-[#DFB05B]/40",
          glow: "shadow-[0_16px_40px_-10px_rgba(223,176,91,0.3)]",
          badgeBg: "bg-[#DFB05B]/20 text-[#DFB05B] border-[#DFB05B]/35",
          iconBg: "bg-[#DFB05B]/20 border-[#DFB05B]/35",
          progressBar: "bg-gradient-to-r from-amber-600 via-[#DFB05B] to-amber-200",
        },
      };
    }

    if (
      lower.includes("hồ sơ") ||
      lower.includes("thông tin") ||
      lower.includes("tài khoản")
    ) {
      return {
        title: "Cập nhật tài khoản",
        subtitle: messageStr,
        badge: "Hội viên",
        icon: <ShieldCheck className="w-5 h-5 text-[#DFB05B]" />,
        themeStyles: {
          border: "border-[#DFB05B]/40",
          glow: "shadow-[0_16px_40px_-10px_rgba(223,176,91,0.3)]",
          badgeBg: "bg-[#DFB05B]/20 text-[#DFB05B] border-[#DFB05B]/35",
          iconBg: "bg-[#DFB05B]/20 border-[#DFB05B]/35",
          progressBar: "bg-gradient-to-r from-amber-600 via-[#DFB05B] to-amber-200",
        },
      };
    }

    // Default Fine Dining Success
    return {
      title: "Thao tác thành công",
      subtitle: messageStr || "Yêu cầu của bạn đã được thực hiện thành công.",
      badge: "Hệ thống",
      icon: <CheckCircle2 className="w-5 h-5 text-[#DFB05B]" />,
      themeStyles: {
        border: "border-[#DFB05B]/40",
        glow: "shadow-[0_16px_40px_-10px_rgba(223,176,91,0.3)]",
        badgeBg: "bg-[#DFB05B]/20 text-[#DFB05B] border-[#DFB05B]/35",
        iconBg: "bg-[#DFB05B]/20 border-[#DFB05B]/35",
        progressBar: "bg-gradient-to-r from-amber-600 via-[#DFB05B] to-amber-200",
      },
    };
  }, [messageStr, toastItem.type]);

  const currentTime = useMemo(() => {
    return new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-[#181412]/95 backdrop-blur-xl border ${themeStyles.border} ${themeStyles.glow} text-white transition-all duration-300 hover:scale-[1.01] hover:bg-[#1E1916]/98 animate-in fade-in slide-in-from-top-4`}
      style={{
        boxShadow:
          "0 25px 45px -12px rgba(0, 0, 0, 0.75), 0 0 25px -5px rgba(223, 176, 91, 0.18)",
      }}
    >
      {/* Top subtle luxury sheen highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#DFB05B]/40 to-transparent" />

      {/* Main notification container */}
      <div className="p-4">
        {/* Upper metadata row */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${themeStyles.badgeBg}`}
            >
              {badge}
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              {currentTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toast.dismiss(toastItem.id)}
            className="p-1 -mr-1 -my-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content row with Icon and rich text */}
        <div className="flex items-start gap-3.5 pt-0.5">
          {/* Icon Badge */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${themeStyles.iconBg} shadow-inner mt-0.5`}
          >
            {icon}
          </div>

          {/* Texts */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#FAF7F2] tracking-tight leading-snug">
              {title}
            </h4>
            <p className="text-xs text-[#CFC5B8] mt-1 leading-relaxed break-words font-medium">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Countdown Progress Bar */}
      {toastItem.type !== "loading" && duration !== Infinity && (
        <div className="h-[3px] w-full bg-white/5 overflow-hidden">
          <div
            className={`h-full ${themeStyles.progressBar} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
