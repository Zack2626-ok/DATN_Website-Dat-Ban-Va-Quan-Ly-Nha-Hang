import React from "react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: "blue" | "red" | "amber" | "green";
}

const COLOR_MAP: Record<KpiCardProps["color"], { bar: string; iconBg: string; ring: string }> = {
  blue: { bar: "from-sky-600 to-sky-400", iconBg: "bg-sky-50 text-sky-700", ring: "ring-sky-100" },
  red: { bar: "from-rose-500 to-rose-400", iconBg: "bg-rose-50 text-rose-600", ring: "ring-rose-100" },
  amber: { bar: "from-amber-500 to-amber-400", iconBg: "bg-amber-50 text-amber-600", ring: "ring-amber-100" },
  green: { bar: "from-emerald-500 to-emerald-400", iconBg: "bg-emerald-50 text-emerald-600", ring: "ring-emerald-100" },
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, color }) => {
  const c = COLOR_MAP[color];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.bar}`} />
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-xl p-2.5 ring-4 ${c.iconBg} ${c.ring}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 font-playfair text-2xl font-bold tabular-nums text-sky-800">{value}</p>
    </div>
  );
};