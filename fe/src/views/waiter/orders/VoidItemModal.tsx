import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { AlertTriangle, Flame, Send } from "lucide-react";
import { toast } from "react-hot-toast";

export type OrderItemStatus = "pending" | "cooking" | "done" | "served" | "voided";

export interface VoidableOrderItem {
  id: string;
  name: string;
  quantity: number;
  status: OrderItemStatus;
}

interface VoidItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: VoidableOrderItem | null;
  tableName: string;
  onConfirm: (itemId: string, reason: string, notifyKds: boolean) => void;
}

const VOID_REASONS = [
  "Khách hủy món",
  "Gọi nhầm món",
  "Món không đạt chất lượng",
  "Khách hoàn trả",
  "Khác",
];

/**
 * Hủy / Hoàn trả món — extend: gửi thông báo void lên KDS khi status = cooking
 */
export const VoidItemModal: React.FC<VoidItemModalProps> = ({
  isOpen,
  onClose,
  item,
  tableName,
  onConfirm,
}) => {
  const [reason, setReason] = useState(VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [notifyKds, setNotifyKds] = useState(true);

  const handleClose = () => {
    setReason(VOID_REASONS[0]);
    setCustomReason("");
    setNotifyKds(true);
    onClose();
  };

  const handleSubmit = () => {
    if (!item) return;
    const finalReason = reason === "Khác" ? customReason.trim() : reason;
    if (!finalReason) {
      toast.error("Vui lòng nhập lý do hủy món");
      return;
    }
    const shouldNotifyKds = item.status === "cooking" && notifyKds;
    onConfirm(item.id, finalReason, shouldNotifyKds);
    if (shouldNotifyKds) {
      toast.success(`Đã gửi thông báo void lên KDS — Bàn ${tableName}`);
    } else {
      toast.success(`Đã hủy món "${item.name}"`);
    }
    handleClose();
  };

  if (!item) return null;

  const isCooking = item.status === "cooking";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Hủy / Hoàn trả món" size="md" theme="light">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900">{item.name} × {item.quantity}</p>
            <p className="text-sm text-gray-500 mt-1">Bàn {tableName}</p>
          </div>
        </div>

        {isCooking && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
              <Flame size={16} />
              Món đang nấu trên bếp
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyKds}
                onChange={(e) => setNotifyKds(e.target.checked)}
                className="mt-1 rounded border-orange-300"
              />
              <div>
                <span className="text-sm font-semibold text-orange-900 flex items-center gap-1.5">
                  <Send size={14} />
                  Gửi thông báo void lên KDS
                </span>
                <p className="text-xs text-orange-700 mt-0.5">
                  Bếp sẽ nhận cảnh báo để ngừng chế biến món này
                </p>
              </div>
            </label>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lý do hủy</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {VOID_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {reason === "Khác" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Nhập lý do..."
              rows={2}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Xác nhận hủy món
          </button>
        </div>
      </div>
    </Modal>
  );
};
