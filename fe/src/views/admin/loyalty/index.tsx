import React, { useState } from "react";
import { Flame, Calendar, Coins, Gift, Clock, Tag } from "lucide-react";

interface Voucher {
  code: string;
  value: string;
  desc: string;
  pointsCost: number;
}

const EXCHANGE_OPTIONS: Voucher[] = [
  { code: "V50K", value: "Giảm 50.000đ", desc: "Giảm trực tiếp 50K trên hóa đơn", pointsCost: 500 },
  { code: "FREECOCA", value: "Nước ngọt miễn phí", desc: "Tặng 1 lon Coca hoặc trà đá tự chọn", pointsCost: 200 },
  { code: "V10P", value: "Giảm 10% hóa đơn", desc: "Giảm tối đa 100.000đ cho đơn tiếp theo", pointsCost: 1000 },
];

export const LoyaltyPointsDemo: React.FC = () => {
  const [points, setPoints] = useState<number>(1500);
  const [myVouchers, setMyVouchers] = useState<string[]>(["VOUCHERWELCOME", "MEMBERNEW"]);
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "history" | "vouchers">("pending");
  const [exchangeMsg, setExchangeMsg] = useState<string | null>(null);

  const handleExchange = (option: Voucher) => {
    if (points >= option.pointsCost) {
      setPoints((p) => p - option.pointsCost);
      setMyVouchers((prev) => [...prev, option.code + "_" + Math.random().toString(36).substr(2, 4).toUpperCase()]);
      setExchangeMsg(`Đổi thưởng thành công! Nhận mã voucher: ${option.code}. Kiểm tra tại tab Voucher của tôi.`);
      setTimeout(() => setExchangeMsg(null), 5000);
    } else {
      setExchangeMsg("Không đủ điểm tích lũy để đổi voucher này!");
      setTimeout(() => setExchangeMsg(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-800">
      
      {/* Loyalty dashboard blue card */}
      <div className="bg-[#0b1329] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col gap-6">
        
        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500 text-white font-black text-base flex items-center justify-center border-2 border-slate-800 shadow-sm">
              NV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-display text-white">Nguyễn Văn An</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider">
                  HỘI VIÊN VÀNG
                </span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-black tracking-wider flex items-center gap-0.5">
                  <Flame size={8} /> Ghé thăm 12 ngày liên tiếp
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-semibold">
                <Calendar size={11} />
                <span>Thành viên từ 03/2023</span>
                <span>•</span>
                <span>+84 901 234 567</span>
              </div>
            </div>
          </div>
        </div>

        {/* Points indicator meter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="md:col-span-2 flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Coins size={12} className="text-amber-500" /> Điểm tích lũy
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black font-display text-white">{points.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-bold">điểm</span>
            </div>
            
            {/* Progress line */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (points / 2500) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>{points}/2.500 điểm</span>
                <div className="flex items-center gap-1">
                  <span className="bg-slate-800 text-slate-200 border border-slate-700 px-1.5 py-0.5 rounded uppercase text-[8px] font-black">
                    BẠCH KIM — 2.500 điểm
                  </span>
                  <span>Còn {(2500 - points > 0) ? (2500 - points) : 0} điểm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visit count indicators */}
          <div className="grid grid-cols-3 gap-3 text-center border-t md:border-t-0 md:border-l border-slate-800 pt-5 md:pt-0 md:pl-6">
            <div className="flex flex-col gap-1">
              <span className="text-lg font-black font-display text-white">47</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Lần ghé thăm</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-black font-display text-white">12.4M</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Tổng chi tiêu</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-black font-display text-white">8</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Voucher đã dùng</span>
            </div>
          </div>
        </div>

        {/* Reward Exchange block */}
        <div className="border-t border-slate-800 pt-5 flex flex-col gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Đổi điểm thưởng
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {EXCHANGE_OPTIONS.map((opt) => {
              const canAfford = points >= opt.pointsCost;
              return (
                <div
                  key={opt.code}
                  onClick={() => canAfford && handleExchange(opt)}
                  className={`border p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all ${
                    canAfford
                      ? "border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer"
                      : "border-slate-800/50 bg-slate-900/10 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-amber-400 font-extrabold text-sm">{opt.value}</span>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">{opt.desc}</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-center">
                    Cần {opt.pointsCost} điểm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {exchangeMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl p-4 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Gift size={14} className="text-emerald-600" />
          {exchangeMsg}
        </div>
      )}

      {/* Selector tab lists */}
      <div className="flex flex-col gap-4">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-fit">
          <button
            onClick={() => setActiveSubTab("pending")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-display transition-all cursor-pointer border ${
              activeSubTab === "pending"
                ? "bg-rose-50 border-rose-200 text-rose-600 font-extrabold shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            Đơn hàng đang xử lý
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-display transition-all cursor-pointer border ${
              activeSubTab === "history"
                ? "bg-rose-50 border-rose-200 text-rose-600 font-extrabold shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            Lịch sử đặt bàn
          </button>
          <button
            onClick={() => setActiveSubTab("vouchers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-display transition-all cursor-pointer border ${
              activeSubTab === "vouchers"
                ? "bg-rose-50 border-rose-200 text-rose-600 font-extrabold shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-850"
            }`}
          >
            Voucher của tôi ({myVouchers.length})
          </button>
        </div>

        {/* Tab display content */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
          
          {activeSubTab === "pending" && (
            <div className="flex flex-col gap-4">
              <div className="border border-slate-150 p-5 rounded-2xl flex flex-col gap-4 max-w-lg shadow-2xs">
                {/* Invoice header */}
                <div className="flex justify-between items-start text-xs border-b border-slate-100 pb-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-extrabold text-slate-900 text-sm">#DH-2024-0892</span>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} /> Thời gian dự kiến: ~15 phút
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-lg tracking-wide">
                    Mang đi
                  </span>
                </div>

                {/* Items */}
                <ul className="flex flex-col gap-2 text-xs font-bold text-slate-700 list-disc pl-4">
                  <li>Phở bò đặc biệt x2</li>
                  <li>Gỏi cuốn tôm thịt x1</li>
                </ul>

                {/* Price tag */}
                <div className="flex justify-between items-center border-t border-slate-100 pt-3.5 mt-1">
                  <span className="text-slate-400 text-xs font-semibold">Thành tiền:</span>
                  <div className="text-right">
                    <span className="text-rose-500 text-base font-black">285.000đ</span>
                    <span className="text-[9px] text-emerald-600 font-black block mt-0.5 uppercase tracking-wide">
                      +28 điểm tích lũy
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "history" && (
            <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1">
              {[
                { date: "2026-06-10", guests: 4, zone: "Khu VIP", bill: "1.450.000đ", pts: "+145 điểm" },
                { date: "2026-06-04", guests: 2, zone: "Khu Cửa Sổ", bill: "680.000đ", pts: "+68 điểm" },
                { date: "2026-05-28", guests: 6, zone: "Khu Sân Vườn", bill: "2.100.000đ", pts: "+210 điểm" },
              ].map((h, i) => (
                <div key={i} className="flex justify-between items-center text-xs p-4 bg-slate-50 rounded-2xl border border-slate-150 shadow-2xs">
                  <div className="flex flex-col gap-1 font-semibold text-slate-600">
                    <span className="text-slate-900 font-extrabold">Ngày {h.date}</span>
                    <span>Số lượng: {h.guests} khách • Khu vực: {h.zone}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-900 font-extrabold">{h.bill}</span>
                    <span className="text-[10px] text-emerald-600 font-black block mt-0.5">{h.pts}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === "vouchers" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myVouchers.map((v, i) => {
                const codeParts = v.split("_");
                const baseCode = codeParts[0];
                const label =
                  baseCode === "V50K"
                    ? "Giảm giá 50.000đ"
                    : baseCode === "FREECOCA"
                    ? "Nước ngọt miễn phí"
                    : baseCode === "V10P"
                    ? "Giảm giá 10%"
                    : baseCode === "MEMBERNEW"
                    ? "Tặng món khai vị miễn phí"
                    : "Món quà chào mừng Gold Member";

                return (
                  <div key={i} className="border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
                        <Tag size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-xs">{label}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">CODE: {v}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-150 px-2 py-1 rounded">
                      KHẢ DỤNG
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
