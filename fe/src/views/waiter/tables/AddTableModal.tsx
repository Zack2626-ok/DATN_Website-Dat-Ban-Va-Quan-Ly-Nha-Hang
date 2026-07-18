import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import type { TableArea } from "../../../interfaces/table.interface";

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  areas: TableArea[];
  onConfirm: (data: { name: string; capacity: number; area_id: number }) => Promise<void>;
}

export const AddTableModal: React.FC<AddTableModalProps> = ({ isOpen, onClose, areas, onConfirm }) => {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [areaId, setAreaId] = useState(areas[0]?.id || 1);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm({
        name: name.trim(),
        capacity: Number(capacity) || 4,
        area_id: Number(areaId) || areas[0]?.id || 1,
      });
      setName("");
      setCapacity(4);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-sky-50 bg-sky-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Plus className="text-sky-600" size={18} />
            Thêm bàn ăn nhanh
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-200/60 hover:text-slate-500 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Tên bàn (VD: B15, B16)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên bàn..."
              className="w-full rounded-xl border border-sky-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Khu vực</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(Number(e.target.value))}
              className="w-full rounded-xl border border-sky-100 px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Sức chứa (số chỗ ngồi)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full rounded-xl border border-sky-100 px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sky-100 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-sky-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Đang thêm..." : "Tạo bàn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
