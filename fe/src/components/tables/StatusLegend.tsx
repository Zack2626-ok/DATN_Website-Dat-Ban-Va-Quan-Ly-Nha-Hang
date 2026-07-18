import React from 'react';

const StatusLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap gap-6 text-sm bg-white p-4 rounded-xl border border-sky-50 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
        <span className="text-slate-500 font-medium">Trống</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
        <span className="text-slate-500 font-medium">Đang dùng</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div>
        <span className="text-slate-500 font-medium">Đặt trước</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
        <span className="text-slate-500 font-medium">Chờ thanh toán</span>
      </div>
    </div>
  );
};

export default StatusLegend;
