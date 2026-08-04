import React, { useEffect, useState } from "react";
import { Modal } from "../../../components/Modal";
import { Users, Utensils, CreditCard, RefreshCw, CheckCircle2, Clock, FileText, RotateCcw } from "lucide-react";
import { getTableSplits, type ActiveTableSplitsResponse } from "../../../services/tableService";
import { requestPayment, cancelPaymentRequest } from "../../../services/waiterService";
import { toast } from "react-hot-toast";
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
  const [requestingPaymentOrderId, setRequestingPaymentOrderId] = useState<number | null>(null);
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

  const handleRequestPayment = async (childOrderId: number, childLabel: string, items: any[]) => {
    // Kiểm tra nếu có món chưa ra (cooking / pending)
    const unfinishedItems = (items || []).filter(
      (i) => i.status === "cooking" || i.status === "pending" || i.status === "received"
    );
    if (unfinishedItems.length > 0) {
      toast.error(
        `⚠️ Nhóm ${childLabel} vẫn còn ${unfinishedItems.length} món chưa nấu/chưa mang ra bếp! Vui lòng hoàn tất hoặc hủy món trước khi gửi yêu cầu thanh toán.`
      );
      return;
    }

    try {
      setRequestingPaymentOrderId(childOrderId);
      await requestPayment(childOrderId);
      toast.success(`Đã gửi yêu cầu thanh toán cho nhóm ${childLabel}`);
      await fetchSplits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể gửi yêu cầu thanh toán");
    } finally {
      setRequestingPaymentOrderId(null);
    }
  };

  const handleCancelPayment = async (childOrderId: number, childLabel: string) => {
    try {
      setRequestingPaymentOrderId(childOrderId);
      await cancelPaymentRequest(childOrderId);
      toast.success(`Đã hủy yêu cầu thanh toán cho nhóm ${childLabel}. Chuyển về Đang phục vụ!`);
      await fetchSplits();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể hủy yêu cầu thanh toán");
    } finally {
      setRequestingPaymentOrderId(null);
    }
  };

  const splitsList = data ? data.splits || data.subOrders || [] : [];

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
            className="p-2 bg-white rounded-xl text-indigo-600 hover:bg-indigo-100 transition-all shadow-xs cursor-pointer"
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
              const itemStatus = split.order_status || split.status || "serving";
              const isPaid = itemStatus === "paid" || itemStatus === "completed";
              const isPendingPayment = itemStatus === "pending_payment";
              const childOrderId = split.child_order_id || split.childOrderId;
              const childLabel = split.child_label || split.childLabel;

              return (
                <div
                  key={split.id || split.splitId}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isPaid
                      ? "bg-slate-50 border-slate-200 opacity-75"
                      : isPendingPayment
                      ? "bg-rose-50/50 border-rose-200 shadow-sm hover:border-rose-300"
                      : "bg-white border-indigo-100 shadow-sm hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-black text-indigo-700">{childLabel}</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <Users size={12} />
                        {split.guest_count || split.guestCount} khách
                      </span>
                      {isPaid ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Đã thanh toán
                        </span>
                      ) : isPendingPayment ? (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                          <Clock size={12} />
                          Chờ thanh toán
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Utensils size={12} />
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
                          className={`text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                            item.status === "cooking" || item.status === "pending"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.item_name || item.name} × {item.quantity}
                          {item.status === "cooking" && <span className="text-[10px] text-amber-700 font-bold">(Chờ nấu)</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {!isPaid && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/waiter/orders/${tableId}?orderId=${childOrderId}`);
                        }}
                        className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Utensils size={14} />
                        Gọi món / Xem Order
                      </button>

                      {!isPendingPayment ? (
                        <button
                          onClick={() => handleRequestPayment(childOrderId, childLabel, split.items || [])}
                          disabled={requestingPaymentOrderId === childOrderId}
                          className="flex-1 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <FileText size={14} />
                          {requestingPaymentOrderId === childOrderId ? "Đang gửi..." : "Yêu cầu thanh toán"}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleCancelPayment(childOrderId, childLabel)}
                            disabled={requestingPaymentOrderId === childOrderId}
                            className="px-3 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                            title="Hủy trạng thái Chờ thanh toán để tiếp tục phục vụ & gọi món"
                          >
                            <RotateCcw size={14} />
                            Hủy chờ TT
                          </button>

                          <button
                            onClick={() => {
                              onClose();
                              navigate(`/cashier/payment?orderId=${childOrderId}`);
                            }}
                            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <CreditCard size={14} />
                            Thu ngân thanh toán
                          </button>
                        </>
                      )}
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
