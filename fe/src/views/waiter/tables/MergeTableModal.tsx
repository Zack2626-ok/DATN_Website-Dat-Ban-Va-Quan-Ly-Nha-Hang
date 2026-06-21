import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { Merge } from "lucide-react";
import { Table } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";

interface MergeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: Table | null;
  availableTables: Table[];
  onConfirm: (primaryId: string | number, mergeIds: (string | number)[]) => void;
}

/**
 * Gộp bàn — gộp nhiều bàn phục vụ vào một bàn chính
 */
export const MergeTableModal: React.FC<MergeTableModalProps> = ({
  isOpen,
  onClose,
  sourceTable,
  availableTables,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const servingTables = availableTables.filter(
    (t) => (t.status === "serving" || t.status === "pending_payment") && t.id !== sourceTable?.id,
  );

  const toggleTable = (id: string | number) => {
    const strId = id.toString();
    setSelectedIds((prev) =>
      prev.includes(strId) ? prev.filter((i) => i !== strId) : [...prev, strId],
    );
  };

  const handleClose = () => {
    setSelectedIds([]);
    onClose();
  };

  const handleSubmit = () => {
    if (!sourceTable || selectedIds.length === 0) {
      toast.error("Chọn ít nhất một bàn để gộp");
      return;
    }
    onConfirm(sourceTable.id, selectedIds);
    toast.success(`Đã gộp ${selectedIds.length} bàn vào ${sourceTable.name}`);
    handleClose();
  };

  if (!sourceTable) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Gộp bàn" size="md" theme="light">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <Merge size={20} className="text-indigo-600" />
          <div>
            <p className="text-sm text-gray-500">Bàn chính (giữ order)</p>
            <p className="font-black text-gray-900 text-lg">{sourceTable.name}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Chọn bàn cần gộp vào
          </label>
          {servingTables.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">Không có bàn phục vụ khác</p>
          ) : (
            <div className="space-y-2">
              {servingTables.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedIds.includes(t.id.toString())
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-100 bg-gray-50 hover:border-indigo-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(t.id.toString())}
                    onChange={() => toggleTable(t.id)}
                    className="rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-gray-800">{t.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{t.capacity} chỗ</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase">{t.status}</span>
                </label>
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
            disabled={selectedIds.length === 0}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            Gộp bàn
          </button>
        </div>
      </div>
    </Modal>
  );
};
