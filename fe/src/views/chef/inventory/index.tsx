import React from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  restockIngredient,
  setIngredientStockDirect,
} from "../../../store/inventorySlice";
import { syncMenuWithIngredients } from "../../../store/menuSlice";
import { AlertTriangle, Plus } from "lucide-react";

/**
 * InventoryControl - Allows restocking and simulating stock shortages
 */
export const InventoryControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const inventory = useAppSelector((state) => state.inventory.ingredients);

  const triggerInventoryMenuSync = () => {
    const stocks: { [name: string]: number } = {};
    inventory.forEach((ing) => {
      stocks[ing.name] = ing.stock;
    });
    dispatch(syncMenuWithIngredients(stocks));
  };

  const handleRestock = (id: string, amount: number) => {
    dispatch(restockIngredient({ id, amount }));
    // Wait a brief tick for Redux update to process, then sync with menu items
    setTimeout(() => triggerInventoryMenuSync(), 50);
  };

  const handleSimulateOutStock = (id: string) => {
    dispatch(setIngredientStockDirect({ id, stock: 0 }));
    setTimeout(() => triggerInventoryMenuSync(), 50);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in text-admin-text-main">
      <div className="flex justify-between items-center pb-4 border-b border-admin-border">
        <div>
          <h3 className="text-xl font-extrabold font-display">
            Quản lý Tồn kho
          </h3>
          <p className="text-xs text-admin-text-sub mt-1">
            Theo dõi nguyên liệu và mức tồn kho tối thiểu
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-display">
          Bảng kiểm kê kho an toàn
        </span>
      </div>

      {/* Low stock visual alert banner if any ingredient is below threshold */}
      {inventory.some((ing) => ing.stock <= ing.threshold) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-xs font-semibold shadow-2xs">
          <AlertTriangle size={16} className="text-rose-500 shrink-0" />
          <span>
            <strong>Cảnh báo tồn kho thấp:</strong>{" "}
            {inventory.filter((ing) => ing.stock <= ing.threshold).length}{" "}
            nguyên liệu sắp hết. Vui lòng kiểm kê và nhập kho ngay.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inventory.map((ing) => {
          const isLow = ing.stock <= ing.threshold;
          return (
            <div
              key={ing.id}
              className={`p-5 rounded-2xl border flex items-center justify-between transition-all shadow-2xs ${
                isLow
                  ? "bg-rose-50/50 border-rose-200 text-rose-900"
                  : "bg-white border-admin-border text-slate-900 hover:shadow-xs"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">
                    {ing.name}
                  </span>
                  {isLow && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                      <AlertTriangle size={10} /> THẤP
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Mức tối thiểu: {ing.threshold} {ing.unit}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`text-sm font-black tracking-wider ${isLow ? "text-rose-600" : "text-admin-primary"}`}
                >
                  {ing.stock} {ing.unit}
                </span>

                <div className="flex gap-1.5">
                  <button
                    onClick={() =>
                      handleRestock(ing.id, ing.unit === "kg" ? 5 : 100)
                    }
                    title="Nhập kho thêm"
                    className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-200 cursor-pointer transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => handleSimulateOutStock(ing.id)}
                    title="Mô phỏng hết hàng"
                    className="p-1.5 rounded-lg bg-rose-100/60 border border-rose-200 hover:bg-rose-200 text-rose-600 cursor-pointer transition-colors"
                  >
                    <AlertTriangle size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs text-slate-500 font-medium leading-relaxed text-center">
        💡 <strong>Liên kết thực đơn thực tế:</strong> Việc hạ mức tồn kho của{" "}
        <strong>Cá hồi</strong> hoặc <strong>Trứng cá tầm</strong> về 0 sẽ tự
        động ẩn và đánh dấu "Hết hàng" đối với các món ăn liên quan ở thực đơn
        khách hàng và nhân viên.
      </div>
    </div>
  );
};
