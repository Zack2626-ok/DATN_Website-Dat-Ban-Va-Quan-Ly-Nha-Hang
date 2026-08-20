import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Wallet, ShieldAlert, Users, Inbox, Loader2, Building2, Calendar, ReceiptText, RotateCcw, CheckCircle2, Image, X, Clock, Edit3, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { KpiCard } from "./kpicard";
import { PayDebtModal } from "./paydebtmodal";
import { RescheduleDueModal } from "./RescheduleDueModal";

export const LossDebtReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    variances: [],
    supplierDebts: [],
    recentPayments: [],
    summary: { totalDebt: 0, overdueDebt: 0, supplierCount: 0, overdueCount: 0 },
  });

  const [payModal, setPayModal] = useState<{ open: boolean; supplier: any | null }>({
    open: false,
    supplier: null,
  });

  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; debtItem: any | null }>({
    open: false,
    debtItem: null,
  });

  const [viewProofImage, setViewProofImage] = useState<string | null>(null);

  // Phân trang & Xóa mềm lịch sử giao dịch
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 6;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi lịch sử giao dịch này khỏi danh sách?")) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await api.delete(`/v1/inventory/debt-payments/${id}`);
      if (res.data.success) {
        toast.success("Đã xóa bản ghi lịch sử thành công!");
        fetchData();
      }
    } catch (err: any) {
      console.error("Lỗi xóa bản ghi:", err);
      toast.error(err?.response?.data?.message || "Không thể xóa bản ghi lịch sử.");
    } finally {
      setDeletingId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/v1/analytics/loss-debt");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy báo cáo hao hụt công nợ:", error);
      toast.error("Không thể tải báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 font-sans text-[#1A1A1A]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Báo cáo công nợ nhà cung cấp
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Quản lý và thanh toán công nợ nhà cung cấp theo từng phiếu nhập — Admin & Quản lý
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tổng công nợ" value={formatCurrency(data.summary.totalDebt)} icon={Wallet} color="blue" />
        <KpiCard label="Nợ quá hạn" value={formatCurrency(data.summary.overdueDebt)} icon={ShieldAlert} color="red" />
        <KpiCard label="NCC đang nợ" value={`${data.summary.supplierCount} NCC`} icon={Users} color="amber" />
        <KpiCard label="NCC quá hạn" value={`${data.summary.overdueCount} NCC`} icon={AlertTriangle} color="red" />
      </div>

      {/* Supplier debt table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="border-b border-sky-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-playfair text-base font-bold text-sky-900">Chi tiết công nợ theo phiếu nhập & NCC</h2>
            <span className="text-xs text-slate-500 font-semibold">Theo dõi từng khoản nợ, chốt hạn và gia hạn nợ</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/60 text-[11px] uppercase tracking-wide text-slate-600 font-bold border-b border-sky-100">
              <tr>
                <th className="px-5 py-3.5 font-bold">Mã phiếu / Ngày nhập</th>
                <th className="px-5 py-3.5 font-bold">Nhà cung cấp</th>
                <th className="px-5 py-3.5 font-bold">Hạn thanh toán</th>
                <th className="px-5 py-3.5 text-right font-bold">Tổng tiền / Đã trả</th>
                <th className="px-5 py-3.5 text-right font-bold">Dư nợ còn lại</th>
                <th className="px-5 py-3.5 font-bold">Trạng thái</th>
                <th className="px-5 py-3.5 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={22} className="animate-spin text-sky-400" />
                      <span className="text-sm">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : data.supplierDebts.filter((d: any) => d.amount > 0).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={26} className="text-slate-300" />
                      <span className="text-sm">Không có công nợ</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.supplierDebts
                  .filter((d: any) => d.amount > 0)
                  .map((row: any, idx: number) => (
                  <tr
                    key={row.id || idx}
                    className={`border-t border-sky-50 transition-colors hover:bg-sky-50/50 ${
                      idx % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      <div className="font-mono text-sky-800 font-black">{row.ticketCode || row.id}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        {row.importDate ? new Date(row.importDate).toLocaleString("vi-VN") : "—"}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{row.supplierName}</div>
                      {row.phone && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.phone}</div>}
                    </td>

                    <td className="px-5 py-3.5 font-semibold">
                      {row.dueDate ? (
                        <div className="flex items-center gap-1 text-slate-800 font-bold">
                          <Clock size={11} className={row.status === "Quá hạn" ? "text-rose-500" : "text-amber-500"} />
                          <span>{new Date(row.dueDate).toLocaleDateString("vi-VN")}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-dashed border-slate-300">
                          Chưa chốt hạn
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium">
                      <div className="font-bold text-slate-800">{formatCurrency(row.totalAmount || row.amount)}</div>
                      {Number(row.paidAmount) > 0 && (
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          Đã trả: {formatCurrency(row.paidAmount)}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-black tabular-nums text-rose-600 text-sm">
                      {formatCurrency(row.amount)}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          row.status === "Đã thanh toán"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : row.status === "Quá hạn"
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : row.status === "Sắp đến hạn"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : row.status === "Chưa chốt hạn"
                            ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                            : "bg-sky-50 text-sky-700 border border-sky-200/60"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.status === "Đã thanh toán"
                              ? "bg-emerald-500"
                              : row.status === "Quá hạn"
                              ? "bg-rose-500"
                              : row.status === "Sắp đến hạn"
                              ? "bg-amber-500"
                              : row.status === "Chưa chốt hạn"
                              ? "bg-purple-500"
                              : "bg-sky-500"
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.amount > 0 && !row.dueDate && (
                          <button
                            type="button"
                            onClick={() => setRescheduleModal({ open: true, debtItem: row })}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-3xs active:scale-95"
                          >
                            <Calendar size={11} /> Chốt hạn
                          </button>
                        )}

                        {row.amount > 0 && row.dueDate && (
                          <button
                            type="button"
                            onClick={() => setRescheduleModal({ open: true, debtItem: row })}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 text-[11px] font-bold border border-slate-200 transition-colors cursor-pointer active:scale-95"
                            title="Gia hạn / Đổi hạn thanh toán"
                          >
                            <Edit3 size={11} className="text-amber-600" /> Sửa hạn
                          </button>
                        )}

                        {row.amount > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayModal({ open: true, supplier: { ...row, rawId: row.supplierId || row.rawId } })}
                            className="rounded-lg bg-sky-600 hover:bg-sky-700 px-2.5 py-1 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-3xs active:scale-95"
                          >
                            Thanh toán
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified History Section: Debt Payments & Supplier Returns */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText size={18} className="text-sky-600" />
            <h2 className="font-playfair text-base font-bold text-slate-800">
              Lịch sử thanh toán & Trả hàng nhà cung cấp
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Theo dõi các đợt trả nợ (1 phần / tất toán) và hàng trả lại NCC
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Mã giao dịch / Thời gian</th>
                <th className="px-5 py-3">Loại GD & Nhà cung cấp</th>
                <th className="px-5 py-3 text-right">Số tiền (VNĐ)</th>
                <th className="px-5 py-3">Hình thức</th>
                <th className="px-5 py-3 text-right">Dư nợ còn lại</th>
                <th className="px-5 py-3">Ghi chú</th>
                <th className="px-5 py-3 text-center">Chứng từ</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 size={18} className="animate-spin text-sky-400 mx-auto mb-1" />
                    Đang tải lịch sử giao dịch...
                  </td>
                </tr>
              ) : !data.recentPayments || data.recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                    Chưa có lịch sử thanh toán hoặc trả hàng nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                (data.recentPayments || [])
                  .slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize)
                  .map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <ReceiptText size={13} className="text-sky-600 shrink-0" />
                        <span>{p.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(p.paidAt).toLocaleString("vi-VN")}
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <div className="font-bold text-sky-900 text-sm mb-0.5">{p.supplierName}</div>
                      {p.category === "return" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          <RotateCcw size={10} /> Trả hàng NCC
                        </span>
                      ) : p.currentSupplierDebt > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/60">
                          <AlertTriangle size={10} /> Trả nợ 1 phần
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 size={10} /> Tất toán công nợ
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right font-black text-slate-800 text-sm tabular-nums">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.method === "cash"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : p.method === "bank_transfer"
                            ? "bg-sky-50 text-sky-700 border border-sky-200/60"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                        }`}
                      >
                        {p.method === "cash" ? (
                          <Wallet size={11} className="text-amber-600" />
                        ) : p.method === "bank_transfer" ? (
                          <Building2 size={11} className="text-sky-600" />
                        ) : (
                          <RotateCcw size={11} className="text-indigo-600" />
                        )}
                        {p.method === "cash" ? "Tiền mặt" : p.method === "bank_transfer" ? "Chuyển khoản" : "Trả hàng kho"}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-right font-black tabular-nums">
                      {p.currentSupplierDebt > 0 ? (
                        <span className="text-rose-600 font-extrabold">{formatCurrency(p.currentSupplierDebt)}</span>
                      ) : (
                        <span className="text-emerald-600 font-extrabold">0 đ (Hết nợ)</span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-slate-600 max-w-[220px]">
                      <div className="truncate font-semibold text-slate-800" title={p.note || "—"}>
                        {p.note || "—"}
                      </div>
                    </td>

                    <td className="px-5 py-3 text-center">
                      {p.proofImage ? (
                        <button
                          onClick={() => setViewProofImage(p.proofImage)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-800 rounded-lg text-[10px] font-black border border-sky-200 transition-colors cursor-pointer shadow-3xs"
                        >
                          <Image size={11} /> Xem ảnh
                        </button>
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id)}
                        disabled={deletingId === p.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
                        title="Xóa bản ghi lịch sử này"
                      >
                        {deletingId === p.id ? (
                          <Loader2 size={13} className="animate-spin text-rose-500" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data.recentPayments && data.recentPayments.length > historyPageSize && (
          <div className="border-t border-slate-100 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500">
              Hiển thị <span className="font-bold text-slate-800">{(historyPage - 1) * historyPageSize + 1}</span> -{" "}
              <span className="font-bold text-slate-800">{Math.min(historyPage * historyPageSize, data.recentPayments.length)}</span> trên tổng số{" "}
              <span className="font-bold text-slate-800">{data.recentPayments.length}</span> giao dịch
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: Math.ceil(data.recentPayments.length / historyPageSize) }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setHistoryPage(num)}
                  className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    historyPage === num
                      ? "bg-sky-600 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(Math.ceil(data.recentPayments.length / historyPageSize), p + 1))}
                disabled={historyPage === Math.ceil(data.recentPayments.length / historyPageSize)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {payModal.open && payModal.supplier && (
        <PayDebtModal
          supplier={payModal.supplier}
          onClose={() => setPayModal({ open: false, supplier: null })}
          onSuccess={() => {
            setPayModal({ open: false, supplier: null });
            fetchData();
          }}
        />
      )}

      {rescheduleModal.open && rescheduleModal.debtItem && (
        <RescheduleDueModal
          debtItem={rescheduleModal.debtItem}
          onClose={() => setRescheduleModal({ open: false, debtItem: null })}
          onSuccess={() => {
            setRescheduleModal({ open: false, debtItem: null });
            fetchData();
          }}
        />
      )}

      {/* Lightbox Modal for Proof Image */}
      {viewProofImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Image size={16} className="text-sky-600" /> Minh chứng thanh toán
              </h3>
              <button
                onClick={() => setViewProofImage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-2 bg-slate-100 rounded-xl">
              <img src={viewProofImage} alt="Minh chứng thanh toán" className="max-h-[70vh] object-contain rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};