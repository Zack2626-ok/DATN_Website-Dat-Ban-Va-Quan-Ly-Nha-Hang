import React, { useState, useEffect } from "react";
import { Search, Trash2, ArrowLeft, Save, UploadCloud, Check, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { getIngredientsApi, getSuppliersApi, updateInventoryQuantityApi, getIngredientBatchesApi } from "../../../services/api"; 

interface ReturnGoodsProps {
  onBack: () => void;
  initialReturnData?: any;
  onPrintReceipt?: (data: any) => void;
}

interface ReturnItem {
  ingredientId: string;
  ingredientName: string;
  code: string;
  quantity: number;
  unitCost: number;
  batchNo: string;
  availableBatches: any[];
}

export const ReturnGoods: React.FC<ReturnGoodsProps> = ({ onBack, initialReturnData, onPrintReceipt }) => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("refund"); // "refund" or "deduct_credit"

  useEffect(() => {
    Promise.all([getIngredientsApi(), getSuppliersApi()]).then(async ([ings, supps]) => {
      setIngredients(ings);
      setSuppliers(supps);
      
      if (initialReturnData) {
        const ing = ings.find((i: any) => i.id === initialReturnData.ingId);
        if (ing) {
            const batches = await getIngredientBatchesApi(ing.id);
            const validBatches = batches.filter((b: any) => b.remaining_quantity > 0);
            
            if (initialReturnData.supplier_id) {
                setSelectedSupplier(initialReturnData.supplier_id.toString());
            }

            setReturnItems([{
                ingredientId: ing.id,
                ingredientName: ing.name,
                code: `SP${ing.id.toString().padStart(6, '0')}`,
                quantity: initialReturnData.maxQty > 0 ? initialReturnData.maxQty : 1,
                unitCost: validBatches.find((b: any) => b.batch_code === initialReturnData.batchNo)?.unit_cost || 0,
                batchNo: initialReturnData.batchNo,
                availableBatches: validBatches
            }]);
        }
      }
    }).catch(console.error);
  }, [initialReturnData]);

  const handleAddItem = async (ing: any) => {
    try {
      // Fetch batches for this ingredient to allow returning from specific batches
      const batches = await getIngredientBatchesApi(ing.id);
      const validBatches = batches.filter((b: any) => b.remaining_quantity > 0);

      setReturnItems(prev => [
        ...prev,
        {
          ingredientId: ing.id,
          ingredientName: ing.name,
          code: `SP${ing.id.toString().padStart(6, '0')}`,
          quantity: 1,
          unitCost: validBatches[0]?.unit_cost || 0,
          batchNo: validBatches[0]?.batch_code || "",
          availableBatches: validBatches
        }
      ]);
      setSearchTerm("");
    } catch (e) {
      toast.error("Không thể tải danh sách lô hàng của nguyên liệu này");
    }
  };

  const handleUpdateItem = (index: number, field: keyof ReturnItem, value: any) => {
    const updated = [...returnItems];
    if (field === "batchNo") {
      const selectedBatch = updated[index].availableBatches.find(b => b.batch_code === value);
      updated[index].batchNo = value;
      if (selectedBatch) {
        updated[index].unitCost = selectedBatch.unit_cost;
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setReturnItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = returnItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const handleSave = async (mode: "draft" | "completed" | "save_print" = "completed") => {
    if (returnItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mặt hàng để trả");
      return;
    }
    
    try {
      const supplierObj = suppliers.find(s => s.id == selectedSupplier);
      const supplierName = supplierObj ? supplierObj.name : "NCC khác";
      const reasonOrSupplier = `Trả hàng cho ${supplierName} - Ghi chú: ${note}`;
      
      await Promise.all(returnItems.map(item => 
        updateInventoryQuantityApi(item.ingredientId, {
          type: "export",
          reasonType: "return_supplier",
          status: mode === "draft" ? "draft" : "completed",
          quantity: item.quantity,
          unitCost: item.unitCost,
          supplierId: selectedSupplier || undefined,
          isCredit: paymentStatus === "deduct_credit",
          batchNo: item.batchNo,
          reasonOrSupplier: reasonOrSupplier
        })
      ));

      if (mode === "draft") {
        toast.success("Đã lưu tạm phiếu trả hàng!");
      } else {
        toast.success("Tạo phiếu trả hàng thành công!");
      }

      if (mode === "save_print" && onPrintReceipt) {
        onPrintReceipt({
          title: "PHIẾU XUẤT TRẢ",
          ticketCode: `TXT${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`,
          supplierName,
          dateStr: returnDate,
          userName: "Nhân viên kho",
          items: returnItems.map(i => ({
            name: i.ingredientName,
            quantity: i.quantity,
            price: i.unitCost,
            total: i.quantity * i.unitCost
          })),
          totalAmount,
          paidAmount: paymentStatus === "refund" ? totalAmount : 0,
          debtAmount: paymentStatus === "deduct_credit" ? totalAmount : 0,
          note
        });
      }

      onBack();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu trả hàng");
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
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tạo phiếu trả hàng nhập</h2>
            <p className="text-xs text-slate-600 font-medium">Xuất trả nguyên liệu lại cho nhà cung cấp</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave("draft")}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Check size={14} /> LƯU TẠM
          </button>
          <button
            type="button"
            onClick={() => handleSave("completed")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Check size={14} /> LƯU
          </button>
          <button
            type="button"
            onClick={() => handleSave("save_print")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Printer size={14} /> LƯU & IN
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
                placeholder="Tìm kiếm mặt hàng theo tên hoặc mã để xuất trả..." 
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
                    <th className="px-4 py-3 w-40">Lô xuất trả</th>
                    <th className="px-4 py-3 w-24">Số lượng</th>
                    <th className="px-4 py-3 w-28">Đơn giá trả</th>
                    <th className="px-4 py-3 w-28">Thành tiền</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        Chưa có mặt hàng nào. Vui lòng tìm và chọn mặt hàng để trả.
                      </td>
                    </tr>
                  ) : returnItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{item.ingredientName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">Mã: {item.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        {item.availableBatches.length > 0 ? (
                          <select
                            value={item.batchNo}
                            onChange={(e) => handleUpdateItem(idx, 'batchNo', e.target.value)}
                            className="w-40 p-1.5 border rounded text-xs font-semibold focus:border-blue-500 outline-none cursor-pointer"
                          >
                            <option value="">-- Chọn lô --</option>
                            {item.availableBatches.map(b => {
                              const unit = ingredients.find(i => i.id === item.ingredientId)?.unit || '';
                              return (
                                <option key={b.id} value={b.batch_code}>
                                  {b.batch_code} (Hiện còn {b.remaining_quantity} {unit})
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <span className="text-xs text-rose-500 font-medium italic">Hết lô</span>
                        )}
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
                      <td className="px-4 py-3 font-bold text-right text-rose-600">
                        {(item.quantity * item.unitCost).toLocaleString()}
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
            <h3 className="font-black text-slate-800 mb-4 border-b pb-2">Thông tin trả hàng</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nhà cung cấp trả lại</label>
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
                <label className="text-xs font-bold text-slate-600 block mb-1">Ngày xuất trả</label>
                <input 
                  type="datetime-local" 
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Lý do / Ghi chú trả hàng</label>
                <textarea 
                  rows={3} 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm" 
                  placeholder="Hàng hỏng, sai quy cách..."
                ></textarea>
              </div>
            </div>

            <h3 className="font-black text-slate-800 mt-6 mb-4 border-b pb-2">Thông tin nhận tiền</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">Tổng giá trị trả</span>
                <span className="text-rose-600 text-lg">{totalAmount.toLocaleString()} ₫</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Hình thức hoàn tiền</label>
                <select 
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={`w-full p-2 border rounded outline-none text-sm font-semibold cursor-pointer ${
                    paymentStatus === 'refund' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}
                >
                  <option value="refund">Nhận tiền mặt / CK lại</option>
                  {(suppliers.find(s => s.id == selectedSupplier)?.debt || 0) > 0 && (
                    <option value="deduct_credit">Giảm trừ vào Công nợ NCC (Đang nợ {(suppliers.find(s => s.id == selectedSupplier)?.debt || 0).toLocaleString()} ₫)</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
