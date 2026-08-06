import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { Split, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { createTableSplit, type SplitGroupParam } from "../../../services/tableService";

export interface SplitOrderItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
  status?: string;
}

interface SplitTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  tableCapacity?: number;
  sourceTableId?: number;
  orderItems: SplitOrderItem[];
  availableEmptyTables?: any[];
  onConfirm?: () => Promise<void>;
  onSuccess?: () => void;
}

/**
 * Tách bàn vật lý thành các nhóm sub-orders độc lập (B04:1, B04:2...)
 * Bảo vệ món đang chế biến/đã phục vụ giữ nguyên ở nhóm 1 (B04:1)
 */
export const SplitTableModal: React.FC<SplitTableModalProps> = ({
  isOpen,
  onClose,
  tableName,
  tableCapacity = 8,
  sourceTableId,
  orderItems,
  onSuccess,
}) => {
  const [groupCount, setGroupCount] = useState<number>(2);
  const [guestCounts, setGuestCounts] = useState<number[]>([
    Math.ceil((tableCapacity || 8) / 2),
    Math.floor((tableCapacity || 8) / 2),
  ]);
  // Allocations: itemAllocations[item_id] = target_group_index (0-indexed)
  const [itemAllocations, setItemAllocations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const handleGroupCountChange = (newCount: number) => {
    if (newCount < 2 || newCount > 6) return;
    setGroupCount(newCount);
    const newGuestCounts = Array.from({ length: newCount }, (_, i) => {
      return guestCounts[i] || Math.max(1, Math.floor((tableCapacity || 8) / newCount));
    });
    setGuestCounts(newGuestCounts);
  };

  const handleGuestCountChange = (index: number, val: number) => {
    const updated = [...guestCounts];
    updated[index] = Math.max(1, val);
    setGuestCounts(updated);
  };

  const handleItemTargetChange = (itemId: string | number, targetGroupIdx: number) => {
    setItemAllocations((prev) => ({
      ...prev,
      [itemId.toString()]: targetGroupIdx,
    }));
  };

  const handleClose = () => {
    setGroupCount(2);
    setGuestCounts([
      Math.ceil((tableCapacity || 8) / 2),
      Math.floor((tableCapacity || 8) / 2),
    ]);
    setItemAllocations({});
    onClose();
  };

  const handleSubmit = async () => {
    if (!sourceTableId) {
      toast.error("Không xác định được bàn cần tách");
      return;
    }

    const totalGuests = guestCounts.reduce((a, b) => a + b, 0);
    if (totalGuests > (tableCapacity || 8)) {
      toast.error(`Tổng số khách (${totalGuests}) vượt quá sức chứa bàn (${tableCapacity} chỗ)`);
      return;
    }

    // Build payload groups
    const groups: SplitGroupParam[] = Array.from({ length: groupCount }, (_, gIdx) => {
      const gAllocations: { order_item_id: number; quantity: number }[] = [];
      orderItems.forEach((item) => {
        const assignedGroup = itemAllocations[item.id.toString()] ?? 0;
        if (assignedGroup === gIdx) {
          gAllocations.push({
            order_item_id: Number(item.id),
            quantity: item.quantity,
          });
        }
      });
      return {
        guest_count: guestCounts[gIdx],
        item_allocations: gAllocations,
      };
    });

    setLoading(true);
    try {
      await createTableSplit(sourceTableId, groups);
      toast.success(`✅ Đã tách bàn ${tableName} thành ${groupCount} nhóm phục vụ!`);
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Không thể tách bàn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tách Bàn (Sub-Orders)" size="lg" theme="light">
      <div className="space-y-5">
        {/* Source Table Header */}
        <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-100 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <Split size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-violet-500 uppercase tracking-wider">Tách Nhóm Cho Bàn</p>
              <p className="font-black text-slate-800 text-xl">{tableName}</p>
              <p className="text-xs text-slate-500">Sức chứa bàn vật lý: {tableCapacity} chỗ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-violet-200">
            <span className="text-xs font-bold text-slate-600">Số nhóm:</span>
            <button
              onClick={() => handleGroupCountChange(groupCount - 1)}
              disabled={groupCount <= 2}
              className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-bold disabled:opacity-40"
            >
              -
            </button>
            <span className="font-black text-violet-700 px-1">{groupCount}</span>
            <button
              onClick={() => handleGroupCountChange(groupCount + 1)}
              disabled={groupCount >= 6}
              className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center font-bold disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* Groups Configuration */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: groupCount }).map((_, i) => (
            <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-700 text-sm">{tableName}:{i + 1}</span>
                <span className="text-xs font-semibold text-slate-400">Nhóm {i + 1}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-bold text-slate-500">Số khách:</label>
                <input
                  type="number"
                  min={1}
                  max={tableCapacity}
                  value={guestCounts[i] || 1}
                  onChange={(e) => handleGuestCountChange(i, parseInt(e.target.value, 10) || 1)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-sm outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Item Allocation Table */}
        {orderItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Phân bổ món hiện có vào các nhóm
              </label>
              <span className="text-xs text-slate-400">{orderItems.length} món trong order</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {orderItems.map((item) => {
                const isCookedOrServed = item.status === "cooking" || item.status === "served";
                const targetGroup = itemAllocations[item.id.toString()] ?? 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isCookedOrServed
                        ? "bg-amber-50/60 border-amber-200"
                        : "bg-white border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                        <span className="text-xs font-bold text-slate-400">× {item.quantity}</span>
                        {isCookedOrServed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertCircle size={10} />
                            {item.status === "cooking" ? "Đang nấu" : "Đã lên bàn"} — Giữ ở {tableName}:1
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isCookedOrServed ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                          {tableName}:1
                        </span>
                      ) : (
                        <select
                          value={targetGroup}
                          onChange={(e) => handleItemTargetChange(item.id, parseInt(e.target.value, 10))}
                          className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20"
                        >
                          {Array.from({ length: groupCount }).map((_, gIdx) => (
                            <option key={gIdx} value={gIdx}>
                              {tableName}:{gIdx + 1}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Split size={16} />
                Xác nhận Tách {groupCount} Nhóm
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
