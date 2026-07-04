import React, { useState, useMemo } from "react";
import { Scissors, Users, ListChecks, Info } from "lucide-react";
import { Modal } from "../../../../components/Modal";
import type { Invoice, SplitBillGroup } from "../../../../interfaces/invoice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSplitEqual: (parts: number) => void;
  onSplitByItems: (groups: SplitBillGroup[]) => void;
  loading: boolean;
}

const formatVnd = (n: number) => (n * 1000).toLocaleString("vi-VN");

export const SplitBillModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoice,
  onSplitEqual,
  onSplitByItems,
  loading,
}) => {
  const [mode, setMode] = useState<"equal" | "items">("equal");
  const [splitCount, setSplitCount] = useState(2);
  const [itemAssignments, setItemAssignments] = useState<Record<number, number>>({});
  const [groupCount, setGroupCount] = useState(2);

  const perPerson = useMemo(() => {
    const subtotal = invoice.totalAmount;
    const perPart = Math.floor(subtotal / splitCount);
    const remainder = subtotal - perPart * splitCount;
    return Array.from({ length: splitCount }, (_, i) =>
      i === splitCount - 1 ? perPart + remainder : perPart,
    );
  }, [invoice.totalAmount, splitCount]);

  const groupTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let g = 0; g < groupCount; g++) {
      totals[g] = 0;
    }
    for (const [idxStr, groupIdx] of Object.entries(itemAssignments)) {
      const idx = Number(idxStr);
      const item = invoice.items[idx];
      if (item && totals[groupIdx] !== undefined) {
        totals[groupIdx] += item.price * item.quantity;
      }
    }
    return totals;
  }, [itemAssignments, invoice.items, groupCount]);

  const allAssigned = useMemo(() => {
    return invoice.items.every((_, idx) => itemAssignments[idx] !== undefined);
  }, [invoice.items, itemAssignments]);

  const handleAssignItem = (itemIdx: number, groupIdx: number) => {
    setItemAssignments((prev) => ({ ...prev, [itemIdx]: groupIdx }));
  };

  const handleSplitEqual = () => {
    onSplitEqual(splitCount);
  };

  const handleSplitByItems = () => {
    const groups: SplitBillGroup[] = Array.from({ length: groupCount }, (_, i) => ({
      label: `Nhóm ${i + 1}`,
      itemIndices: [],
    }));
    for (const [idxStr, groupIdx] of Object.entries(itemAssignments)) {
      if (groups[groupIdx]) {
        groups[groupIdx].itemIndices.push(Number(idxStr));
      }
    }
    const nonEmpty = groups.filter((g) => g.itemIndices.length > 0);
    if (nonEmpty.length < 2) return;
    onSplitByItems(nonEmpty);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tách hóa đơn" size="lg" theme="light">
      {/* Mode tabs */}
      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-5">
        <button
          onClick={() => setMode("equal")}
          className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mode === "equal" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={14} /> Chia đều
        </button>
        <button
          onClick={() => setMode("items")}
          className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mode === "items" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ListChecks size={14} /> Tách theo món
        </button>
      </div>

      {mode === "equal" ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Số người chia</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-lg font-bold cursor-pointer hover:bg-slate-50"
              >
                -
              </button>
              <input
                type="number"
                min={2}
                max={20}
                value={splitCount}
                onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-20 text-center text-lg font-black border border-slate-200 rounded-xl py-2 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-lg font-bold cursor-pointer hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Per-person breakdown */}
          <div className="space-y-2 max-h-[240px] overflow-y-auto">
            {perPerson.map((amount, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Users size={12} className="text-slate-400" /> Khách {i + 1}
                  {i === splitCount - 1 && splitCount > 1 && (
                    <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                      +lẻ
                    </span>
                  )}
                </span>
                <span className="text-xs font-black text-slate-900">{formatVnd(amount)} vnđ</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSplitEqual}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Scissors size={15} />
            {loading ? "Đang tách..." : `Tách thành ${splitCount} phần`}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-800 font-semibold">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span>Chọn nhóm cho từng món ăn. Mỗi nhóm sẽ thành một hóa đơn riêng.</span>
          </div>

          {/* Group count */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">Số nhóm</label>
            <input
              type="number"
              min={2}
              max={10}
              value={groupCount}
              onChange={(e) => {
                const val = Math.max(2, parseInt(e.target.value) || 2);
                setGroupCount(val);
                setItemAssignments({});
              }}
              className="w-16 text-center text-xs font-bold border border-slate-200 rounded-lg py-1.5 bg-slate-50 focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Item assignment */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {invoice.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5 px-3.5 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {item.quantity}x
                  </span>
                  <span className="text-xs font-bold text-slate-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: groupCount }, (_, g) => (
                    <button
                      key={g}
                      onClick={() => handleAssignItem(idx, g)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                        itemAssignments[idx] === g
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {g + 1}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Group totals */}
          <div className="space-y-1.5">
            {Array.from({ length: groupCount }, (_, g) => (
              <div
                key={g}
                className="flex justify-between items-center text-xs py-2 px-3.5 rounded-xl border border-slate-100 bg-white"
              >
                <span className="font-bold text-slate-600">Nhóm {g + 1}</span>
                <span className="font-black text-slate-900">{formatVnd(groupTotals[g] || 0)} vnđ</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSplitByItems}
            disabled={loading || !allAssigned}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Scissors size={15} />
            {loading ? "Đang tách..." : "Tách theo món"}
          </button>
        </div>
      )}
    </Modal>
  );
};
