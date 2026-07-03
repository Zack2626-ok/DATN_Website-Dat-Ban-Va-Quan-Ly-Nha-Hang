import React, { useState, useEffect } from "react";
import { X, ArrowRight, Link2, Copy, Play } from "lucide-react";
import type { ResmanagerTable } from "../../../../services/tableService";

// Interface chung cho Modal Props
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: ResmanagerTable | null;
}

// ============================================================================
// 1. OPEN TABLE MODAL (MỞ BÀN MỚI)
// ============================================================================
interface OpenTableModalProps extends BaseModalProps {
  onConfirm: (data: { guestCount: number; customerName: string; customerPhone: string }) => void;
  loading?: boolean;
}

export const OpenTableModal: React.FC<OpenTableModalProps> = ({ isOpen, onClose, table, onConfirm, loading = false }) => {
  const [guestCount, setGuestCount] = useState<number>(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGuestCount(table?.capacity || 2);
      setCustomerName("");
      setCustomerPhone("");
    }
  }, [isOpen, table]);

  if (!isOpen || !table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      guestCount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Play size={16} className="text-[#FF5A5F]" />
            Mở bàn mới: {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Số lượng khách *</label>
            <input
              type="number"
              min={1}
              required
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
            <p className="text-[10px] text-gray-400 mt-1">Sức chứa tối đa của bàn: {table.capacity} người</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên khách hàng (Tùy chọn)</label>
            <input
              type="text"
              placeholder="Ví dụ: Anh Hào"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Số điện thoại (Tùy chọn)</label>
            <input
              type="tel"
              placeholder="Ví dụ: 0969775850"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer"
            >
              {loading ? "Đang xử lý..." : "Mở bàn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. TRANSFER TABLE MODAL (CHUYỂN BÀN)
// ============================================================================
interface TransferTableModalProps extends BaseModalProps {
  emptyTables: ResmanagerTable[];
  onConfirm: (targetTableId: number) => void;
  loading?: boolean;
}

export const TransferTableModal: React.FC<TransferTableModalProps> = ({
  isOpen,
  onClose,
  table,
  emptyTables,
  onConfirm,
  loading = false,
}) => {
  const [targetTableId, setTargetTableId] = useState<number | "">("");

  useEffect(() => {
    if (isOpen) {
      setTargetTableId("");
    }
  }, [isOpen]);

  if (!isOpen || !table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) return;
    onConfirm(Number(targetTableId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            Chuyển bàn: {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex items-center gap-4">
            <div className="font-bold">Bàn nguồn: {table.name}</div>
            <ArrowRight size={14} className="text-blue-500" />
            <div className="font-bold">Bàn đích: Chọn bàn trống bên dưới</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chọn bàn trống cần chuyển đến *</label>
            <select
              required
              value={targetTableId}
              onChange={(e) => setTargetTableId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none bg-white"
            >
              <option value="">-- Chọn bàn trống --</option>
              {emptyTables
                .filter((t) => t.id !== table.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Sức chứa: {t.capacity} người - {t.area_name})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !targetTableId}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Chuyển hóa đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MERGE TABLE MODAL (GỘP BÀN)
// ============================================================================
interface MergeTableModalProps extends BaseModalProps {
  emptyTables: ResmanagerTable[];
  onConfirm: (mergedTableIds: number[]) => void;
  loading?: boolean;
}

export const MergeTableModal: React.FC<MergeTableModalProps> = ({
  isOpen,
  onClose,
  table,
  emptyTables,
  onConfirm,
  loading = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen]);

  if (!isOpen || !table) return null;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    onConfirm(selectedIds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Link2 size={16} className="text-[#FF5A5F]" />
            Gộp bàn vào {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Chọn các bàn trống cần gộp chung hóa đơn với bàn **{table.name}**. Khi gộp, các bàn con sẽ chia sẻ hóa đơn và trạng thái với bàn mẹ.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chọn các bàn gộp (Chọn nhiều)</label>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1">
              {emptyTables
                .filter((t) => t.id !== table.id)
                .map((t) => {
                  const isChecked = selectedIds.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        isChecked ? "bg-purple-50 text-purple-900" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>{t.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {t.capacity} người - {t.area_name}
                      </span>
                    </label>
                  );
                })}

              {emptyTables.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-400 font-medium">
                  Không tìm thấy bàn trống nào khác.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || selectedIds.length === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : `Gộp ${selectedIds.length} bàn`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. SPLIT TABLE MODAL (TÁCH BÀN)
// ============================================================================
interface SplitTableModalProps extends BaseModalProps {
  emptyTables: ResmanagerTable[];
  onConfirm: (data: { targetTableId: number; childLabel: string }) => void;
  loading?: boolean;
}

export const SplitTableModal: React.FC<SplitTableModalProps> = ({
  isOpen,
  onClose,
  table,
  emptyTables,
  onConfirm,
  loading = false,
}) => {
  const [targetTableId, setTargetTableId] = useState<number | "">("");
  const [childLabel, setChildLabel] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTargetTableId("");
      setChildLabel("");
    }
  }, [isOpen]);

  if (!isOpen || !table) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId || !childLabel.trim()) return;
    onConfirm({
      targetTableId: Number(targetTableId),
      childLabel: childLabel.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in z-10">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Copy size={16} className="text-[#FF5A5F]" />
            Tách bàn: {table.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Chọn một bàn trống để tách một phần đơn hàng từ bàn **{table.name}** sang.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Tên nhãn tách hóa đơn *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Bàn A, Nhóm 2..."
              value={childLabel}
              onChange={(e) => setChildLabel(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Chọn bàn trống nhận chuyển sang *</label>
            <select
              required
              value={targetTableId}
              onChange={(e) => setTargetTableId(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FF5A5F] focus:outline-none bg-white"
            >
              <option value="">-- Chọn bàn trống --</option>
              {emptyTables
                .filter((t) => t.id !== table.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Sức chứa: {t.capacity} người - {t.area_name})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !targetTableId || !childLabel.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-[#FF5A5F] hover:bg-[#e04f53] rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Tách bàn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
