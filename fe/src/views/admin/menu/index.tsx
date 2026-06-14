import React, { useState } from "react";
import { Search, Plus, Trash } from "lucide-react";
import { useAppSelector } from "../../../store";

/**
 * MenuManagement - Mockup view of the Menu & BOM Options layout matching Figma Screenshot 5
 */
export const MenuManagement: React.FC = () => {
  const menuItems = useAppSelector((state) => state.menu.items);
  const [selectedId, setSelectedId] = useState("m1");
  const [search, setSearch] = useState("");

  const filtered = menuItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = menuItems.find((i) => i.id === selectedId) || menuItems[0];

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-admin-text-main">
      <div className="border-b border-admin-border pb-4">
        <h3 className="text-xl font-extrabold font-display">Quản lý Thực đơn & Định mức</h3>
        <p className="text-xs text-admin-text-sub mt-1">Quản lý món ăn với tùy chọn và định mức nguyên liệu BOM</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Danh sách món */}
        <div className="bg-white p-5 rounded-2xl border border-admin-border flex flex-col gap-4 shadow-xs">
          <h4 className="text-sm font-bold font-display border-b border-slate-100 pb-2">Danh sách món</h4>
          
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 bg-slate-100/60 border border-slate-200/50 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 scrollbar">
            {filtered.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-3 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                    isSelected
                      ? "border-admin-primary bg-admin-primary-light text-admin-primary font-bold"
                      : "border-slate-100 hover:bg-slate-50 text-slate-700 bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
                  </div>
                  <span className="text-xs font-extrabold">{(item.price * 1000).toLocaleString('vi-VN')} vnđ</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Chi tiết món ăn */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-admin-border flex flex-col gap-6 shadow-xs">
          <div>
            <h4 className="text-sm font-bold font-display border-b border-slate-100 pb-2">Chi tiết món ăn</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tên món</label>
              <input
                type="text"
                value={selectedItem ? selectedItem.name : ""}
                readOnly
                className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Đơn giá</label>
                <input
                  type="text"
                  value={selectedItem ? `${(selectedItem.price * 1000).toLocaleString('vi-VN')} vnđ` : ""}
                  readOnly
                  className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none text-center font-bold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Danh mục</label>
                <input
                  type="text"
                  value={selectedItem ? selectedItem.category : ""}
                  readOnly
                  className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Tùy chọn món section */}
          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5">
            <div className="flex justify-between items-center">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tùy chọn món</h5>
              <button className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer">
                <Plus size={10} /> Thêm tùy chọn
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Option 1 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Độ chín của thịt</span>
                  <button className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                    <Trash size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Tái (Rare)", "Tái vừa (Medium Rare)", "Chín vừa (Medium)", "Chín kỹ (Well Done)"].map((val) => (
                    <span key={val} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-semibold shadow-2xs">
                      {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Option 2 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Kích cỡ (Size)</span>
                  <button className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                    <Trash size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Thường (Regular)", "Lớn (Large)"].map((val) => (
                    <span key={val} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-semibold shadow-2xs">
                      {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Option 3 */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Topping thêm</span>
                  <button className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                    <Trash size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Thêm thịt xông khói", "Thêm phô mai", "Thêm bơ quả", "Thêm trứng ốp la"].map((val) => (
                    <span key={val} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-semibold shadow-2xs">
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
