import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { Split, CheckCircle2, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";
import { splitTable } from "../../../services/tableService";

interface SplitOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface SplitTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  sourceTableId?: number;
  orderItems: SplitOrderItem[];
  availableEmptyTables: { id: string | number; name: string; capacity?: number }[];
  onConfirm: (targetTableId: string | number, itemIds: string[]) => void;
  onSuccess?: () => void;
}

/**
 * Tách bàn — tách một số món sang bàn mới (trống)
 * Tạo order mới tại bàn đích, move các items đã chọn sang order mới
 */
export const SplitTableModal: React.FC<SplitTableModalProps> = ({
  isOpen,
  onClose,
  tableName,
  sourceTableId,
  orderItems,
  availableEmptyTables,
  onConfirm,
  onSuccess,
}) => {
  const [targetId, setTargetId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedItemIds.length === orderItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(orderItems.map((i) => i.id));
    }
  };

  const handleClose = () => {
    setTargetId("");
    setSelectedItemIds([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!targetId || selectedItemIds.length === 0) {
      toast.error("Chọn bàn đích và ít nhất 1 món cần tách");
      return;
    }
    setLoading(true);
    try {
      const childLabel = `${tableName}:split`;
      const itemIdsNum = selectedItemIds.map((id) => parseInt(id, 10));

      if (sourceTableId) {
        await splitTable(sourceTableId, Number(targetId), childLabel, itemIdsNum);
      }

      const targetName = availableEmptyTables.find((t) => t.id.toString() === targetId)?.name;
      toast.success(`✅ Đã tách ${selectedItemIds.length} món sang bàn ${targetName}`);
      onConfirm(targetId, selectedItemIds);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Không thể tách bàn. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTotal = selectedItemIds.reduce((sum, id) => {
    const item = orderItems.find((i) => i.id === id);
    return sum + (item ? item.price * item.quantity : 0);
  }, 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tách bàn" size="md" theme="light">
      <div className="space-y-5">
        {/* Source table info */}
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-2xl">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <Split size={18} className="text-violet-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-violet-500 uppercase tracking-wider">Tách từ bàn</p>
            <p className="font-black text-gray-900 text-xl">{tableName}</p>
            <p className="text-xs text-gray-500">{orderItems.length} món trong order</p>
          </div>
        </div>

        {/* Items selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Chọn món cần tách sang bàn mới
            </label>
            <button
              onClick={selectAll}
              className="text-xs text-violet-600 font-bold hover:underline"
            >
              {selectedItemIds.length === orderItems.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>

          {orderItems.length === 0 ? (
            <div className="py-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">Chưa có món nào trong order</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {orderItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-violet-400 bg-violet-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-violet-200"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? "bg-violet-600 border-violet-600" : "border-gray-300"
                    }`}>
                      {isSelected && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-gray-800">{item.name}</span>
                      <span className="text-gray-400 text-xs ml-1.5">× {item.quantity}</span>
                    </div>
                    <span className="font-bold text-gray-700 text-sm shrink-0">
                      {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Selected summary */}
          {selectedItemIds.length > 0 && (
            <div className="flex justify-between items-center px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
              <span className="text-xs font-bold text-violet-600">{selectedItemIds.length} món đã chọn</span>
              <span className="text-sm font-black text-violet-700">
                {selectedTotal.toLocaleString("vi-VN")}₫
              </span>
            </div>
          )}
        </div>

        {/* Target table selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Bàn đích (đang trống)
          </label>
          {availableEmptyTables.length === 0 ? (
            <div className="py-4 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400 font-medium">Không có bàn trống để tách</p>
            </div>
          ) : (
            <div className="relative">
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all text-gray-800 appearance-none"
              >
                <option value="">-- Chọn bàn đích --</option>
                {availableEmptyTables.map((t) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.name}{t.capacity ? ` — ${t.capacity} chỗ` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!targetId || selectedItemIds.length === 0 || loading}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang tách...
              </>
            ) : (
              <>
                <Split size={14} />
                Tách {selectedItemIds.length > 0 ? `${selectedItemIds.length} món` : "bàn"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
