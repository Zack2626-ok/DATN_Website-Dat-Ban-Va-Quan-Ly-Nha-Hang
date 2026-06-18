import React, { useState, useMemo } from "react";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { Badge } from "../../../components/Badge";
import { Modal } from "../../../components/Modal";
import { Utensils, Clock, Grid, RefreshCw, MoreVertical } from "lucide-react";
import AreaSelector from "../../../components/tables/AreaSelector";
import StatusLegend from "../../../components/tables/StatusLegend";
import OpenTableModal from "../../../components/tables/OpenTableModal";
import { MOCK_AREAS, MOCK_TABLES } from "../../../data/mockTables";
import { Table } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";

export const WaiterTableMap: React.FC = () => {
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(1);
  const [selectedTableId, setSelectedTableId] = useState<string | number | null>(null);
  const [isOrderingModalOpen, setIsOrderingModalOpen] = useState(false);
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  
  // Local state to simulate DB updates for Phase 1/2 UI testing
  const [tables, setTables] = useState<Table[]>(MOCK_TABLES);

  const areas = MOCK_AREAS;

  const filteredTables = useMemo(() => {
    return selectedAreaId 
      ? tables.filter(t => t.area_id === selectedAreaId)
      : tables;
  }, [selectedAreaId, tables]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id.toString() === selectedTableId?.toString()) || null,
    [tables, selectedTableId],
  );

  // Giả lập trạng thái order cho UI
  const activeOrder = useMemo(() => {
    if (selectedTable?.status === "serving" || selectedTable?.status === "pending_payment") {
      return {
        id: "ord_mock",
        items: [
          { name: "Bò lúc lắc", quantity: 1, price: 180 },
          { name: "Gà nướng", quantity: 2, price: 160 }
        ],
        totalAmount: 500,
        status: selectedTable?.status === "serving" ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PENDING_PAYMENT,
        customerName: "Nguyễn Văn A",
        customerPhone: "0912345678"
      };
    }
    return null;
  }, [selectedTable]);

  const handleOpenTable = (data: { guestCount: number; customerName: string; customerPhone: string }) => {
    if (!selectedTableId) return;
    
    // Simulate updating table status in frontend state
    setTables(prev => prev.map(t => 
      t.id.toString() === selectedTableId.toString() 
        ? { ...t, status: 'serving' } 
        : t
    ));
    
    toast.success(`Đã mở bàn ${selectedTable?.name} cho ${data.guestCount} khách`);
    setIsOpenTableModalOpen(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Cột Trái: Sơ đồ bàn */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800 font-display">
              Sơ đồ trạng thái bàn
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Quản lý khu vực và trạng thái phục vụ thời gian thực
            </p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <RefreshCw size={20} className="text-gray-400" />
          </button>
        </div>

        <AreaSelector 
          areas={areas} 
          selectedAreaId={selectedAreaId} 
          onSelectArea={setSelectedAreaId} 
        />

        <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 min-h-[500px] shadow-inner">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {filteredTables.map((table) => {
              const isSelected = selectedTableId?.toString() === table.id.toString();
              
              const statusStyles = {
                empty: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
                reserved: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
                serving: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
                pending_payment: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
              };

              const labels = {
                empty: "Trống",
                reserved: "Đã đặt",
                serving: "Đang dùng",
                pending_payment: "Chờ thanh toán",
              };

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableId(table.id)}
                  className={`relative p-5 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                    statusStyles[table.status as keyof typeof statusStyles]
                  } ${
                    isSelected ? "ring-4 ring-blue-500/20 border-blue-500 scale-105 shadow-lg" : "shadow-sm border-dashed"
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    <MoreVertical size={14} className="opacity-30" />
                  </div>
                  <span className="text-lg font-black">{table.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">
                    {table.capacity} Chỗ • {labels[table.status as keyof typeof labels]}
                  </span>
                  {table.status === "serving" && (
                    <div className="mt-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">
                      500.000₫
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <StatusLegend />
      </div>

      {/* Cột Phải: Action Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-6">
          {selectedTable ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start pb-4 border-b border-gray-50">
                <div>
                  <h4 className="text-2xl font-black text-gray-800">{selectedTable.name}</h4>
                  <p className="text-xs text-gray-400 font-medium">Sức chứa: {selectedTable.capacity} khách</p>
                </div>
                <Badge status={selectedTable.status} type="table" />
              </div>

              {/* Bàn Trống */}
              {selectedTable.status === "empty" && (
                <div className="py-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <Utensils size={32} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">Sẵn sàng phục vụ</h5>
                    <p className="text-xs text-gray-500 px-4 mt-1">Mở bàn mới để bắt đầu gọi món cho khách</p>
                  </div>
                  <div className="w-full space-y-3 mt-4">
                    <button 
                      onClick={() => setIsOpenTableModalOpen(true)}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-wider"
                    >
                      BẮT ĐẦU PHỤC VỤ (MỞ BÀN)
                    </button>
                    <button className="w-full py-3 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold text-xs hover:bg-gray-50 uppercase">
                      ĐẶT TRƯỚC BÀN
                    </button>
                  </div>
                </div>
              )}

              {/* Đang dùng */}
              {selectedTable.status === "serving" && activeOrder && (
                <div className="flex flex-col gap-5">
                  <h5 className="text-xs font-black text-blue-600 uppercase tracking-widest">Hóa đơn hiện tại</h5>
                  <div className="space-y-3">
                    {activeOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-sm font-bold text-gray-700">{item.name} <span className="text-gray-400 ml-1">x{item.quantity}</span></span>
                        <span className="text-sm font-black text-gray-800">{(item.price * item.quantity).toLocaleString()}k</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-dashed flex justify-between items-end">
                    <span className="text-sm font-bold text-gray-400">Tổng cộng</span>
                    <span className="text-2xl font-black text-gray-800">{activeOrder.totalAmount.toLocaleString()}.000₫</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-gray-50">CHUYỂN BÀN</button>
                    <button className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-gray-50">GỘP BÀN</button>
                    <button 
                      onClick={() => setIsOrderingModalOpen(true)}
                      className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      GỌI THÊM MÓN
                    </button>
                    <button className="col-span-2 py-4 bg-gray-800 text-white rounded-2xl font-black text-sm hover:bg-gray-900 transition-all">THANH TOÁN</button>
                  </div>
                </div>
              )}

              {/* Đã đặt */}
              {selectedTable.status === "reserved" && (
                <div className="py-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                    <Clock size={32} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">Bàn đã đặt trước</h5>
                    <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-left space-y-1">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Khách hàng</p>
                      <p className="text-sm font-black text-gray-800">Nguyễn Văn A</p>
                      <p className="text-xs font-medium text-gray-500">Dự kiến: 19:30 • 4 người</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setTables(prev => prev.map(t => 
                        t.id.toString() === selectedTableId?.toString() 
                          ? { ...t, status: 'serving' } 
                          : t
                      ));
                      toast.success(`Check-in thành công bàn ${selectedTable.name}`);
                    }}
                    className="w-full mt-4 py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all"
                  >
                    XÁC NHẬN CHECK-IN
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center text-center gap-4 text-gray-300">
              <Grid size={64} strokeWidth={1} />
              <p className="text-sm font-bold px-10">Vui lòng chọn bàn trên sơ đồ để xem thông tin</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Mở bàn */}
      <OpenTableModal 
        isOpen={isOpenTableModalOpen}
        onClose={() => setIsOpenTableModalOpen(false)}
        onConfirm={handleOpenTable}
        table={selectedTable}
      />

      {/* Modal gọi món (Mock) */}
      <Modal 
        isOpen={isOrderingModalOpen} 
        onClose={() => setIsOrderingModalOpen(false)}
        title="Chọn món cho bàn"
      >
        <div className="p-10 text-center space-y-4">
           <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
             <Utensils size={40} />
           </div>
           <p className="font-bold text-gray-500">Giao diện gọi món sẽ được triển khai ở Phase tiếp theo.</p>
           <button 
             onClick={() => setIsOrderingModalOpen(false)}
             className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold"
           >
             Đã hiểu
           </button>
        </div>
      </Modal>
    </div>
  );
};
