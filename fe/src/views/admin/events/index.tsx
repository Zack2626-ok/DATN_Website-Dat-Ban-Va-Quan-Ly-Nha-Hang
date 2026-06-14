import React from "react";
import { Plus } from "lucide-react";

/**
 * EventsManagement - Mockup view of the Events & Banquet scheduler matching Figma Screenshot 4
 */
export const EventsManagement: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-admin-text-main">
      <div className="border-b border-admin-border pb-4">
        <h3 className="text-xl font-extrabold font-display">Quản lý Sự kiện & Tiệc</h3>
        <p className="text-xs text-admin-text-sub mt-1">Quản lý đặt tiệc và tránh trùng lịch</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Lịch sự kiện & Sảnh còn trống */}
        <div className="flex flex-col gap-6">
          {/* Calendar Card */}
          <div className="bg-white p-5 rounded-2xl border border-admin-border shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-50 pb-2">Lịch sự kiện</h4>
            
            {/* Simple Visual Calendar Grid */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span>Tháng 6, 2026</span>
                <div className="flex gap-2">
                  <button className="p-1 hover:bg-slate-100 rounded text-slate-400 font-bold">&lt;</button>
                  <button className="p-1 hover:bg-slate-100 rounded text-slate-400 font-bold">&gt;</button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 pb-1 border-b border-slate-100">
                <span>CN</span><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span>
              </div>
              <div className="grid grid-cols-7 text-center text-xs gap-y-2.5 font-semibold text-slate-700">
                <span className="text-slate-300">31</span>
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
                <span>7</span>
                {/* Active/Highlighted days */}
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto font-bold">8</span>
                <span>9</span><span>10</span><span>11</span>
                <span className="w-6 h-6 rounded-full bg-admin-primary-light text-admin-primary flex items-center justify-center mx-auto border border-admin-primary/20">12</span>
                <span>13</span>
                <span>14</span>
                <span className="w-6 h-6 rounded-full bg-admin-primary-light text-admin-primary flex items-center justify-center mx-auto border border-admin-primary/20">15</span>
                <span>16</span><span>17</span><span>18</span><span>19</span>
                <span className="w-6 h-6 rounded-full bg-admin-primary-light text-admin-primary flex items-center justify-center mx-auto border border-admin-primary/20">20</span>
                <span>21</span><span>22</span><span>23</span><span>24</span>
                <span className="w-6 h-6 rounded-full bg-admin-primary-light text-admin-primary flex items-center justify-center mx-auto border border-admin-primary/20">25</span>
                <span>26</span><span>27</span>
                <span>28</span><span>29</span><span>30</span>
                <span className="text-slate-300">1</span><span className="text-slate-300">2</span><span className="text-slate-300">3</span><span className="text-slate-300">4</span>
              </div>
            </div>
          </div>

          {/* Sảnh Còn Trống */}
          <div className="bg-white p-5 rounded-2xl border border-admin-border shadow-xs flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-50 pb-2">Sảnh còn trống</h4>
            <div className="flex flex-col gap-2.5">
              {[
                "Sảnh Lớn (Grand Ballroom)",
                "Phòng Hội Nghị A (Conference A)",
                "Phòng Hội Nghị B (Conference B)",
                "Phòng Ăn Riêng VIP",
                "Sân Vườn Garden Terrace"
              ].map((hall) => (
                <div key={hall} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <span className="font-bold text-slate-700">{hall}</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                    Còn trống
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Hợp đồng sự kiện */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-admin-border flex flex-col gap-6 shadow-xs">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold font-display border-b border-slate-100 pb-2 flex-1">Hợp đồng sự kiện</h4>
            <button className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer font-display shadow-xs ml-4">
              <Plus size={12} /> Sự kiện mới
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 text-xs font-semibold text-slate-500 gap-6">
            <span className="py-2 border-b-2 border-slate-400 text-slate-800 cursor-pointer">Nháp (2)</span>
            <span className="py-2 hover:text-slate-800 cursor-pointer">Đã xác nhận (3)</span>
            <span className="py-2 hover:text-slate-800 cursor-pointer">Hoàn thành (1)</span>
          </div>

          {/* Events List */}
          <div className="flex flex-col gap-4">
            {/* Event 1 */}
            <div className="p-5 border border-slate-200/80 rounded-xl flex flex-col gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-bold text-sm text-slate-900">Tiệc Sinh Nhật - Gia Đình Chen</h5>
                  <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider inline-block mt-1">
                    Sinh nhật
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Nháp</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600 font-medium">
                <div>📅 Thứ 6, 12 thg 6, 2026</div>
                <div>📍 Phòng Ăn Riêng VIP</div>
                <div>👥 30 khách</div>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-xs">
                <div className="flex gap-4">
                  <span>Đặt cọc: <strong className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-black">Chưa thanh toán</strong> <span className="font-extrabold ml-1">12.500.000 vnđ</span></span>
                  <span>Tổng tiền: <strong className="text-admin-primary font-black">62.500.000 vnđ</strong></span>
                </div>
                <div className="flex gap-1.5">
                  <button className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-[10px] text-slate-600 cursor-pointer">Chỉnh sửa</button>
                  <button className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-bold text-[10px] cursor-pointer">Xem chi tiết</button>
                </div>
              </div>
            </div>

            {/* Event 2 */}
            <div className="p-5 border border-slate-200/80 rounded-xl flex flex-col gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-bold text-sm text-slate-900">Họp Mặt Gia Đình Johnson</h5>
                  <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider inline-block mt-1">
                    Sự kiện Gia đình
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Nháp</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600 font-medium">
                <div>📅 Thứ 7, 4 thg 7, 2026</div>
                <div>📍 Phòng Hội Nghị B</div>
                <div>👥 80 khách</div>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-3 text-xs">
                <div className="flex gap-4">
                  <span>Đặt cọc: <strong className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-black">Chưa thanh toán</strong> <span className="font-extrabold ml-1">37.500.000 vnđ</span></span>
                  <span>Tổng tiền: <strong className="text-admin-primary font-black">175.000.000 vnđ</strong></span>
                </div>
                <div className="flex gap-1.5">
                  <button className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-[10px] text-slate-600 cursor-pointer">Chỉnh sửa</button>
                  <button className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-bold text-[10px] cursor-pointer">Xem chi tiết</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
