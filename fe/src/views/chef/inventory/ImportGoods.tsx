import React, { useState, useEffect } from "react";
import { Plus, Search, Trash2, ArrowLeft, Save, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { getIngredientsApi, getSuppliersApi, updateInventoryQuantityApi } from "../../../services/api";

interface ImportGoodsProps {
  onBack: () => void;
}

interface ImportItem {
  ingredientId: string;
  ingredientName: string;
  code: string;
  quantity: number;
  unitCost: number;
  batchNo: string;
  expiryDate: string;
}

export const ImportGoods: React.FC<ImportGoodsProps> = ({ onBack }) => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid"); // "paid" or "credit"

  useEffect(() => {
    getIngredientsApi().then(setIngredients).catch(console.error);
    getSuppliersApi().then(setSuppliers).catch(console.error);
  }, []);

  const handleAddItem = (ing: any) => {
    setImportItems(prev => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        code: `SP${ing.id.toString().padStart(6, '0')}`,
        quantity: 1,
        unitCost: 0,
        batchNo: `LOT-${ing.id}-${Date.now().toString().slice(-6)}`,
        expiryDate: ""
      }
    ]);
    setSearchTerm("");
  };

  const handleUpdateItem = (index: number, field: keyof ImportItem, value: any) => {
    const updated = [...importItems];
    updated[index] = { ...updated[index], [field]: value };
    setImportItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setImportItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = importItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const handleSave = async () => {
    if (importItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mặt hàng để nhập");
      return;
    }
    
    try {
      // Create a single note that encompasses all details
      const reasonOrSupplier = `Nhập hàng từ ${suppliers.find(s => s.id == selectedSupplier)?.name || "NCC khác"} - Ghi chú: ${note}`;
      
      // Submit each item sequentially or Promise.all
      await Promise.all(importItems.map(item => 
        updateInventoryQuantityApi(item.ingredientId, {
          type: "import",
          quantity: item.quantity,
          unitCost: item.unitCost,
          supplierId: selectedSupplier || undefined,
          isCredit: paymentStatus === "credit",
          expiryDate: item.expiryDate || undefined,
          batchNo: item.batchNo,
          reasonOrSupplier: reasonOrSupplier
        })
      ));

      toast.success("Tạo phiếu nhập hàng thành công!");
      onBack();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu nhập");
    }
  };

  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    `SP${ing.id.toString().padStart(6, '0')}`.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tạo phiếu nhập hàng</h2>
            <p className="text-xs text-slate-600 font-medium">Nhập nguyên liệu từ nhà cung cấp vào kho</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 text-sm flex items-center gap-2 cursor-pointer shadow-sm">
            <UploadCloud size={16} /> Nhập từ Excel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 cursor-pointer shadow-sm">
            <Save size={16} /> Lưu & Hoàn thành
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 min-h-[400px]">
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm mặt hàng theo tên hoặc mã..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
              />
              {searchTerm && filteredIngredients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {filteredIngredients.map(ing => (
                    <div 
                      key={ing.id} 
                      onClick={() => handleAddItem(ing)}
                      className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{ing.name}</div>
                        <div className="text-xs text-slate-500">Mã: SP{ing.id.toString().padStart(6, '0')}</div>
                      </div>
                      <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Tồn: {ing.stock} {ing.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Hàng hoá</th>
                    <th className="px-4 py-3 w-24">Số lượng</th>
                    <th className="px-4 py-3 w-32">Giá nhập</th>
                    <th className="px-4 py-3 w-32">Thành tiền</th>
                    <th className="px-4 py-3 w-32">Số lô</th>
                    <th className="px-4 py-3 w-32">Hạn sử dụng</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {importItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500 font-medium">
                        Chưa có mặt hàng nào. Vui lòng tìm và chọn mặt hàng để nhập.
                      </td>
                    </tr>
                  ) : importItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{item.ingredientName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">Mã: {item.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-16 p-1.5 border rounded text-center font-semibold focus:border-blue-500 outline-none" 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={item.unitCost} 
                          onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                          className="w-24 p-1.5 border rounded text-right font-semibold focus:border-blue-500 outline-none" 
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-right text-admin-primary">
                        {(item.quantity * item.unitCost).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.batchNo}
                          onChange={(e) => handleUpdateItem(idx, 'batchNo', e.target.value)}
                          placeholder="LOT-..." 
                          className="w-24 p-1.5 border rounded font-semibold focus:border-blue-500 outline-none text-xs" 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="date" 
                          value={item.expiryDate}
                          onChange={(e) => handleUpdateItem(idx, 'expiryDate', e.target.value)}
                          className="w-32 p-1.5 border rounded font-semibold focus:border-blue-500 outline-none text-xs" 
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded cursor-pointer"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h3 className="font-black text-slate-800 mb-4 border-b pb-2">Thông tin nhập hàng</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nhà cung cấp</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="flex-1 p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer"
                  >
                    <option value="">Chọn nhà cung cấp...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ngày nhập</label>
                <input 
                  type="datetime-local" 
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ghi chú</label>
                <textarea 
                  rows={3} 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm" 
                  placeholder="Ghi chú (tùy chọn)"
                ></textarea>
              </div>
            </div>

            <h3 className="font-black text-slate-800 mt-6 mb-4 border-b pb-2">Thông tin thanh toán</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">Tổng cộng</span>
                <span className="text-admin-primary text-lg">{totalAmount.toLocaleString()} ₫</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái thanh toán</label>
                <select 
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={`w-full p-2 border rounded outline-none text-sm font-semibold cursor-pointer ${
                    paymentStatus === 'paid' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <option value="paid">Đã thanh toán (Tiền mặt / Chuyển khoản)</option>
                  <option value="credit">Công nợ (Ghi nợ NCC)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
