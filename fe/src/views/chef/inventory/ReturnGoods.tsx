import React, { useState, useEffect } from "react";
import { Search, Trash2, ArrowLeft, Check, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { getIngredientsApi, getSuppliersApi, updateInventoryQuantityApi, getIngredientBatchesApi } from "../../../services/api"; 

interface ReturnGoodsProps {
  onBack: () => void;
  initialReturnData?: any;
  onPrintReceipt?: (data: any) => void;
}

interface ReturnItem {
  draftTxId?: string | number;
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
        if (initialReturnData.note) setNote(initialReturnData.note);
        const inputSupplierId = initialReturnData.supplierId || initialReturnData.supplier_id;
        if (inputSupplierId) {
          setSelectedSupplier(String(inputSupplierId));
        } else if (initialReturnData.supplierName) {
          const matchSupp = supps.find(s => s.name === initialReturnData.supplierName);
          if (matchSupp) {
            setSelectedSupplier(String(matchSupp.id));
          }
        }

        // Auto-select paymentStatus based on whether the original slip was on credit
        if (initialReturnData.isCredit || Number(initialReturnData.debtAmount) > 0) {
          setPaymentStatus("deduct_credit");
        } else if (initialReturnData.isCredit === false) {
          setPaymentStatus("refund");
        }

        if (initialReturnData.items && initialReturnData.items.length > 0) {
          const mappedItems = await Promise.all(
            initialReturnData.items.map(async (it: any) => {
              let batches: any[] = [];
              try {
                if (it.ingredientId) {
                  batches = await getIngredientBatchesApi(it.ingredientId);
                }
              } catch (e) {}
              
              const selectedBatch = batches.find((b: any) => b.batch_code === it.batchNo);
              const remainingQty = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
              
              // If batch is exhausted (remainingQty <= 0), set quantity to 0!
              const initialQty = remainingQty > 0 ? Math.min(it.quantity || 1, remainingQty) : 0;

              return {
                draftTxId: it.draftTxId,
                ingredientId: it.ingredientId,
                ingredientName: it.ingredientName,
                code: it.code || `SP${it.ingredientId.toString().padStart(6, '0')}`,
                quantity: initialQty,
                unitCost: selectedBatch ? Number(selectedBatch.unit_cost) || it.unitCost || 0 : (it.unitCost || 0),
                batchNo: it.batchNo || selectedBatch?.batch_code || "",
                availableBatches: batches
              };
            })
          );
          setReturnItems(mappedItems);
        } else if (initialReturnData.ingId) {
          const ing = ings.find((i: any) => i.id === initialReturnData.ingId);
          if (ing) {
            const batches = await getIngredientBatchesApi(ing.id);
            const selectedBatch = batches.find((b: any) => b.batch_code === initialReturnData.batchNo);
            const remainingQty = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
            const initialQty = remainingQty > 0 ? Math.min(initialReturnData.maxQty || 1, remainingQty) : 0;
            
            setReturnItems([{
              draftTxId: initialReturnData.draftTxId,
              ingredientId: ing.id,
              ingredientName: ing.name,
              code: `SP${ing.id.toString().padStart(6, '0')}`,
              quantity: initialQty,
              unitCost: selectedBatch ? Number(selectedBatch.unit_cost) || 0 : 0,
              batchNo: initialReturnData.batchNo || batches[0]?.batch_code || "",
              availableBatches: batches
            }]);
          }
        }
      }
    }).catch(console.error);
  }, [initialReturnData]);

  const handleAddItem = async (ing: any) => {
    try {
      // Fetch batches for this ingredient to allow returning from specific batches
      const batches = await getIngredientBatchesApi(ing.id);
      const validBatches = batches.filter((b: any) => Number(b.remaining_quantity) > 0);

      if (validBatches.length === 0) {
        toast.error(`Nguyên liệu "${ing.name}" hiện không có lô hàng nào còn tồn kho!`);
        return;
      }

      setReturnItems(prev => [
        ...prev,
        {
          ingredientId: ing.id,
          ingredientName: ing.name,
          code: `SP${ing.id.toString().padStart(6, '0')}`,
          quantity: Math.min(1, Number(validBatches[0].remaining_quantity)),
          unitCost: Number(validBatches[0]?.unit_cost || 0),
          batchNo: validBatches[0]?.batch_code || "",
          availableBatches: batches
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
      const remainingQty = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
      if (remainingQty <= 0) {
        updated[index].quantity = 0;
      } else if (updated[index].quantity > remainingQty || updated[index].quantity <= 0) {
        updated[index].quantity = remainingQty;
      }
      if (selectedBatch) {
        updated[index].unitCost = Number(selectedBatch.unit_cost) || 0;
      }
    } else if (field === "quantity") {
      const val = Number(value) || 0;
      const selectedBatch = updated[index].availableBatches.find(b => b.batch_code === updated[index].batchNo);
      const maxRem = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
      if (maxRem <= 0) {
        updated[index].quantity = 0;
        toast.error(`Lô ${updated[index].batchNo || ''} đã hết hàng (Tồn: 0), không thể xuất trả!`);
      } else if (val > maxRem) {
        updated[index].quantity = maxRem;
        toast.error(`Số lượng xuất trả (${val}) không thể vượt quá tồn kho còn lại của lô (${maxRem}).`);
      } else if (val < 0) {
        updated[index].quantity = 0;
      } else {
        updated[index].quantity = val;
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setReturnItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  // Only calculate money for items with valid batch remaining stock > 0 and quantity > 0
  const totalAmount = returnItems.reduce((sum, item) => {
    const selectedBatch = item.availableBatches.find(b => b.batch_code === item.batchNo);
    const rem = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
    if (rem <= 0 || item.quantity <= 0) return sum;
    return sum + (item.quantity * item.unitCost);
  }, 0);

  const handleSave = async (mode: "draft" | "completed" = "completed") => {
    if (returnItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mặt hàng để trả");
      return;
    }

    // Filter valid items to return: must have remaining_quantity > 0 and quantity > 0
    const validItemsToReturn = returnItems.filter(item => {
      const selectedBatch = item.availableBatches.find(b => b.batch_code === item.batchNo);
      const rem = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
      return item.quantity > 0 && rem > 0;
    });

    if (validItemsToReturn.length === 0) {
      toast.error("Tất cả các lô hàng chọn trả đều đã hết tồn kho (Tồn = 0) hoặc chưa nhập số lượng trả. Không thể tạo phiếu trả hàng!");
      return;
    }
    
    try {
      const supplierObj = suppliers.find(s => s.id == selectedSupplier);
      const supplierName = supplierObj ? supplierObj.name : "NCC khác";
      const slipCode = initialReturnData?.ticketCode 
        ? initialReturnData.ticketCode 
        : `TXT${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}N-${Date.now().toString().slice(-4)}`;

      const isCreditDeduction = paymentStatus === "deduct_credit";
      const baseReason = `[SLIP:${slipCode}] Trả hàng cho ${supplierName}${isCreditDeduction ? " - Trừ công nợ" : ""}`;
      const reasonOrSupplier = note ? `${baseReason} - Ghi chú: ${note}` : baseReason;
      
      await Promise.all(validItemsToReturn.map(item => 
        updateInventoryQuantityApi(item.ingredientId, {
          type: "export",
          reasonType: "return_to_supplier",
          status: mode === "draft" ? "draft" : "completed",
          quantity: item.quantity,
          unitCost: item.unitCost,
          supplierId: selectedSupplier || undefined,
          isCredit: paymentStatus === "deduct_credit",
          batchNo: item.batchNo,
          reasonOrSupplier: reasonOrSupplier,
          ingredientName: item.ingredientName,
          draftTxId: item.draftTxId
        })
      ));

      if (mode === "draft") {
        toast.success("Đã lưu tạm phiếu trả hàng!");
      } else {
        toast.success("Tạo phiếu trả hàng thành công!");
        if (onPrintReceipt) {
          onPrintReceipt({
            title: "PHIẾU XUẤT TRẢ",
            ticketCode: slipCode,
            supplierName,
            dateStr: returnDate,
            userName: "Nhân viên kho",
            items: validItemsToReturn.map(i => ({
              name: i.ingredientName,
              quantity: i.quantity,
              price: i.unitCost,
              total: i.quantity * i.unitCost
            })),
            totalAmount,
            paidAmount: paymentStatus === "refund" ? totalAmount : 0,
            debtAmount: paymentStatus === "deduct_credit" ? totalAmount : 0,
            isCredit: paymentStatus === "deduct_credit",
            paymentStatus,
            note
          });
        }
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
                        <div className="text-xs text-slate-500">Đơn vị: {ing.unit}</div>
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
                    <th className="px-4 py-3 w-28 text-right">Thành tiền</th>
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
                  ) : returnItems.map((item, idx) => {
                    const selectedBatch = item.availableBatches.find(b => b.batch_code === item.batchNo);
                    const remainingQty = selectedBatch ? Number(selectedBatch.remaining_quantity || 0) : 0;
                    const isBatchEmpty = remainingQty <= 0;
                    const itemTotalMoney = isBatchEmpty || item.quantity <= 0 ? 0 : item.quantity * item.unitCost;

                    return (
                      <tr key={idx} className={`border-b border-slate-100 ${isBatchEmpty ? "bg-rose-50/30" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-4 font-medium">{idx + 1}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{item.ingredientName}</div>
                          {isBatchEmpty && (
                            <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-0.5">
                              <Lock size={10} /> Lô này đã hết hàng (Tồn: 0) — Không tính tiền trả
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.availableBatches.length > 0 ? (
                            <select
                              value={item.batchNo}
                              onChange={(e) => handleUpdateItem(idx, 'batchNo', e.target.value)}
                              className={`w-40 p-1.5 border rounded text-xs font-semibold focus:border-blue-500 outline-none cursor-pointer ${
                                isBatchEmpty ? "border-rose-300 bg-rose-50 text-rose-700 font-bold" : ""
                              }`}
                            >
                              <option value="">-- Chọn lô --</option>
                              {item.availableBatches.map(b => {
                                const unit = ingredients.find(i => String(i.id) === String(item.ingredientId))?.unit || '';
                                const rem = Number(b.remaining_quantity || 0);
                                return (
                                  <option key={b.id} value={b.batch_code}>
                                    {b.batch_code} {rem <= 0 ? "(Hết lô - 0)" : `(Hiện còn ${rem} ${unit})`}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <span className="text-xs text-rose-600 font-extrabold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <Lock size={12} /> Hết lô
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            min="0.001"
                            disabled={isBatchEmpty}
                            readOnly={isBatchEmpty}
                            value={isBatchEmpty ? 0 : item.quantity} 
                            onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                            className={`w-16 p-1.5 border rounded text-center font-bold outline-none ${
                              isBatchEmpty 
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                                : "focus:border-blue-500 text-slate-800"
                            }`} 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            min="0"
                            disabled={isBatchEmpty}
                            readOnly={isBatchEmpty}
                            value={item.unitCost} 
                            onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                            className={`w-24 p-1.5 border rounded text-right font-semibold outline-none ${
                              isBatchEmpty 
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                                : "focus:border-blue-500 text-slate-800"
                            }`} 
                          />
                        </td>
                        <td className="px-4 py-3 font-bold text-right tabular-nums">
                          {isBatchEmpty ? (
                            <span className="text-slate-400 text-xs font-semibold">0 ₫</span>
                          ) : (
                            <span className="text-rose-600 font-black">{itemTotalMoney.toLocaleString()} ₫</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded cursor-pointer"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
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
                  <option value="deduct_credit">Giảm trừ vào Công nợ NCC</option>
                </select>
              </div>

              {selectedSupplier && (
                (() => {
                  const supp = suppliers.find(s => String(s.id) === String(selectedSupplier));
                  const currentDebt = supp ? Number(supp.total_debt) || 0 : 0;
                  const isFromCreditSlip = initialReturnData?.isCredit;

                  return (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold space-y-2">
                      {initialReturnData?.ticketCode && (
                        <div className="pb-1.5 border-b border-slate-200 text-blue-800 font-extrabold flex justify-between">
                          <span>Phiếu nhập: {initialReturnData.ticketCode}</span>
                          <span className={isFromCreditSlip ? "text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" : "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"}>
                            {isFromCreditSlip ? "Mua chịu (Công nợ)" : "Đã thanh toán"}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600">
                        <span>Tổng nợ NCC (tất cả phiếu):</span>
                        <span className="font-bold text-slate-800">{currentDebt.toLocaleString()} ₫</span>
                      </div>

                      {paymentStatus === "deduct_credit" ? (
                        <>
                          <div className="flex justify-between text-indigo-700">
                            <span>Giảm trừ công nợ:</span>
                            <span className="font-bold">-{totalAmount.toLocaleString()} ₫</span>
                          </div>
                          <div className="flex justify-between text-indigo-900 font-extrabold border-t pt-1.5">
                            <span>Nợ NCC còn lại:</span>
                            <span>{Math.max(0, currentDebt - totalAmount).toLocaleString()} ₫</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-emerald-700 pt-1 border-t border-slate-200">
                          <span>NCC hoàn tiền mặt / CK:</span>
                          <span className="font-extrabold">+{totalAmount.toLocaleString()} ₫</span>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
