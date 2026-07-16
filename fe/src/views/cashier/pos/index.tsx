import React, { useState, useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { TABLE_STATUS } from "../../../constants/tableStatus";
import { updateOrderStatus as updateOrderStatusLocal, updateOrderStatusOnServer } from "../../../store/orderSlice";
import { releaseTableToCleaning } from "../../../store/tableSlice";
import { createPaymentApi } from "../../../services/paymentService";
import { getRestaurantInfo } from "../../../services/restaurantInfoService";
import {
  CreditCard,
  DollarSign,
  Wallet,
  Users,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "../../../components/Modal";

type SplitMode = "equal" | "items";

export const CashierPOS: React.FC = () => {
  const dispatch = useAppDispatch();
  const tables = useAppSelector((state) => state.tables.tables);
  const orders = useAppSelector((state) => state.orders.orders);

  // Default to Bàn 4 (t4) if it is occupied, otherwise the first occupied table, otherwise null
  const occupiedTables = useMemo(() => {
    return tables.filter(
      (t) =>
        t.status === TABLE_STATUS.OCCUPIED ||
        t.status === TABLE_STATUS.CLEANING,
    );
  }, [tables]);

  const initialSelectedTableId = useMemo(() => {
    const hasTable3 = occupiedTables.some((t) => t.id === "t3");
    if (hasTable3) return "t3";
    return occupiedTables[0]?.id || null;
  }, [occupiedTables]);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    initialSelectedTableId,
  );
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitCount, setSplitCount] = useState<number>(2);
  const [tipAmount, setTipAmount] = useState<string>("0");
  const [vatEnabled, setVatEnabled] = useState<boolean>(true);
  const [vatRate, setVatRate] = useState<number>(10);
  const [roundEnabled, setRoundEnabled] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [lastPaidTable, setLastPaidTable] = useState<string>("");

  useEffect(() => {
    getRestaurantInfo()
      .then((info) => {
        setVatRate(info.tax_rate ?? 10);
      })
      .catch(() => {});
  }, []);

  // Update selected table if it was null but now we have tables
  React.useEffect(() => {
    if (!selectedTableId && initialSelectedTableId) {
      setSelectedTableId(initialSelectedTableId);
    }
  }, [initialSelectedTableId, selectedTableId]);

  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  const activeOrder = useMemo(() => {
    if (!selectedTable || !selectedTable.currentOrderId) return null;
    return orders.find((o) => o.id === selectedTable.currentOrderId) || null;
  }, [orders, selectedTable]);

  // Calculations
  const subtotal = activeOrder ? activeOrder.totalAmount : 0;
  const tax = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const tipVal = parseFloat(tipAmount) || 0;
  let totalAmount = subtotal + tax + tipVal;
  if (roundEnabled) {
    // Round to nearest 1000 (since UI multiplies by 1000 later)
    totalAmount = Math.round(totalAmount / 1) ;
  }

  const perPersonAmount = useMemo(() => {
    const count = Math.max(1, splitCount);
    return totalAmount / count;
  }, [totalAmount, splitCount]);

  const handleProcessPayment = async (method: string) => {
    if (!activeOrder || !selectedTableId) return;

    try {
      const amountVnd = Math.round(totalAmount * 1000); // convert UI units to VND
      await createPaymentApi({
        orderId: activeOrder.id,
        amount: amountVnd,
        paymentMethod: method,
        status: "completed",
        completedAt: new Date().toISOString(),
        notes: JSON.stringify({ vatEnabled, roundEnabled }),
        discountAmount: 0,
      });

      // Optimistically update UI and sync with server
      dispatch(updateOrderStatusLocal({ id: activeOrder.id, status: ORDER_STATUS.PAID }));
      dispatch(updateOrderStatusOnServer({ id: activeOrder.id, status: ORDER_STATUS.PAID }));
      dispatch(releaseTableToCleaning({ id: selectedTableId }));

      setLastPaidTable(selectedTable?.name || "Bàn");
      setPaymentSuccess(true);
      setSelectedTableId(null);
      setTipAmount("0");
      setSplitCount(2);
    } catch (err: any) {
      console.error("Payment failed:", err);
      // Optionally show error to user
      alert("Thanh toán thất bại. Vui lòng thử lại.");
    }
  };

  const openConfirm = (method: string) => {
    // attach method temporarily via data-attr on window, or closure
    (window as any).__pmethod = method;
    setConfirmOpen(true);
  };

  const confirmAndPay = async () => {
    const method = (window as any).__pmethod || "cash";
    setConfirmOpen(false);
    await handleProcessPayment(method);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-800">
      {/* Top bar for Table Selection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black font-display text-slate-900">
            Danh sách Bàn Đang Phục Vụ
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn bàn cần thanh toán dưới đây
          </p>
        </div>

        {/* Horizontal table picker */}
        <div className="flex flex-wrap gap-2">
          {occupiedTables.length === 0 ? (
            <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Không có bàn nào cần thanh toán lúc này.
            </span>
          ) : (
            occupiedTables.map((table) => {
              const isSelected = selectedTableId === table.id;
              return (
                <button
                  key={table.id}
                  onClick={() => {
                    setSelectedTableId(table.id);
                    setPaymentSuccess(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-display tracking-wide border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#e8f1ff] border-[#0f62fe] text-[#0f62fe] shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {table.name} (
                  {table.status === TABLE_STATUS.CLEANING
                    ? "Chờ dọn"
                    : "Đang ăn"}
                  )
                </button>
              );
            })
          )}
        </div>
      </div>

      {paymentSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 text-emerald-900 animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm">Thanh toán thành công!</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Đơn hàng của <strong>{lastPaidTable}</strong> đã được thanh toán
              hoàn tất. Bàn hiện đang chờ dọn dẹp.
            </p>
          </div>
        </div>
      )}

      {selectedTable && activeOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Card 1: Hóa đơn chi tiết */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5 shadow-2xs">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="text-base font-black text-slate-900 font-display">
                Hóa đơn chi tiết
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {selectedTable.name} - Xử lý thanh toán và tách bill
              </p>
            </div>

            {/* Invoice Items */}
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {activeOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-3 px-4 bg-slate-50 hover:bg-slate-100/50 transition-colors rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                      {item.quantity}x
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-slate-900">
                    {(item.price * item.quantity * 1000).toLocaleString(
                      "vi-VN",
                    )}{" "}
                    vnđ
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations block */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3.5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Tạm tính</span>
                <span className="font-bold text-slate-900">
                  {(subtotal * 1000).toLocaleString("vi-VN")} vnđ
                </span>
              </div>

              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Thuế ({vatRate}%)</span>
                <span className="font-bold text-slate-900">
                  {(tax * 1000).toLocaleString("vi-VN")} vnđ
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Tip (tùy chọn)</span>
                <div className="relative rounded-lg bg-slate-50 border border-slate-200 flex items-center px-3 py-1">
                  <input
                    type="text"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="w-16 bg-transparent text-right font-bold focus:outline-none text-slate-900 text-xs"
                    placeholder="0"
                  />
                  <span className="text-[11px] text-slate-500 ml-1">
                    .000 vnđ
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-2">
                  <input
                    id="vat"
                    type="checkbox"
                    checked={vatEnabled}
                    onChange={(e) => setVatEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="vat">Áp thuế VAT {vatRate}%</label>
                </span>
                <span className="text-xs text-slate-500">{vatEnabled ? "Bật" : "Tắt"}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-2">
                  <input
                    id="round"
                    type="checkbox"
                    checked={roundEnabled}
                    onChange={(e) => setRoundEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="round">Làm tròn</label>
                </span>
                <span className="text-xs text-slate-500">{roundEnabled ? "Bật" : "Tắt"}</span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-1">
                <span className="text-sm font-black text-slate-900 font-display">
                  Tổng cộng
                </span>
                <span className="text-xl font-black text-[#0f62fe] font-display">
                  {(totalAmount * 1000).toLocaleString("vi-VN")} vnđ
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Tách hóa đơn */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-6 shadow-2xs">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="text-base font-black text-slate-900 font-display">
                Tách hóa đơn
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Hỗ trợ chia đều hoặc chia theo món ăn
              </p>
            </div>

            {/* Tách tabs */}
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSplitMode("equal")}
                className={`py-2 text-xs font-bold font-display rounded-lg transition-all cursor-pointer ${
                  splitMode === "equal"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Chia đều
              </button>
              <button
                onClick={() => setSplitMode("items")}
                className={`py-2 text-xs font-bold font-display rounded-lg transition-all cursor-pointer ${
                  splitMode === "items"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tách theo món
              </button>
            </div>

            {splitMode === "equal" ? (
              <div className="flex flex-col gap-5">
                {/* Number of splits input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Số người chia
                  </label>
                  <div className="relative rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center">
                    <Users size={16} className="text-slate-500 mr-2.5" />
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={splitCount}
                      onChange={(e) =>
                        setSplitCount(
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="bg-transparent font-bold text-slate-900 text-sm focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Per person display */}
                <div className="bg-[#e8f1ff] border border-[#d0e2ff] rounded-2xl p-5 text-center flex flex-col gap-1 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-[#0f62fe] tracking-widest">
                    Mỗi người trả
                  </span>
                  <span className="text-2xl font-black text-[#0f62fe] font-display">
                    {(perPersonAmount * 1000).toLocaleString("vi-VN")} vnđ
                  </span>
                </div>

                {/* Guest Breakdown */}
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 max-h-[160px] overflow-y-auto pr-1">
                  {Array.from({ length: splitCount }).map((_, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs font-bold py-2.5 px-3.5 bg-slate-50/50 rounded-xl border border-slate-100"
                    >
                      <span className="text-slate-500 flex items-center gap-2">
                        <Users size={12} className="text-slate-500" /> Khách{" "}
                        {i + 1}
                      </span>
                      <span className="text-slate-900 font-extrabold">
                        {(perPersonAmount * 1000).toLocaleString("vi-VN")} vnđ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Split by Item View */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5 text-xs text-blue-800 leading-relaxed font-semibold">
                  <Info
                    size={16}
                    className="text-blue-500 flex-shrink-0 mt-0.5"
                  />
                  <span>
                    Chế độ tách theo món cho phép gán riêng từng món cho từng
                    thực khách. Chọn phương thức thanh toán bên dưới để tiếp tục
                    thanh toán tổng hóa đơn.
                  </span>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Đơn giá: {(item.price * 1000).toLocaleString("vi-VN")}{" "}
                          vnđ
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2 py-1 rounded">
                          Khách 1
                        </span>
                        <span className="font-bold text-slate-900">
                          {(item.price * item.quantity * 1000).toLocaleString(
                            "vi-VN",
                          )}{" "}
                          vnđ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method Actions */}
            <div className="border-t border-slate-100 pt-5 mt-auto flex flex-col gap-3">
              <label className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                Phương thức thanh toán
              </label>

                <div className="flex flex-col gap-2">
                <button
                  onClick={() => openConfirm("cash")}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-slate-300"
                >
                  <DollarSign size={15} className="text-slate-500" /> Tiền mặt
                </button>
                <button
                  onClick={() => openConfirm("card")}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-slate-300"
                >
                  <CreditCard size={15} className="text-slate-500" /> Thẻ tín
                  dụng
                </button>
                <button
                  onClick={() => openConfirm("wallet")}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all hover:border-slate-300"
                >
                  <Wallet size={15} className="text-slate-500" /> Ví điện tử
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-500">
          <Info size={40} className="mx-auto text-slate-600 mb-3" />
          <h4 className="font-bold text-sm text-slate-700">
            Chưa chọn bàn nào để thanh toán
          </h4>
          <p className="text-xs mt-1">
            Hãy chọn một bàn đang hoạt động ở danh sách phía trên để bắt đầu lập
            hóa đơn.
          </p>
        </div>
      )}

      {confirmOpen && (
        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Xác nhận Thanh toán"
          footer={
            <>
              <button
                onClick={() => setConfirmOpen(false)}
                className="py-2 px-4 rounded-lg bg-white border mr-2"
              >
                Hủy
              </button>
              <button
                onClick={() => confirmAndPay()}
                className="py-2 px-4 rounded-lg bg-blue-600 text-white"
              >
                Xác nhận & Thanh toán
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p>
              Hóa đơn: <strong>{selectedTable?.name}</strong>
            </p>
            <p>
              Tạm tính: <strong>{(subtotal * 1000).toLocaleString("vi-VN")} vnđ</strong>
            </p>
            <p>
              Thuế: <strong>{(tax * 1000).toLocaleString("vi-VN")} vnđ</strong>
            </p>
            <p>
              Tip: <strong>{(tipVal * 1000).toLocaleString("vi-VN")} vnđ</strong>
            </p>
            <p>
              Tổng: <strong>{(totalAmount * 1000).toLocaleString("vi-VN")} vnđ</strong>
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
