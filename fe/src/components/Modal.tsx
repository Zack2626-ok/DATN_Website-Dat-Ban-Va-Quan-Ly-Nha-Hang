import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "dark" | "light";
}

/**
 * Modal - Reusable premium dialog component with dark glass design
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  theme = "dark",
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  const isLight = theme === "light";

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div
        className={`relative w-full ${sizeClasses[size]} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-[10000] border ${
          isLight
            ? "bg-white border-slate-200 text-admin-text-main"
            : "glass bg-brand-dark-light/95 border-white/10 text-zinc-200"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-5 border-b ${
            isLight ? "border-slate-100" : "border-white/10"
          }`}
        >
          <h3
            className={`text-xl font-bold tracking-wide font-display ${
              isLight ? "text-admin-primary" : "text-brand-primary"
            }`}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          className={`flex-1 overflow-y-auto px-6 py-5 scrollbar ${
            isLight ? "text-admin-text-main" : "text-zinc-200"
          }`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
              isLight ? "bg-slate-50 border-slate-100" : "bg-black/40 border-white/10"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};
