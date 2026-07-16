import React from "react";
import { X } from "lucide-react";

interface Hall {
  id: number;
  name: string;
  capacity: number;
  description: string;
  is_active: boolean;
}

interface HallDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  hall: Hall | null;
}

/**
 * HallDetailModal - Modal xem chi tiết sảnh
 */
export const HallDetailModal: React.FC<HallDetailModalProps> = ({ isOpen, onClose, hall }) => {
  if (!isOpen || !hall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sky-100">
          <h2 className="text-lg font-bold text-slate-700">Chi tiết Sảnh</h2>
          <button onClick={onClose} className="p-2 hover:bg-sky-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tên Sảnh
              </label>
              <p className="text-lg font-bold text-slate-800">{hall.name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sức chứa
              </label>
              <p className="text-lg font-bold text-sky-600">{hall.capacity} người</p>
            </div>
          </div>

          {hall.description && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mô tả
              </label>
              <p className="text-sm text-slate-600 leading-relaxed">{hall.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Trạng thái
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  hall.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {hall.is_active ? "Hoạt động" : "Đã khóa"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-sky-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-sky-100 text-slate-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
