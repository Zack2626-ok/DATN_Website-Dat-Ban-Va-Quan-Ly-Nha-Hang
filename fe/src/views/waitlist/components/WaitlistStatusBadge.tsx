import React from 'react';
import { Clock, Bell, CheckCircle, XCircle } from 'lucide-react';

interface WaitlistStatusBadgeProps {
  status: 'waiting' | 'notified' | 'seated' | 'cancelled';
}

export const WaitlistStatusBadge: React.FC<WaitlistStatusBadgeProps> = ({ status }) => {
  const config = {
    waiting: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, label: 'Đang chờ' },
    notified: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Bell, label: 'Đã thông báo' },
    seated: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle, label: 'Đã vào bàn' },
    cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: 'Đã hủy' },
  };

  const { color, icon: Icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}>
      <Icon size={14} />
      {label}
    </span>
  );
};
