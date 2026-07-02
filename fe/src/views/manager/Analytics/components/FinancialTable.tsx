import React from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../../../utils/formatCurrency";
import type { PaymentMethodStat, CashFlowSummary } from "../services/analyticsService";

interface FinancialTableProps {
  paymentStats: PaymentMethodStat[];
  cashFlow: CashFlowSummary;
  isLoading: boolean;
}

/**
 * FinancialTable - Báo cáo dòng tiền thu chi và cổng thanh toán
 */
export const FinancialTable: React.FC<FinancialTableProps> = ({
  paymentStats,
  cashFlow,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white" />
        <div className="h-64 animate-pulse rounded-2xl border border-gray-100 bg-white" />
      </div>
    );
  }

  // Lấy icon tương ứng với từng cổng thanh toán
  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case "momo":
        return "bg-pink-100 text-pink-700";
      case "vnpay":
        return "bg-blue-100 text-blue-700";
      case "cash":
        return "bg-green-100 text-green-700";
      case "bank_transfer":
        return "bg-indigo-100 text-indigo-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      
      {/* 1. DÒNG TIỀN THU CHI (INCOME VS EXPENSES) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-base font-black text-gray-800 font-display">
            Báo cáo dòng tiền & Lợi nhuận ròng
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">So sánh Thu nhập (Hóa đơn + Cọc tiệc) vs Chi phí mua hàng (Nhập kho)</p>
        </div>

        {/* Tổng thu chi */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-emerald-50/50 p-3 flex flex-col gap-1 border border-emerald-100/50">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
              Tổng Thu nhập <ArrowUpRight size={12} />
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-700 font-display">
              {formatCurrency(cashFlow.income)}
            </span>
          </div>

          <div className="rounded-xl bg-rose-50/50 p-3 flex flex-col gap-1 border border-rose-100/50">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              Chi phí nhập kho <ArrowDownRight size={12} />
            </span>
            <span className="text-sm sm:text-base font-black text-rose-700 font-display">
              {formatCurrency(cashFlow.expenses)}
            </span>
          </div>

          <div className="rounded-xl bg-sky-50/50 p-3 flex flex-col gap-1 border border-sky-100/50">
            <span className="text-[10px] font-bold text-[#FF5A5F] uppercase tracking-wider flex items-center gap-1">
              Lợi nhuận ròng <TrendingUp size={12} />
            </span>
            <span className="text-sm sm:text-base font-black text-gray-800 font-display">
              {formatCurrency(cashFlow.netProfit)}
            </span>
          </div>
        </div>

        {/* Cơ cấu chi phí nhập kho */}
        <div className="mt-5 flex-1">
          <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
            Cơ cấu chi phí thu mua nguyên liệu
          </h4>
          
          {cashFlow.expenseItems.length > 0 ? (
            <div className="mt-3 space-y-3">
              {cashFlow.expenseItems.slice(0, 4).map((item, idx) => {
                const totalExp = cashFlow.expenses || 1;
                const pct = Math.round((item.amount / totalExp) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-600">
                      <span>{item.category}</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(item.amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-rose-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 text-center text-xs font-semibold text-gray-400">
              Không phát sinh chi phí nhập kho trong kỳ
            </div>
          )}
        </div>
      </div>

      {/* 2. CHI TIẾT CỔNG THANH TOÁN (PAYMENT METHODS TABLE) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-base font-black text-gray-800 font-display">
            Phân tích phương thức thanh toán
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Thống kê sản lượng và doanh thu thu qua từng kênh giao dịch</p>
        </div>

        <div className="mt-4 overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-2.5">Kênh thanh toán</th>
                <th className="py-2.5 text-center">Giao dịch</th>
                <th className="py-2.5 text-right">Tổng thu</th>
                <th className="py-2.5 text-right">Tỷ trọng DT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
              {paymentStats.map((stat, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3">
                    <span className={`inline-block rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${getMethodBadgeClass(stat.method)}`}>
                      {stat.name}
                    </span>
                  </td>
                  <td className="py-3 text-center font-bold text-gray-500">
                    {stat.count} GD
                  </td>
                  <td className="py-3 text-right font-black text-gray-800">
                    {formatCurrency(stat.total)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-bold text-gray-800">{stat.percentage}%</span>
                      <div className="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#FF5A5F]"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default FinancialTable;
