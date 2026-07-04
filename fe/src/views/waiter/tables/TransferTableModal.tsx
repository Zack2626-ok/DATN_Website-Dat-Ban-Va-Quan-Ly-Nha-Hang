import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { ArrowRightLeft, CheckCircle } from "lucide-react";
import { Table } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";
import { transferTable } from "../../../services/tableService";

interface TransferTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: Table | null;
  availableTables: Table[];
  onConfirm: (sourceId: string | number, targetId: string | number) => void;
  onSuccess?: () => void; // callback để reload data
}

/**
 * Chuyển bàn — chuyển toàn bộ order sang bàn trống khác
 */
export const TransferTableModal: React.FC<TransferTableModalProps> = ({
  isOpen,
  onClose,
  sourceTable,
  availableTables,
  onConfirm,
  onSuccess,
}) => {
  const [targetId, setTargetId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const emptyTables = availableTables.filter(
    (t) =>
      t.status === "empty" &&
      t.id !== sourceTable?.id &&
      t.area_id === sourceTable?.area_id,
  );

  const handleClose = () => {
    setTargetId("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!sourceTable || !targetId) {
      toast.error("Vui lòng chọn bàn đích");
      return;
    }
    setLoading(true);
    try {
      // Gọi API thật
      await transferTable(Number(sourceTable.id), Number(targetId));
      const targetTable = emptyTables.find((t) => t.id.toString() === targetId);
      toast.success(`✅ Đã chuyển bàn ${sourceTable.name} → ${targetTable?.name}`);
      onConfirm(sourceTable.id, targetId);
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || "Không thể chuyển bàn. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!sourceTable) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Chuyển bàn" size="md" theme="light">
      <div className="space-y-5">
        {/* Source table info */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <ArrowRightLeft size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Bàn nguồn</p>
            <p className="font-black text-gray-900 text-xl">{sourceTable.name}</p>
            <p className="text-xs text-gray-500">{sourceTable.capacity} chỗ — Đang phục vụ</p>
          </div>
        </div>

        {/* Target table selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Chọn bàn đích (cùng {(sourceTable as any).area_name || "khu vực"} — đang trống)
            </label>
            <span className="text-xs text-gray-400">{emptyTables.length} bàn trống</span>
          </div>

          {emptyTables.length === 0 ? (
            <div className="py-8 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
              <p className="text-sm text-gray-400 font-medium">Không có bàn trống nào để chuyển</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {emptyTables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTargetId(t.id.toString())}
                  className={`relative py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                    targetId === t.id.toString()
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-100"
                      : "border-gray-100 bg-white text-gray-700 hover:border-blue-200 hover:shadow-sm"
                  }`}
                >
                  {targetId === t.id.toString() && (
                    <CheckCircle size={14} className="absolute top-2 right-2 text-blue-500" />
                  )}
                  <span className="block text-base font-black">{t.name}</span>
                  <span className="block text-[10px] font-normal text-gray-400 mt-0.5">{t.capacity} chỗ</span>
                  <span className="block text-[9px] font-bold text-gray-300 mt-0.5">
                    {(t as any).area_name || ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Arrow preview */}
        {targetId && (
          <div className="flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
            <span className="font-black text-blue-600 text-lg">{sourceTable.name}</span>
            <ArrowRightLeft size={18} className="text-gray-400" />
            <span className="font-black text-green-600 text-lg">
              {emptyTables.find((t) => t.id.toString() === targetId)?.name}
            </span>
          </div>
        )}

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
            disabled={!targetId || loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang chuyển...
              </>
            ) : (
              <>
                <ArrowRightLeft size={14} />
                Xác nhận chuyển bàn
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
