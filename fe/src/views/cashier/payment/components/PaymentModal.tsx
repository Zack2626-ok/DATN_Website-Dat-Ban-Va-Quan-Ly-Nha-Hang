import React, { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Banknote,
  Wallet,
  Receipt,
  Tag,
  BadgePercent,
  QrCode,
  Wrench,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Modal } from "../../../../components/Modal";
import { getRestaurantInfo, type RestaurantInfo } from "../../../../services/restaurantInfoService";
import type { Invoice, PaymentRequest } from "../../../../interfaces/invoice";
import { crmService, type Voucher, type Customer } from "../../../../services/crmService";
import {
  initiateVnPayPayment,
  simulateVnPayPaymentSuccess,
  type VnPaySessionResponse,
} from "../../../../services/vnpayService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onConfirm: (data: PaymentRequest) => void;
  onBankTransferStarted?: (session: any) => void;
  onBankTransferDemoCompleted?: () => void;
  loading: boolean;
}

const formatVnd = (n: number) => Number(n).toLocaleString("vi-VN");

const PAYMENT_METHODS = [
  { value: "cash" as const, label: "Tiền mặt", icon: Banknote, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "vnpay" as const, label: "Cổng VNPay", icon: QrCode, color: "bg-sky-50 border-sky-200 text-sky-700" },
  { value: "card" as const, label: "Thẻ tín dụng", icon: CreditCard, color: "bg-violet-50 border-violet-200 text-violet-700" },
  { value: "momo" as const, label: "Ví MoMo", icon: Wallet, color: "bg-pink-50 border-pink-200 text-pink-700" },
];

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
  loading,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "momo" | "vnpay">("cash");
  const [vatRate, setVatRate] = useState(8);
  const [serviceFeeRate] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [tipAmount] = useState(0);
  const [resInfo, setResInfo] = useState<RestaurantInfo | null>(null);

  const [vnpaySession, setVnpaySession] = useState<VnPaySessionResponse | null>(null);
  const [loadingVnpay, setLoadingVnpay] = useState(false);
  const [vnpayError, setVnpayError] = useState<string | null>(null);
  const [simulatingVnpay, setSimulatingVnpay] = useState(false);
  const [showVnpaySandboxTools, setShowVnpaySandboxTools] = useState(false);

  const [suggestedVouchers, setSuggestedVouchers] = useState<Voucher[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [pointsToUse, setPointsToUse] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      getRestaurantInfo()
        .then((info) => {
          if (info && info.tax_rate !== undefined) {
            setVatRate(Number(info.tax_rate));
          }
          setResInfo(info);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSuggestedVouchers([]);
      setCustomerName(null);
      setMatchedCustomer(null);
      setPointsToUse(0);
      setVnpaySession(null);
      setVnpayError(null);
      setSimulatingVnpay(false);
      return;
    }

    const loadSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const customers = await crmService.getCustomers();

        const normalizePhone = (phone?: string | null) => {
          if (!phone) return "";
          return phone.replace(/\s+/g, "").replace(/^\+84/, "0");
        };

        const customer = customers.find(c => {
          const cPhone = normalizePhone(c.phone);
          const iPhone = normalizePhone(invoice.customerPhone);
          const phoneMatch = cPhone && iPhone && cPhone === iPhone;
          const nameMatch = c.name && invoice.customerName && c.name.toLowerCase().trim() === invoice.customerName.toLowerCase().trim();
          return phoneMatch || nameMatch;
        });

        if (customer) {
          setCustomerName(customer.name);
          setMatchedCustomer(customer);
          const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalAmount;
          
          // Fetch customer-specific redeemed unused vouchers
          const customerVouchers = await crmService.getCustomerUnusedVouchers(customer.id);
          
          const eligible = customerVouchers.filter(v => {
            if (v.is_active !== 1) return false;
            if (v.expired_at && new Date(v.expired_at) < new Date()) return false;
            if (v.max_uses !== null && v.max_uses !== undefined && v.used_count >= v.max_uses) return false;
            if (subtotal < v.min_order) return false;
            return true;
          });
          setSuggestedVouchers(eligible);
        } else {
          setSuggestedVouchers([]);
          setCustomerName(null);
          setMatchedCustomer(null);
          setPointsToUse(0);
        }
      } catch (err) {
        console.error("Failed to load voucher suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [isOpen, invoice.customerPhone, invoice.customerName, invoice.subtotal, invoice.totalAmount]);

  const breakdown = useMemo(() => {
    const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalAmount;
    const vat = Math.round(subtotal * (vatRate / 100));
    const depositAmount = invoice.depositAmount || 0;
    const pointsDiscount = pointsToUse * 100;
    const serviceFee = subtotal * (serviceFeeRate / 100);
    const finalAmount = Math.max(0, subtotal + vat + serviceFee + (tipAmount * 1000) - depositAmount - (voucherAmount * 1000) - pointsDiscount);
    return { subtotal, vat, serviceFee, depositAmount, pointsDiscount, finalAmount };
  }, [invoice.subtotal, invoice.totalAmount, invoice.depositAmount, vatRate, serviceFeeRate, tipAmount, voucherAmount, pointsToUse]);

  useEffect(() => {
    if (paymentMethod === "vnpay" && isOpen) {
      let isCancelled = false;
      setLoadingVnpay(true);
      setVnpayError(null);
      initiateVnPayPayment({
        orderId: invoice.id,
        vatRate,
        voucherCode: voucherCode || undefined,
        voucherAmount: voucherAmount ? voucherAmount * 1000 : undefined,
        pointsUsed: pointsToUse > 0 ? pointsToUse : undefined,
      })
        .then((session) => {
          if (!isCancelled) setVnpaySession(session);
        })
        .catch((err) => {
          if (!isCancelled) setVnpayError(err.message || "Không thể tạo mã VNPay.");
        })
        .finally(() => {
          if (!isCancelled) setLoadingVnpay(false);
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [paymentMethod, isOpen, invoice.id, vatRate, voucherCode, voucherAmount, pointsToUse, breakdown.finalAmount]);

  const handleSimulateVnPaySuccess = async () => {
    setSimulatingVnpay(true);
    setVnpayError(null);
    try {
      await simulateVnPayPaymentSuccess({
        orderId: invoice.id,
        vatRate,
        voucherCode: voucherCode || undefined,
        voucherAmount: voucherAmount ? voucherAmount * 1000 : undefined,
        pointsUsed: pointsToUse > 0 ? pointsToUse : undefined,
      });
      onClose();
    } catch (err: any) {
      setVnpayError(err.message || "Mô phỏng VNPay thất bại.");
    } finally {
      setSimulatingVnpay(false);
    }
  };

  const momoUrl = useMemo(() => {
    const amountVnd = Math.round(breakdown.finalAmount);
    const desc = `Thanh toan HD${invoice.id.slice(-6)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`momo://pay?phone=${resInfo?.hotline || "028 3829 4000"}&amount=${amountVnd}&note=${desc}`)}`;
  }, [resInfo, breakdown.finalAmount, invoice.id]);



  const handleConfirm = () => {
    onConfirm({
      paymentMethod,
      vatRate,
      voucherCode: voucherCode || undefined,
      voucherAmount: voucherAmount ? voucherAmount * 1000 : undefined,
      tipAmount: tipAmount ? tipAmount * 1000 : undefined,
      pointsUsed: pointsToUse > 0 ? pointsToUse : undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh toán hóa đơn" size="lg" theme="light">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Receipt size={16} className="text-blue-600" />
            Chi tiết thanh toán
          </div>

          {/* Subtotal */}
          <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Tạm tính ({invoice.items.length} món)</span>
            <span className="font-bold text-slate-900">{formatVnd(breakdown.subtotal)} vnđ</span>
          </div>

          {/* Deposit */}
          {breakdown.depositAmount > 0 && (
            <div className="flex justify-between text-xs py-2 border-b border-slate-100 text-amber-600">
              <span className="font-bold">Trừ tiền đặt cọc</span>
              <span className="font-bold">- {formatVnd(breakdown.depositAmount)} vnđ</span>
            </div>
          )}

          {/* VAT */}
          <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <BadgePercent size={10} className="text-orange-500" />
              VAT ({vatRate}%)
            </span>
            <span className="font-bold text-slate-900 text-[11px]">{formatVnd(breakdown.vat)} vnđ</span>
          </div>

          {/* Voucher */}
          <div className="space-y-1.5 py-1.5 border-b border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Tag size={10} className="text-pink-500" />
              Voucher
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Mã voucher"
                className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                min={0}
                value={voucherAmount || ""}
                onChange={(e) => setVoucherAmount(Number(e.target.value) || 0)}
                placeholder="Số tiền"
                className="w-20 text-right text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-500 self-center">.000đ</span>
            </div>

            {/* Voucher Suggestions */}
            {customerName && (
              <div className="mt-2 bg-pink-50/40 rounded-lg p-2 border border-pink-100">
                <p className="text-[10px] font-bold text-pink-700 mb-1.5 flex items-center gap-1">
                  💡 Voucher gợi ý cho {customerName}:
                </p>
                {loadingSuggestions ? (
                  <p className="text-[9px] text-slate-400">Đang tìm voucher...</p>
                ) : suggestedVouchers.length === 0 ? (
                  <p className="text-[9px] text-slate-400 italic">Không có voucher phù hợp điều kiện.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedVouchers.map((v: any) => {
                      const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalAmount;
                      const discountVal = v.type === "percent"
                        ? Math.round(subtotal * (v.value / 100))
                        : v.value;
                      const displayVal = v.type === "percent"
                        ? `${v.value}%`
                        : `-${Math.round(v.value / 1000)}k`;
                        
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVoucherCode(v.code);
                            setVoucherAmount(Math.round(discountVal / 1000));
                          }}
                          className="px-2 py-1 rounded bg-white hover:bg-pink-100 border border-pink-200 text-[10px] font-bold text-pink-700 transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="bg-pink-600 text-white px-1 py-0.2 rounded text-[8px] font-black uppercase">{v.code}</span>
                          <span>Giảm {displayVal}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loyalty Points */}
          {matchedCustomer && matchedCustomer.loyalty_points > 0 && (
            <div className="space-y-1.5 py-1.5 border-b border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Tag size={10} className="text-blue-500" />
                Điểm tích lũy
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-slate-600">Hiện có: <strong>{formatVnd(matchedCustomer.loyalty_points)}</strong> điểm</span>
                  <span className="text-[10px] text-blue-700 font-bold">~ {formatVnd(matchedCustomer.loyalty_points * 100)} vnđ</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-slate-500">Sử dụng:</span>
                  <input
                    type="number"
                    min={0}
                    max={matchedCustomer.loyalty_points}
                    value={pointsToUse || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setPointsToUse(Math.min(val, matchedCustomer.loyalty_points));
                    }}
                    placeholder="Nhập số điểm"
                    className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
                  />
                  {pointsToUse > 0 && (
                    <span className="text-[10px] text-red-500 font-bold whitespace-nowrap">
                      - {formatVnd(pointsToUse * 100)} vnđ
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Final total */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-blue-800">Tổng thanh toán</span>
            <span className="text-lg font-black text-blue-700 font-display">{formatVnd(breakdown.finalAmount)} vnđ</span>
          </div>
        </div>

        {/* Right: Payment method */}
        <div className="space-y-3">
          <div className="text-xs font-black text-slate-900">Phương thức thanh toán</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.value;
              return (
                <button
                  key={pm.value}
                  onClick={() => {
                    setPaymentMethod(pm.value);
                  }}
                  className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    isSelected ? `${pm.color} border-current shadow-sm` : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-bold">{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* MoMo QR when momo selected */}
          {paymentMethod === "momo" && (
            <div className="bg-pink-50/50 border border-pink-200 rounded-xl p-3 flex flex-col items-center gap-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-pink-700">
                <QrCode size={14} />
                Quét mã MoMo để thanh toán
              </div>
              <img
                src={momoUrl}
                alt="MoMo QR"
                className="w-48 h-48 rounded-lg border border-pink-200 bg-white"
              />
              <div className="w-full text-[10px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Số điện thoại:</span>
                  <span className="font-bold">{resInfo?.hotline || "028 3829 4000"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chủ tài khoản:</span>
                  <span className="font-bold">{resInfo?.bank_account_name || "NHÀ HÀNG RESMANAGER"}</span>
                </div>
              </div>
            </div>
          )}

          {/* VNPay QR when vnpay selected */}
          {paymentMethod === "vnpay" && (
            <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-3 flex flex-col items-center gap-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-700">
                <QrCode size={14} />
                Quét mã VNPay để thanh toán
              </div>
              {loadingVnpay ? (
                <div className="w-48 h-48 rounded-lg border border-sky-200 bg-white flex flex-col items-center justify-center text-xs text-sky-600 gap-2">
                  <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tạo QR VNPay...</span>
                </div>
              ) : vnpaySession ? (
                <>
                  <img
                    src={vnpaySession.qrUrl}
                    alt="VNPay QR"
                    className="w-48 h-48 rounded-lg border border-sky-200 bg-white"
                  />
                  <div className="w-full text-[10px] text-slate-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Cổng thanh toán:</span>
                      <span className="font-bold text-sky-700">VNPay Sandbox Gateway</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Số tiền thanh toán:</span>
                      <span className="font-black text-sky-700">{formatVnd(vnpaySession.amount)} vnđ</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mã tham chiếu:</span>
                      <span className="font-mono text-slate-500 font-bold">{vnpaySession.txnRef}</span>
                    </div>
                  </div>

                  <a
                    href={vnpaySession.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Mở trang thanh toán VNPay Sandbox</span>
                    <ExternalLink size={12} />
                  </a>

                  {/* DevTools Simulation for VNPay */}
                  <div className="w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setShowVnpaySandboxTools((prev: boolean) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-100/80 hover:bg-sky-200/80 text-[10px] font-bold text-sky-800 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wrench size={12} className="text-sky-600" />
                        <span>🛠️ DevTools VNPay Sandbox</span>
                      </span>
                      {showVnpaySandboxTools ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showVnpaySandboxTools && (
                      <div className="mt-2 w-full rounded-xl border border-sky-200 bg-sky-50 p-2.5 space-y-2 text-center shadow-xs animate-fade-in">
                        <p className="text-[9px] text-sky-800 font-medium">Bấm bên dưới để mô phỏng VNPay nhận tiền thành công ngay lập tức:</p>
                        <button
                          type="button"
                          onClick={handleSimulateVnPaySuccess}
                          disabled={simulatingVnpay}
                          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white transition-all active:scale-98 disabled:opacity-60 cursor-pointer shadow-xs flex items-center justify-center gap-1"
                        >
                          🟢 Mô phỏng VNPay thanh toán 100% thành công
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-red-500">{vnpayError || "Không thể tải QR VNPay."}</p>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Phương thức</span>
              <span className="font-bold text-slate-900">{PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hóa đơn</span>
              <span className="font-bold text-slate-900">#{invoice.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bàn</span>
              <span className="font-bold text-slate-900">{invoice.tableName || "Mang về"}</span>
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              "Đang xử lý..."
            ) : (
              <>
                <CreditCard size={16} />
                Xác nhận thanh toán {formatVnd(breakdown.finalAmount)} vnđ
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
