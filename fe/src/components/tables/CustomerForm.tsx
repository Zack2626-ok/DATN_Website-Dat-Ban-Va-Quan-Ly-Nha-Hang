import React from 'react';
import { User, Phone } from 'lucide-react';

interface CustomerFormProps {
  name: string;
  phone: string;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ name, phone, onNameChange, onPhoneChange }) => (
  <div className="space-y-4">
    <div className="space-y-2.5">
      <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
        <User size={15} className="text-brand-primary" />
        Tên khách hàng
        <span className="text-xs font-normal text-rose-500">(bắt buộc)</span>
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Nhập tên khách hàng..."
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-200 placeholder-zinc-600 outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium text-sm"
      />
    </div>
    <div className="space-y-2.5">
      <label className="text-sm font-bold text-zinc-300 flex items-center gap-2">
        <Phone size={15} className="text-brand-primary" />
        Số điện thoại
        <span className="text-xs font-normal text-zinc-600">(không bắt buộc)</span>
      </label>
      <input
        type="tel"
        value={phone}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^0-9+\s-]/g, '');
          onPhoneChange(cleaned);
        }}
        placeholder="Nhập số điện thoại..."
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-200 placeholder-zinc-600 outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10 transition-all font-medium text-sm"
      />
    </div>
  </div>
);
