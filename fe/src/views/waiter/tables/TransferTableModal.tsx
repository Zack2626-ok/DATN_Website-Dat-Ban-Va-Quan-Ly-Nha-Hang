import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { ArrowRightLeft } from "lucide-react";
import { Table } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";

interface TransferTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: Table | null;
  availableTables: Table[];
  onConfirm: (sourceId: string | number, targetId: string | number) => void;
}

/**
 * Chuyển bàn — chuyển order sang bàn khác
 */
export const TransferTableModal: React.FC<TransferTableModalProps> = ({
  isOpen,
  onClose,
  sourceTable,
  availableTables,
  onConfirm,
}) => {
  const [targetId, setTargetId] = useState<string>("");

  const emptyTables = availableTables.filter(
    (t) => t.status === "empty" && t.id !== sourceTable?.id,
  );

  const handleClose = () => {
    setTargetId("");
    onClose();
  };

  const handleSubmit = () => {
    if (!sourceTable || !targetId) {
      toast.error("Vui lòng chọn bàn đích");
      return;
    }
    onConfirm(sourceTable.id, targetId);
    toast.success(`Đã chuyển bàn ${sourceTable.name} → ${emptyTables.find((t) => t.id.toString() === targetId)?.name}`);
    handleClose();
  };

  if (!sourceTable) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Chuyển bàn" size="md" theme="light">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <ArrowRightLeft size={20} className="text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Bàn nguồn</p>
            <p className="font-black text-gray-900 text-lg">{sourceTable.name}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chọn bàn đích (trống)</label>
          {emptyTables.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">Không có bàn trống trong khu vực</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {emptyTables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTargetId(t.id.toString())}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    targetId === t.id.toString()
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-200"
                  }`}
                >
                  {t.name}
                  <span className="block text-[10px] font-normal text-gray-400">{t.capacity} chỗ</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!targetId}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Xác nhận chuyển
          </button>
        </div>
      </div>
    </Modal>
  );
};
