import toast from "react-hot-toast";
import { Sparkles, AlertTriangle, Info, X } from "lucide-react";

export const showClientToast = {
  success: (title: string, message?: string) => {
    return toast.custom((t) => (
      <div
        className={`${
          t.visible ? "animate-fade-in translate-y-0 opacity-100" : "opacity-0 -translate-y-2"
        } transition-all duration-300 max-w-sm sm:max-w-md w-full bg-[#1C1815]/95 backdrop-blur-md text-white shadow-2xl rounded-2xl pointer-events-auto flex border border-[#dfb05b]/40 p-4 items-start gap-3.5 z-50`}
      >
        <div className="rounded-xl bg-[#a72d1e]/40 border border-[#dfb05b]/30 p-2 text-[#dfb05b] shrink-0 shadow-xs">
          <Sparkles size={18} className="animate-pulse text-[#dfb05b]" />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#dfb05b]">
            {title}
          </h4>
          {message && (
            <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    ), { duration: 4000, position: "top-right" });
  },

  error: (title: string, message?: string) => {
    return toast.custom((t) => (
      <div
        className={`${
          t.visible ? "animate-fade-in translate-y-0 opacity-100" : "opacity-0 -translate-y-2"
        } transition-all duration-300 max-w-sm sm:max-w-md w-full bg-[#1C1815]/95 backdrop-blur-md text-white shadow-2xl rounded-2xl pointer-events-auto flex border border-rose-500/40 p-4 items-start gap-3.5 z-50`}
      >
        <div className="rounded-xl bg-rose-500/20 border border-rose-500/40 p-2 text-rose-400 shrink-0">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">
            {title}
          </h4>
          {message && (
            <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    ), { duration: 4500, position: "top-right" });
  },

  info: (title: string, message?: string) => {
    return toast.custom((t) => (
      <div
        className={`${
          t.visible ? "animate-fade-in translate-y-0 opacity-100" : "opacity-0 -translate-y-2"
        } transition-all duration-300 max-w-sm sm:max-w-md w-full bg-[#1C1815]/95 backdrop-blur-md text-white shadow-2xl rounded-2xl pointer-events-auto flex border border-sky-500/40 p-4 items-start gap-3.5 z-50`}
      >
        <div className="rounded-xl bg-sky-500/20 border border-sky-500/40 p-2 text-sky-400 shrink-0">
          <Info size={18} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-sky-400">
            {title}
          </h4>
          {message && (
            <p className="mt-1 text-xs text-slate-200 leading-relaxed font-medium">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
          aria-label="Đóng"
        >
          <X size={14} />
        </button>
      </div>
    ), { duration: 3500, position: "top-right" });
  },
};
