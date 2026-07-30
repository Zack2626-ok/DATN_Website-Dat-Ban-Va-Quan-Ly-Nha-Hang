import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { MenuItem } from "../../../../interfaces";
import api from "../../../../services/axiosInstance";

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ isOpen, onClose, item }) => {
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [recipeItems, setRecipeItems] = useState<{ ingredient_id: number; quantity: number }[]>([]);

  useEffect(() => {
    if (isOpen && item) {
      loadData();
    }
  }, [isOpen, item]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch ingredients
      const ingRes = await api.get("/inventory/ingredients");
      setIngredients(ingRes.data.data || []);
      
      // Fetch current recipe
      const recRes = await api.get(`/menu/${item?.id}/recipe`);
      if (recRes.data.data) {
        setRecipeItems(recRes.data.data.map((r: any) => ({
          ingredient_id: r.ingredient_id,
          quantity: r.quantity
        })));
      } else {
        setRecipeItems([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải định lượng");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put(`/menu/${item?.id}/recipe`, { items: recipeItems });
      toast.success("Lưu định lượng thành công");
      onClose();
    } catch (err) {
      toast.error("Lỗi lưu định lượng");
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setRecipeItems([...recipeItems, { ingredient_id: ingredients[0]?.id || 0, quantity: 1 }]);
  };

  const removeRow = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: any) => {
    const newItems = [...recipeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setRecipeItems(newItems);
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-sky-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Định lượng món ăn</h2>
            <p className="text-sm text-sky-600 font-medium mt-1">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-sky-500 mb-2" size={24} />
              <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 font-semibold text-slate-600">Nguyên liệu</th>
                    <th className="pb-2 font-semibold text-slate-600 w-32">Số lượng (Gram/Ml)</th>
                    <th className="pb-2 font-semibold text-slate-600 w-16 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">
                        Chưa thiết lập định lượng
                      </td>
                    </tr>
                  ) : (
                    recipeItems.map((ri, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-2 pr-2">
                          <select
                            value={ri.ingredient_id}
                            onChange={(e) => updateRow(idx, 'ingredient_id', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          >
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ri.quantity}
                            onChange={(e) => updateRow(idx, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => removeRow(idx)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <button
                onClick={addRow}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sky-600 bg-sky-50 border border-sky-100 rounded-lg hover:bg-sky-100 transition-colors w-full justify-center"
              >
                <Plus size={16} /> Thêm nguyên liệu
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={16} /> Lưu định lượng
          </button>
        </div>
      </div>
    </div>
  );
};
