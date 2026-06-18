import React from 'react';
import { Users } from 'lucide-react';

interface GuestCounterProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export const GuestCounter: React.FC<GuestCounterProps> = ({ value, min, max, onChange }) => (
  <div className="space-y-2.5">
    <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
      <Users size={15} className="text-brand-primary" />
      Số lượng khách <span className="text-rose-400">*</span>
    </label>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-lg text-zinc-300 hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 cursor-pointer"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        readOnly
        className="w-20 text-center font-black text-2xl bg-white/5 border border-white/10 rounded-xl py-2.5 text-zinc-100 outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-lg text-zinc-300 hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 cursor-pointer"
      >
        +
      </button>
    </div>
  </div>
);
