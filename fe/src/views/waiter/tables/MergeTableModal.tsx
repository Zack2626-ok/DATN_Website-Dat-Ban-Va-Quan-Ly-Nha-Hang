import React, { useState } from "react";
import { Modal } from "../../../components/Modal";
import { Merge, CheckCircle2, X } from "lucide-react";
import { Table } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";
import { mergeTables, unmergeTables } from "../../../services/tableService";

interface MergeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: (Table & { is_merged_primary?: boolean; merged_tables?: { id: number; name: string }[] }) | null;
  availableTables: Table[];
  onConfirm: (primaryId: string | number, mergeIds: (string | number)[]) => void;
  onSuccess?: () => void;
}

/**
 * Gộp bàn — gộp nhiều bàn đang phục vụ vào bàn chính
 * Sau khi gộp: các bàn gộp sẽ chuyển sang "serving" và được mark là merged_child
 */
export const MergeTableModal: React.FC<MergeTableModalProps> = ({
  isOpen,
  onClose,
  sourceTable,
  availableTables,
  onConfirm,
  onSuccess,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Chỉ gộp bàn cùng khu vực/tầng với bàn chính
  const servingTables = availableTables.filter(
    (t) =>
      (t.status === "serving" || t.status === "pending_payment") &&
      t.id !== sourceTable?.id &&
      t.area_id === sourceTable?.area_id &&
      !(t as any).is_merged_child,
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

  const handleSubmit = async () => {
    if (!sourceTable || selectedIds.length === 0) {
      toast.error("Chọn ít nhất một bàn để gộp");
      return;
    }
    setLoading(true);
    try {
      await mergeTables(Number(sourceTable.id), selectedIds.map(Number));
      const mergedNames = selectedIds
        .map((id) => servingTables.find((t) => t.id.toString() === id)?.name)
        .filter(Boolean)
        .join(", ");
      toast.success(`✅ Đã gộp bàn ${mergedNames} vào ${sourceTable.name}`);
      onConfirm(sourceTable.id, selectedIds);
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || "Không thể gộp bàn. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnmerge = async () => {
    if (!sourceTable) return;
    setLoading(true);
    try {
      await unmergeTables(Number(sourceTable.id));
      toast.success(`✅ Đã bỏ gộp bàn ${sourceTable.name}`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error("Không thể bỏ gộp bàn.");
    } finally {
      setLoading(false);
    }
  };

  if (!sourceTable) return null;

  const isMergedPrimary = sourceTable.is_merged_primary;
  const currentMergedTables = sourceTable.merged_tables || [];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Gộp bàn" size="md" theme="light">
      <div className="space-y-5">
        {/* Primary table info */}
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Merge size={18} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
              Bàn chính (giữ order) — {(sourceTable as any).area_name || "Cùng tầng"}
            </p>
            <p className="font-black text-gray-900 text-xl">{sourceTable.name}</p>
            {isMergedPrimary && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-xs text-indigo-600 font-bold">Đang gộp với:</span>
                {currentMergedTables.map((mt) => (
                  <span key={mt.id} className="text-xs bg-indigo-100 text-indigo-700 rounded px-2 py-0.5 font-bold">
                    {mt.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nếu đang là primary → cho phép bỏ gộp */}
        {isMergedPrimary && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-sm text-amber-800 font-semibold">
              Bàn {sourceTable.name} đang gộp với:{" "}
              <span className="font-black">{currentMergedTables.map((m) => m.name).join(", ")}</span>
            </p>
            <div className="flex justify-end mt-2">
              <button
                onClick={handleUnmerge}
                disabled={loading}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all flex items-center gap-1"
              >
                <X size={12} /> Bỏ gộp
              </button>
            </div>
          </div>
        )}

        {/* Select tables to merge */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Chọn bàn cùng {(sourceTable as any).area_name || "tầng"} để gộp vào
            </label>
            <span className="text-xs text-gray-400">
              {selectedIds.length > 0 ? `Đã chọn ${selectedIds.length} bàn` : `${servingTables.length} bàn có thể gộp`}
            </span>
          </div>

          {servingTables.length === 0 ? (
            <div className="py-8 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
              <p className="text-sm text-gray-400 font-medium">Không có bàn đang phục vụ nào để gộp</p>
              <p className="text-xs text-gray-300 mt-1">Chỉ gộp được với bàn đang phục vụ hoặc chờ thanh toán</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {servingTables.map((t) => {
                const tableExt = t as any;
                const isSelected = selectedIds.includes(t.id.toString());
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-400 bg-indigo-50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                    }`}>
                      {isSelected && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTable(t.id)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-800">{t.name}</span>
                        <span className="text-[10px] text-gray-400">{t.capacity} chỗ</span>
                        {tableExt.area_name && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 font-medium">
                            {tableExt.area_name}
                          </span>
                        )}
                      </div>
                      {(tableExt.guest_name) && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          👤 {tableExt.guest_name}
                          {tableExt.guest_phone && ` — ${tableExt.guest_phone}`}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                      t.status === "serving" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                    }`}>
                      {t.status === "serving" ? "Đang phục vụ" : "Chờ TT"}
                    </span>
                  </label>
                );
              })}
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
            disabled={selectedIds.length === 0 || loading}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gộp...
              </>
            ) : (
              <>
                <Merge size={14} />
                Gộp {selectedIds.length > 0 ? `${selectedIds.length} bàn` : "bàn"}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
