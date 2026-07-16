import React, { useState, useMemo } from "react";
import { GitMerge, Check, AlertCircle } from "lucide-react";
import { Modal } from "../../../../components/Modal";
import type { Invoice } from "../../../../interfaces/invoice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onMerge: (invoiceIds: string[]) => void;
  loading: boolean;
}

const formatVnd = (n: number) => (n * 1000).toLocaleString("vi-VN");

export const MergeBillModal: React.FC<Props> = ({ isOpen, onClose, invoices, onMerge, loading }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const unpaidInvoices = useMemo(
    () => invoices.filter((inv) => inv.invoiceStatus === "unpaid"),
    [invoices],
  );

  const mergedTotal = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const inv = invoices.find((i) => i.id === id);
      return sum + (inv?.totalAmount || 0);
    }, 0);
  }, [selectedIds, invoices]);

  const mergedItemCount = useMemo(() => {
    const ids = new Set<string>();
    for (const id of selectedIds) {
      const inv = invoices.find((i) => i.id === id);
      if (inv) {
        for (const item of inv.items) {
          ids.add(item.menuItemId?.toString() || item.name);
        }
      }
    }
    return ids.size;
  }, [selectedIds, invoices]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleMerge = () => {
    if (selectedIds.length < 2) return;
    onMerge(selectedIds);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gộp hóa đơn" size="md" theme="light">
      <div className="space-y-4">
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-800 font-semibold">
          <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <span>Chọn ít nhất 2 hóa đơn chưa thanh toán để gộp lại thành một.</span>
        </div>

        {/* Invoice list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {unpaidInvoices.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">
              Không có hóa đơn nào chưa thanh toán để gộp
            </div>
          ) : (
            unpaidInvoices.map((inv) => {
              const isSelected = selectedIds.includes(inv.id);
              return (
                <button
                  key={inv.id}
                  onClick={() => toggleSelect(inv.id)}
                  className={`w-full text-left flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-slate-100 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        {inv.tableName || "Mang về"} &middot; #{inv.id.slice(-6)}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {inv.customerName || "Khách lẻ"} &middot; {inv.items.length} món
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900">{formatVnd(inv.totalAmount)} vnđ</span>
                </button>
              );
            })
          )}
        </div>

        {/* Summary */}
        {selectedIds.length >= 2 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-700 font-semibold">Số hóa đơn gộp</span>
              <span className="font-black text-emerald-900">{selectedIds.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-700 font-semibold">Tổng số món (duy nhất)</span>
              <span className="font-black text-emerald-900">{mergedItemCount}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-emerald-200 pt-2">
              <span className="text-emerald-800 font-bold">Tổng sau gộp</span>
              <span className="font-black text-emerald-900 text-base">{formatVnd(mergedTotal)} vnđ</span>
            </div>
          </div>
        )}

        <button
          onClick={handleMerge}
          disabled={loading || selectedIds.length < 2}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <GitMerge size={15} />
          {loading ? "Đang gộp..." : `Gộp ${selectedIds.length} hóa đơn`}
        </button>
      </div>
    </Modal>
  );
};
