import React, { useEffect, useState } from "react";
import { Modal } from "../../../components/Modal";
import { Users, Utensils, CreditCard, RefreshCw, CheckCircle2 } from "lucide-react";
import { getTableSplits, type ActiveTableSplitsResponse } from "../../../services/tableService";
import { useNavigate } from "react-router-dom";

interface SubOrderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  tableName: string;
}

export const SubOrderSelectionModal: React.FC<SubOrderSelectionModalProps> = ({
  isOpen,
  onClose,
  tableId,
  tableName,
}) => {
  const [data, setData] = useState<ActiveTableSplitsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const fetchSplits = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const res = await getTableSplits(tableId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tableId) {
      fetchSplits();
    }
  }, [isOpen, tableId]);

  const splitsList = data ? (data.splits || data.subOrders || []) : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Phiên tách bàn — Bàn ${tableName}`}
      size="md"
      theme="light"
    >
      <div className="space-y-4 py-1">
        <div className="flex items-center justify-between bg-indigo-50 p-3.5 rounded-2xl border border-indigo-100">
          <div>
            <p className="text-xs font-bold text-indigo-900">Bàn đang có nhiều Sub-Orders độc lập</p>
            <p className="text-[11px] text-indigo-700 mt-0.5">
              Chọn nhóm để xem order, gọi thêm món hoặc chuyển thanh toán cho nhóm đó.
            </p>
          </div>
          <button
            onClick={fetchSplits}
            disabled={loading}
            className="p-2 bg-white rounded-xl text-indigo-600 hover:bg-indigo-100 transition-all shadow-xs"
            title="Tải lại danh sách"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-sm font-semibold text-slate-500 mt-2">Đang tải thông tin sub-orders...</p>
          </div>
        ) : splitsList.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-500">Bàn này không có phiên tách bàn hoạt động.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {splitsList.map((split: any) => {
              const isPaid = split.status === "paid";
              return (
                <div
                  key={split.id || split.splitId}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isPaid
                      ? "bg-slate-50 border-slate-200 opacity-75"
                      : "bg-white border-indigo-100 shadow-sm hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-black text-indigo-700">{split.child_label || split.childLabel}</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <Users size={12} />
                        {split.guest_count || split.guestCount} khách
                      </span>
                      {isPaid ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Đã thanh toán
                        </span>
                      ) : (
                        <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          Đang phục vụ
                        </span>
                      )}
                    </div>

                    <span className="text-base font-black text-slate-800">
                      {Number(split.total_amount || split.totalAmount || 0).toLocaleString("vi-VN")}₫
                    </span>
                  </div>

                  {/* Items brief */}
                  {split.items && split.items.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {split.items.map((item: any) => (
                        <span
                          key={item.id}
                          className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {item.item_name || item.name} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {!isPaid && (
                    <div className="mt-3 flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/waiter/order?orderId=${split.child_order_id || split.childOrderId}&tableId=${tableId}`);
                        }}
                        className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Utensils size={14} />
                        Gọi món / Xem Order
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/cashier/payment?orderId=${split.child_order_id || split.childOrderId}`);
                        }}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <CreditCard size={14} />
                        Thanh toán Nhóm
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
