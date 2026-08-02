import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, UsersRound } from "lucide-react";
import { toast } from "react-hot-toast";
import { Modal } from "../../../components/Modal";
import {
  arrangeGroupSeating,
  type ResmanagerTable,
} from "../../../services/tableService";

interface GroupSeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTable: ResmanagerTable | null;
  availableTables: ResmanagerTable[];
  onSuccess?: () => void;
}

/** Return a practical sort order: same area and nearer tables are suggested first, but remote tables remain available. */
const getSuggestedTables = (sourceTable: ResmanagerTable, candidates: ResmanagerTable[]): ResmanagerTable[] => (
  [...candidates].sort((firstTable, secondTable) => {
    const firstSameArea = firstTable.area_id === sourceTable.area_id ? 0 : 1;
    const secondSameArea = secondTable.area_id === sourceTable.area_id ? 0 : 1;
    if (firstSameArea !== secondSameArea) return firstSameArea - secondSameArea;
    const firstDistance = Math.abs(firstTable.row_pos.charCodeAt(0) - sourceTable.row_pos.charCodeAt(0))
      + Math.abs(firstTable.col_pos - sourceTable.col_pos);
    const secondDistance = Math.abs(secondTable.row_pos.charCodeAt(0) - sourceTable.row_pos.charCodeAt(0))
      + Math.abs(secondTable.col_pos - sourceTable.col_pos);
    return firstDistance - secondDistance || firstTable.name.localeCompare(secondTable.name);
  })
);

/** Xếp một đoàn đông khách trên nhiều bàn độc lập nhưng vẫn dùng chung một order và hóa đơn. */
export const GroupSeatingModal: React.FC<GroupSeatingModalProps> = ({
  isOpen,
  onClose,
  sourceTable,
  availableTables,
  onSuccess,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const candidateTables = useMemo(() => availableTables.filter((table) => (
    table.id !== sourceTable?.id
    && table.status === "empty"
    && !table.is_merged_child
    && !table.is_merged_primary
    && !table.is_group_seating_child
    && !table.is_group_seating_primary
  )), [availableTables, sourceTable]);

  const sourceCapacity = sourceTable?.cluster_capacity ?? sourceTable?.capacity ?? 0;
  const guestCount = Number(sourceTable?.guest_count ?? 0);
  const selectedTables = useMemo(
    () => candidateTables.filter((table) => selectedIds.includes(table.id)),
    [candidateTables, selectedIds],
  );
  const totalCapacity = sourceCapacity + selectedTables.reduce((total, table) => total + table.capacity, 0);

  useEffect(() => {
    if (!isOpen || !sourceTable || guestCount <= sourceCapacity) {
      setSelectedIds([]);
      return;
    }
    const suggestions = getSuggestedTables(sourceTable, candidateTables);
    let runningCapacity = sourceCapacity;
    const suggestedIds: number[] = [];
    for (const table of suggestions) {
      if (runningCapacity >= guestCount) break;
      runningCapacity += table.capacity;
      suggestedIds.push(table.id);
    }
    setSelectedIds(suggestedIds);
  }, [candidateTables, guestCount, isOpen, sourceCapacity, sourceTable]);

  /** Reset temporary choices when the group-seating dialog closes. */
  const handleClose = (): void => {
    setSelectedIds([]);
    onClose();
  };

  /** Select or remove a separately located table from the party allocation. */
  const toggleTable = (tableId: number): void => {
    setSelectedIds((currentIds) => (
      currentIds.includes(tableId)
        ? currentIds.filter((id) => id !== tableId)
        : [...currentIds, tableId]
    ));
  };

  /** Persist the party allocation only when the chosen tables can seat the full party. */
  const handleSubmit = async (): Promise<void> => {
    if (!sourceTable || guestCount <= 0) {
      toast.error("Bàn chính chưa có số lượng khách hợp lệ.");
      return;
    }
    if (selectedIds.length === 0 || totalCapacity < guestCount) {
      toast.error("Hãy chọn đủ bàn để phục vụ toàn bộ đoàn khách.");
      return;
    }
    setLoading(true);
    try {
      await arrangeGroupSeating(sourceTable.id, selectedIds);
      toast.success(`Đã xếp đoàn ${guestCount} khách vào ${selectedIds.length + 1} bàn.`);
      onSuccess?.();
      handleClose();
    } catch (error: unknown) {
      const responseError = error as { response?: { data?: { message?: unknown } } };
      const message = typeof responseError.response?.data?.message === "string"
        ? responseError.response.data.message
        : "Không thể xếp bàn đoàn. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!sourceTable) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Xếp bàn đoàn" size="lg" theme="light">
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700"><UsersRound size={20} /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-sky-700">Bàn chính giữ order và hóa đơn</p>
              <p className="text-lg font-black text-slate-800">{sourceTable.name} · {guestCount || "?"} khách</p>
              <p className="mt-1 text-xs text-slate-600">Có thể chọn các bàn xa hoặc khác khu vực. Đây không phải gộp bàn vật lý.</p>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-3 text-sm font-bold ${totalCapacity >= guestCount && guestCount > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          Sức chứa đang chọn: {totalCapacity} / {guestCount || "?"} khách · {selectedIds.length + 1} bàn
        </div>

        {guestCount <= 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Hãy nhập số lượng khách cho bàn chính trước khi xếp bàn đoàn.</p>
        ) : candidateTables.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Không còn bàn trống phù hợp để xếp thêm cho đoàn.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {getSuggestedTables(sourceTable, candidateTables).map((table) => {
              const selected = selectedIds.includes(table.id);
              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => toggleTable(table.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${selected ? "border-sky-400 bg-sky-50" : "border-slate-100 bg-white hover:border-sky-200"}`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded border-2 ${selected ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300"}`}>
                    {selected && <CheckCircle2 size={13} />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-black text-slate-800">{table.name} · {table.capacity} chỗ</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={11} /> {table.area_name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={handleClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={loading || guestCount <= 0 || totalCapacity < guestCount || selectedIds.length === 0} className="rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            {loading ? "Đang xếp bàn..." : "Xác nhận xếp bàn đoàn"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
