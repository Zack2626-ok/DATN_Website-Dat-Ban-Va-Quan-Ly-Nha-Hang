import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { Split } from "lucide-react";
import { toast } from "react-hot-toast";

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
  orderItems: SplitOrderItem[];
  availableEmptyTables: { id: string | number; name: string }[];
  onConfirm: (targetTableId: string | number, itemIds: string[]) => void;
}

/**
 * Tách bàn — tách một phần order sang bàn mới
 */
export const SplitTableModal: React.FC<SplitTableModalProps> = ({
  isOpen,
  onClose,
  tableName,
  orderItems,
  availableEmptyTables,
  onConfirm,
}) => {
  const [targetId, setTargetId] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleClose = () => {
    setTargetId("");
    setSelectedItemIds([]);
    onClose();
  };

  const handleSubmit = () => {
    if (!targetId || selectedItemIds.length === 0) {
      toast.error("Chọn bàn đích và món cần tách");
      return;
    }
    onConfirm(targetId, selectedItemIds);
    const targetName = availableEmptyTables.find((t) => t.id.toString() === targetId)?.name;
    toast.success(`Đã tách ${selectedItemIds.length} món sang bàn ${targetName}`);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tách bàn" size="md" theme="light">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-xl">
          <Split size={20} className="text-violet-600" />
          <div>
            <p className="text-sm text-gray-500">Tách từ bàn</p>
            <p className="font-black text-gray-900 text-lg">{tableName}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Món cần tách</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {orderItems.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  selectedItemIds.includes(item.id)
                    ? "border-violet-400 bg-violet-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedItemIds.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="rounded"
                />
                <span className="flex-1 font-medium text-gray-800">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-sm font-bold text-gray-600">
                  {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bàn đích (trống)</label>
          {availableEmptyTables.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-2">Không có bàn trống</p>
          ) : (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
            >
              <option value="">Chọn bàn...</option>
              {availableEmptyTables.map((t) => (
                <option key={t.id} value={t.id.toString()}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!targetId || selectedItemIds.length === 0}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg font-bold text-sm hover:bg-violet-700 disabled:opacity-50"
          >
            Tách bàn
          </button>
        </div>
      </div>
    </Modal>
  );
};
