import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Plus, Minus, Utensils, Check } from "lucide-react";
import { getWaiterMenuItems, getWaiterCategories, type WaiterMenuItem, type WaiterCategory } from "../../../services/waiterService";

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  onAddItem: (item: WaiterMenuItem, quantity: number, note?: string) => Promise<void>;
}

export const AddDishModal: React.FC<AddDishModalProps> = ({ isOpen, onClose, tableName, onAddItem }) => {
  const [menuItems, setMenuItems] = useState<WaiterMenuItem[]>([]);
  const [categories, setCategories] = useState<WaiterCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<WaiterMenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getWaiterCategories().then(setCategories).catch(() => {});
      getWaiterMenuItems().then(setMenuItems).catch(() => {});
      setSelectedItem(null);
      setQuantity(1);
      setNote("");
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((i) => {
      if (!i.is_active) return false;
      const matchesCat = selectedCat === "all" || i.category_id.toString() === selectedCat;
      const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menuItems, selectedCat, searchQuery]);

  if (!isOpen) return null;

  const handleConfirmAdd = async () => {
    if (!selectedItem) return;
    setAdding(true);
    try {
      await onAddItem(selectedItem, quantity, note.trim() || undefined);
      setSelectedItem(null);
      setQuantity(1);
      setNote("");
    } finally {
      setAdding(false);
    }
  };

  const getImageUrl = (item: WaiterMenuItem): string => {
    if (!item.image_url) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
    if (item.image_url.startsWith("http")) return item.image_url;
    return `${import.meta.env.VITE_API_URL?.replace("/api", "")}/uploads/${item.image_url}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Utensils className="text-[#FF5A5F]" size={20} />
            <h3 className="text-base font-bold text-gray-800">Thêm món ăn • {tableName}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn theo tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm outline-none focus:border-[#FF5A5F]"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCat("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCat === "all"
                  ? "bg-[#FF5A5F] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tất cả
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id.toString())}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCat === c.id.toString()
                    ? "bg-[#FF5A5F] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách món ăn hoặc Form chọn số lượng */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedItem ? (
            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={getImageUrl(selectedItem)}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900">{selectedItem.name}</h4>
                    <p className="text-sm font-bold text-[#FF5A5F]">
                      {Number(selectedItem.price).toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer"
                >
                  Chọn món khác
                </button>
              </div>

              <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-600">Số lượng:</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer font-bold"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-black text-base w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer font-bold"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Ghi chú bếp (tùy chọn)</label>
                <input
                  type="text"
                  placeholder="VD: ít cay, không hành..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs outline-none focus:border-[#FF5A5F] bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={adding}
                  className="flex items-center gap-1.5 rounded-xl bg-[#FF5A5F] px-4 py-2 text-xs font-bold text-white hover:bg-[#e0484d] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Check size={14} />
                  {adding ? "Đang thêm..." : `Xác nhận thêm (${(selectedItem.price * quantity).toLocaleString()}đ)`}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[#FF5A5F] transition-all cursor-pointer bg-white shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getImageUrl(item)}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs font-semibold text-[#FF5A5F] mt-0.5">
                        {Number(item.price).toLocaleString("vi-VN")} đ
                      </p>
                    </div>
                  </div>
                  <Plus size={16} className="text-gray-400 shrink-0" />
                </div>
              ))}
              {filteredItems.length === 0 && (
                <p className="col-span-2 text-center text-xs text-gray-400 py-8">
                  Không tìm thấy món ăn nào phù hợp.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
