import React from "react";
import { ORDER_STATUS, OrderStatus } from "../constants/orderStatus";
import { TABLE_STATUS, TableStatus } from "../constants/tableStatus";

interface BadgeProps {
  status: OrderStatus | TableStatus | "pending" | "completed";
  type?: "order" | "table" | "booking";
  className?: string;
  theme?: "dark" | "light";
}

/**
 * Badge - Renders formatted state pill with micro-animations and status colors
 */
export const Badge: React.FC<BadgeProps> = ({ status, type = "order", className = "", theme = "dark" }) => {
  const getStyles = () => {
    const isLight = theme === "light";
    if (type === "booking") {
      switch (status) {
        case "pending":
          return {
            bg: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-sky-50 border-sky-100 text-sky-700",
            dot: isLight ? "bg-amber-500" : "bg-amber-400 animate-pulse",
            label: "Chờ xác nhận",
          };
        case "confirmed":
          return {
            bg: isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            dot: isLight ? "bg-emerald-500" : "bg-emerald-400",
            label: "Đã xác nhận",
          };
        case "completed":
          return {
            bg: isLight ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-blue-500/10 border-blue-500/20 text-blue-400",
            dot: isLight ? "bg-blue-500" : "bg-blue-400",
            label: "Đã đến",
          };
        case "cancelled":
          return {
            bg: isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/10 border-rose-500/20 text-rose-400",
            dot: isLight ? "bg-rose-500" : "bg-rose-400",
            label: "Đã hủy",
          };
        default:
          return {
            bg: isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-sky-50/500/10 border-gray-500/20 text-gray-400",
            dot: isLight ? "bg-slate-500" : "bg-gray-400",
            label: status,
          };
      }
    } else if (type === "table") {
      switch (status) {
        case TABLE_STATUS.AVAILABLE:
          return {
            bg: isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            dot: isLight ? "bg-emerald-500" : "bg-emerald-400 animate-pulse",
            label: "Trống",
          };
        case TABLE_STATUS.RESERVED:
          return {
            bg: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-sky-50 border-sky-100 text-sky-700",
            dot: isLight ? "bg-amber-500" : "bg-amber-400",
            label: "Đã đặt",
          };
        case TABLE_STATUS.OCCUPIED:
          return {
            bg: isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/10 border-rose-500/20 text-rose-400",
            dot: isLight ? "bg-rose-500" : "bg-rose-400",
            label: "Đang phục vụ",
          };
        case TABLE_STATUS.CLEANING:
          return {
            bg: isLight ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-blue-500/10 border-blue-500/20 text-blue-400",
            dot: isLight ? "bg-blue-500" : "bg-blue-400 animate-bounce",
            label: "Chờ thanh toán",
          };
        default:
          return {
            bg: isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-sky-50/500/10 border-gray-500/20 text-gray-400",
            dot: isLight ? "bg-slate-500" : "bg-gray-400",
            label: status,
          };
      }
    } else {
      switch (status) {
        case ORDER_STATUS.DRAFT:
          return {
            bg: isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
            dot: isLight ? "bg-slate-400" : "bg-zinc-400",
            label: "Nháp",
          };
        case ORDER_STATUS.CONFIRMED:
          return {
            bg: isLight ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
            dot: isLight ? "bg-indigo-500" : "bg-indigo-400 animate-ping",
            label: "Chờ xác nhận",
          };
        case ORDER_STATUS.IN_KITCHEN:
          return {
            bg: isLight ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-orange-500/10 border-orange-500/20 text-orange-400",
            dot: isLight ? "bg-orange-500" : "bg-orange-400 animate-pulse",
            label: "Đang chế biến",
          };
        case ORDER_STATUS.SERVED:
          return {
            bg: isLight ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-sky-500/10 border-sky-500/20 text-sky-400",
            dot: isLight ? "bg-sky-500" : "bg-sky-400",
            label: "Đã phục vụ",
          };
        case ORDER_STATUS.PAID:
          return {
            bg: isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
            dot: isLight ? "bg-emerald-500" : "bg-emerald-400",
            label: "Đã thanh toán",
          };
        case ORDER_STATUS.PENDING_PAYMENT:
          return {
            bg: isLight ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-purple-500/10 border-purple-500/20 text-purple-400",
            dot: isLight ? "bg-purple-500" : "bg-purple-400 animate-bounce",
            label: "Chờ thanh toán",
          };
        case ORDER_STATUS.CANCELLED:
          return {
            bg: isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/10 border-rose-500/20 text-rose-400",
            dot: isLight ? "bg-rose-500" : "bg-rose-400",
            label: "Đã hủy",
          };
        default:
          return {
            bg: isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-sky-50/500/10 border-gray-500/20 text-gray-400",
            dot: isLight ? "bg-slate-500" : "bg-gray-400",
            label: status,
          };
      }
    }
  };

  const style = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${style.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
};
