import React, { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  Receipt,
  Tag,
  BadgePercent,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { Modal } from "../../../../components/Modal";
import { getRestaurantInfo, type RestaurantInfo } from "../../../../services/restaurantInfoService";
import type { Invoice, PaymentRequest } from "../../../../interfaces/invoice";
import { crmService, type Voucher, type Customer } from "../../../../services/crmService";
import {
  initiateBankTransferPayment,
  type BankTransferPaymentSession,
} from "../../../../services/bankTransferPaymentService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onConfirm: (data: PaymentRequest) => void;
  onBankTransferStarted: (session: BankTransferPaymentSession) => void;
  loading: boolean;
}

const formatVnd = (n: number) => Number(n).toLocaleString("vi-VN");

const PAYMENT_METHODS = [
  { value: "cash" as const, label: "Tiền mặt", icon: Banknote, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "transfer" as const, label: "Chuyển khoản", icon: ArrowRightLeft, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: "card" as const, label: "Thẻ tín dụng", icon: CreditCard, color: "bg-violet-50 border-violet-200 text-violet-700" },
  { value: "momo" as const, label: "Ví MoMo", icon: Wallet, color: "bg-pink-50 border-pink-200 text-pink-700" },
  { value: "vnpay" as const, label: "Cổng VNPay", icon: QrCode, color: "bg-sky-50 border-sky-200 text-sky-700" },
];

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
  onBankTransferStarted,
  loading,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card" | "momo" | "vnpay">("cash");
  const [vatRate, setVatRate] = useState(10);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [tipAmount] = useState(0);
  const [resInfo, setResInfo] = useState<RestaurantInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [bankTransferSession, setBankTransferSession] = useState<BankTransferPaymentSession | null>(null);
  const [creatingBankTransfer, setCreatingBankTransfer] = useState(false);
  const [bankTransferError, setBankTransferError] = useState<string | null>(null);
  const isBankTransfer = paymentMethod === "transfer";

  const [suggestedVouchers, setSuggestedVouchers] = useState<Voucher[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [pointsToUse, setPointsToUse] = useState<number>(0);

  useEffect(() => {
    getRestaurantInfo()
      .then((info) => {
        if (info) {
          setVatRate(info.tax_rate ?? 10);
        }
        setResInfo(info);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSuggestedVouchers([]);
      setCustomerName(null);
      setMatchedCustomer(null);
      setPointsToUse(0);
      setBankTransferSession(null);
      setBankTransferError(null);
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
    const finalAmount = Math.max(0, subtotal + vat + (tipAmount * 1000) - depositAmount - (voucherAmount * 1000) - pointsDiscount);
    return { subtotal, vat, depositAmount, pointsDiscount, finalAmount };
  }, [invoice.subtotal, invoice.totalAmount, invoice.depositAmount, vatRate, tipAmount, voucherAmount, pointsToUse]);

  const momoUrl = useMemo(() => {
    const amountVnd = Math.round(breakdown.finalAmount);
    const desc = `Thanh toan HD${invoice.id.slice(-6)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`momo://pay?phone=${resInfo?.hotline || "028 3829 4000"}&amount=${amountVnd}&note=${desc}`)}`;
  }, [resInfo, breakdown.finalAmount, invoice.id]);

  const vnpayUrl = useMemo(() => {
    const amountVnd = Math.round(breakdown.finalAmount);
    const desc = `Thanh toan HD${invoice.id.slice(-6)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=${amountVnd * 100}&vnp_TxnRef=${invoice.id.slice(-6)}&vnp_OrderInfo=${desc}`)}`;
  }, [breakdown.finalAmount, invoice.id]);

  /** Tạo QR động và đăng ký lắng nghe kết quả thanh toán của hóa đơn. */
  const handleCreateBankTransfer = async (): Promise<void> => {
    setCreatingBankTransfer(true);
    setBankTransferError(null);
    try {
      const session = await initiateBankTransferPayment(invoice.id);
      setBankTransferSession(session);
      onBankTransferStarted(session);
    } catch (error) {
      setBankTransferError(error instanceof Error ? error.message : "Không thể tạo mã QR chuyển khoản.");
    } finally {
      setCreatingBankTransfer(false);
    }
  };

  /** Sao chép chính xác thông tin của phiên QR đang chờ thanh toán. */
  const copyBankInfo = async (): Promise<void> => {
    if (!bankTransferSession) return;
    const text = `Ngân hàng: ${bankTransferSession.bankCode}\nSố TK: ${bankTransferSession.accountNumber}\nChủ TK: ${bankTransferSession.accountName}\nSố tiền: ${formatVnd(bankTransferSession.amount)} vnđ\nNội dung: ${bankTransferSession.paymentReference}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setBankTransferError("Không thể sao chép thông tin tài khoản trên trình duyệt này.");
    }
  };

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
                disabled={isBankTransfer}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Mã voucher"
                className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                min={0}
                value={voucherAmount || ""}
                disabled={isBankTransfer}
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
                    {suggestedVouchers.map((v) => {
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
                          disabled={isBankTransfer}
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
                    disabled={isBankTransfer}
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
          {isBankTransfer && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-medium text-blue-700">
              QR chuyển khoản dùng đúng tổng tiền hóa đơn; voucher và điểm tích lũy không được áp dụng ở bước này.
            </p>
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
                    setBankTransferError(null);
                    if (pm.value === "transfer") {
                      setVoucherCode("");
                      setVoucherAmount(0);
                      setPointsToUse(0);
                    }
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

          {/* VietQR when transfer selected */}
          {paymentMethod === "transfer" && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex flex-col items-center gap-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                <QrCode size={14} />
                VietQR động — chờ ngân hàng xác nhận
              </div>
              {bankTransferSession ? (
                <>
                  <img src={bankTransferSession.qrUrl} alt="VietQR động" className="w-48 h-48 rounded-lg border border-blue-200 bg-white" />
                  <div className="w-full text-[10px] text-slate-600 space-y-0.5">
                    <div className="flex justify-between"><span>Ngân hàng:</span><span className="font-bold">{bankTransferSession.bankCode}</span></div>
                    <div className="flex justify-between"><span>Số TK:</span><span className="font-bold">{bankTransferSession.accountNumber}</span></div>
                    <div className="flex justify-between"><span>Nội dung:</span><span className="font-bold break-all text-right">{bankTransferSession.paymentReference}</span></div>
                    <div className="flex justify-between"><span>Số tiền:</span><span className="font-bold text-blue-700">{formatVnd(bankTransferSession.amount)} vnđ</span></div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">QR hết hạn lúc {new Date(bankTransferSession.expiresAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Hóa đơn sẽ tự chốt khi tiền về.</p>
                  <button type="button" onClick={copyBankInfo} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer">
                    {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Đã copy!" : "Copy thông tin TK"}
                  </button>
                </>
              ) : (
                <p className="text-[10px] text-slate-600 text-center">Tạo QR để khóa số tiền và nội dung chuyển khoản. Hệ thống không tự xác nhận khi chưa nhận webhook ngân hàng.</p>
              )}
              {bankTransferError && <p className="text-[10px] text-red-600 text-center">{bankTransferError}</p>}
            </div>
          )}

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
              <img
                src={vnpayUrl}
                alt="VNPay QR"
                className="w-48 h-48 rounded-lg border border-sky-200 bg-white"
              />
              <div className="w-full text-[10px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Cổng thanh toán:</span>
                  <span className="font-bold">VNPay Sandbox Gateway</span>
                </div>
                <div className="flex justify-between">
                  <span>Đơn vị thụ hưởng:</span>
                  <span className="font-bold">{resInfo?.name || "ResManager"}</span>
                </div>
              </div>
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
            onClick={paymentMethod === "transfer" ? handleCreateBankTransfer : handleConfirm}
            disabled={loading || creatingBankTransfer || (paymentMethod === "transfer" && Boolean(bankTransferSession))}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {paymentMethod === "transfer" && bankTransferSession ? (
              "Đang chờ ngân hàng xác nhận"
            ) : loading || creatingBankTransfer ? (
              "Đang xử lý..."
            ) : (
              <>
                <CreditCard size={16} />
                {paymentMethod === "transfer" ? "Tạo QR chuyển khoản" : `Xác nhận thanh toán ${formatVnd(breakdown.finalAmount)} vnđ`}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
