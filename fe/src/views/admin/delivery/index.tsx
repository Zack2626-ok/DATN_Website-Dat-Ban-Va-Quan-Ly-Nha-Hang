import React, { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { fetchOrders, updateOrderStatusOnServer, placeOrder } from "../../../store/orderSlice";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { Truck, Check, Clock, User, Phone, MapPin } from "lucide-react";
import { Modal } from "../../../components/Modal";

/**
 * DeliveryManagement - Kanban board for delivery and takeaway orders.
 * Fetches real orders from the database and drives status transitions.
 */
export const DeliveryManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((state) => state.orders.orders);
  const loading = useAppSelector((state) => (state.orders as any).loading);

  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);

  // Form states for creating new delivery order from Admin Console
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newOrderItems, setNewOrderItems] = useState<{ name: string; price: number; quantity: number }[]>([
    { name: "Bò lúc lắc", price: 265, quantity: 1 }
  ]);

  // Fetch orders from server on mount
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  // Filter for delivery/takeaway orders
  const deliveryOrders = useMemo(() => {
    return orders.filter((o) => o.orderType === "delivery" || o.orderType === "takeaway" || !o.tableId);
  }, [orders]);

  // Columns classification
  const newOrders = useMemo(() => deliveryOrders.filter((o) => o.status === ORDER_STATUS.CONFIRMED), [deliveryOrders]);
  const preparingOrders = useMemo(() => deliveryOrders.filter((o) => o.status === ORDER_STATUS.IN_KITCHEN), [deliveryOrders]);
  const readyOrders = useMemo(() => deliveryOrders.filter((o) => o.status === ORDER_STATUS.SERVED), [deliveryOrders]);
  const deliveredOrders = useMemo(() => deliveryOrders.filter((o) => o.status === ORDER_STATUS.PAID), [deliveryOrders]);

  const handleStatusTransition = (id: string, nextStatus: string) => {
    dispatch(updateOrderStatusOnServer({ id, status: nextStatus as any }));
  };

  const handleCreateDeliveryOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone || !newCustAddress) return;

    const orderId = "ord_adm_" + Math.random().toString(36).substr(2, 9);
    const total = newOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const payload = {
      id: orderId,
      items: newOrderItems.map((item, index) => ({
        menuItemId: `m_custom_${index}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      status: ORDER_STATUS.CONFIRMED,
      totalAmount: total,
      customerName: newCustName,
      customerPhone: newCustPhone,
      customerEmail: newCustEmail || undefined,
      guestCount: 1,
      deliveryAddress: newCustAddress,
      orderType: "delivery" as const,
    };

    await dispatch(placeOrder(payload));

    // Reset Form
    setNewCustName("");
    setNewCustPhone("");
    setNewCustAddress("");
    setNewCustEmail("");
    setNewOrderItems([{ name: "Bò lúc lắc", price: 265, quantity: 1 }]);
    setIsAddOrderOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-admin-text-main">
      {/* Header bar */}
      <div className="border-b border-admin-border pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-extrabold font-display">Giao hàng & Mang đi</h3>
          <p className="text-xs text-admin-text-sub mt-1">Quản lý các đơn hàng giao tận nơi và mang đi thực tế</p>
        </div>
        <button
          onClick={() => setIsAddOrderOpen(true)}
          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer font-display transition-colors shadow-xs"
        >
          <Truck size={14} /> Tạo đơn giao hàng mới
        </button>
      </div>

      {loading && (
        <div className="text-xs text-admin-primary font-bold animate-pulse flex items-center gap-2">
          <Clock size={14} /> Đang đồng bộ hóa dữ liệu đơn hàng với máy chủ...
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        
        {/* Column 1: Đơn mới */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-extrabold text-xs text-slate-700">Đơn mới</span>
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
              {newOrders.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {newOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.id}</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[8px] font-black rounded border border-blue-100 uppercase">
                    {order.orderType || "delivery"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 font-medium">
                  <span className="font-bold text-slate-700 flex items-center gap-1"><User size={10} /> {order.customerName}</span>
                  <span className="flex items-center gap-1"><Phone size={10} /> {order.customerPhone}</span>
                  {order.deliveryAddress && (
                    <span className="truncate flex items-center gap-1"><MapPin size={10} /> {order.deliveryAddress}</span>
                  )}
                </div>
                <div className="border-t border-b border-slate-100 py-2 text-[10px] text-slate-600 font-semibold">
                  <ul className="list-disc pl-3">
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Tổng cộng:</span>
                  <span className="text-admin-primary font-black">
                    {(order.totalAmount * 1000).toLocaleString("vi-VN")} vnđ
                  </span>
                </div>
                <button
                  onClick={() => handleStatusTransition(order.id, ORDER_STATUS.IN_KITCHEN)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer mt-1 font-display"
                >
                  Bắt đầu chế biến
                </button>
              </div>
            ))}
            {newOrders.length === 0 && (
              <span className="text-[10px] text-slate-400 italic text-center py-4">Không có đơn hàng mới</span>
            )}
          </div>
        </div>

        {/* Column 2: Đang chuẩn bị */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-extrabold text-xs text-slate-700">Đang chuẩn bị</span>
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {preparingOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.id}</span>
                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[8px] font-black rounded border border-purple-100 uppercase">
                    {order.orderType || "delivery"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 font-medium">
                  <span className="font-bold text-slate-700 flex items-center gap-1"><User size={10} /> {order.customerName}</span>
                  <span className="flex items-center gap-1"><Phone size={10} /> {order.customerPhone}</span>
                </div>
                <div className="border-t border-b border-slate-100 py-2 text-[10px] text-slate-600 font-semibold">
                  <ul className="list-disc pl-3">
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Tổng cộng:</span>
                  <span className="text-admin-primary font-black">
                    {(order.totalAmount * 1000).toLocaleString("vi-VN")} vnđ
                  </span>
                </div>
                <button
                  onClick={() => handleStatusTransition(order.id, ORDER_STATUS.SERVED)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer mt-1 font-display"
                >
                  Đánh dấu sẵn sàng
                </button>
              </div>
            ))}
            {preparingOrders.length === 0 && (
              <span className="text-[10px] text-slate-400 italic text-center py-4">Không có đơn đang chế biến</span>
            )}
          </div>
        </div>

        {/* Column 3: Sẵn sàng */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-extrabold text-xs text-slate-700">Sẵn sàng</span>
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {readyOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.id}</span>
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded border border-emerald-100 uppercase">
                    {order.orderType || "delivery"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 font-medium">
                  <span className="font-bold text-slate-700 flex items-center gap-1"><User size={10} /> {order.customerName}</span>
                  <span className="flex items-center gap-1"><Phone size={10} /> {order.customerPhone}</span>
                </div>
                <div className="border-t border-b border-slate-100 py-2 text-[10px] text-slate-600 font-semibold">
                  <ul className="list-disc pl-3">
                    {order.items.map((item, index) => (
                      <li key={index}>
                        {item.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Tổng cộng:</span>
                  <span className="text-admin-primary font-black">
                    {(order.totalAmount * 1000).toLocaleString("vi-VN")} vnđ
                  </span>
                </div>
                <button
                  onClick={() => handleStatusTransition(order.id, ORDER_STATUS.PAID)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer mt-1 font-display flex items-center justify-center gap-1"
                >
                  <Check size={10} /> Đã giao hàng
                </button>
              </div>
            ))}
            {readyOrders.length === 0 && (
              <span className="text-[10px] text-slate-400 italic text-center py-4">Không có đơn đang chờ giao</span>
            )}
          </div>
        </div>

        {/* Column 4: Đã giao */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-col gap-4 min-h-[500px]">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-extrabold text-xs text-slate-700">Đã giao thành công</span>
            <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
              {deliveredOrders.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {deliveredOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-3 opacity-75">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-slate-800 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{order.id}</span>
                  <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[8px] font-black rounded border border-slate-200 uppercase">
                    {order.orderType || "delivery"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-[10px] text-slate-500 font-medium">
                  <span className="font-bold text-slate-755 flex items-center gap-1"><User size={10} /> {order.customerName}</span>
                  {order.deliveryAddress && (
                    <span className="truncate flex items-center gap-1"><MapPin size={10} /> {order.deliveryAddress}</span>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-550 font-semibold">Đã thanh toán:</span>
                  <span className="text-emerald-600 font-black">
                    {(order.totalAmount * 1000).toLocaleString("vi-VN")} vnđ
                  </span>
                </div>
              </div>
            ))}
            {deliveredOrders.length === 0 && (
              <span className="text-[10px] text-slate-400 italic text-center py-4">Không có đơn đã giao</span>
            )}
          </div>
        </div>

      </div>

      {/* Add Delivery Order Modal */}
      <Modal
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        title="Tạo đơn giao hàng mới (Admin)"
        size="md"
      >
        <form onSubmit={handleCreateDeliveryOrder} className="flex flex-col gap-4 text-slate-800">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Họ và tên khách hàng *</label>
            <input
              type="text"
              required
              placeholder="e.g. Nguyễn Văn Thắng"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Số điện thoại *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0988777666"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Email (Không bắt buộc)</label>
              <input
                type="email"
                placeholder="e.g. thang@gmail.com"
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Địa chỉ giao hàng *</label>
            <input
              type="text"
              required
              placeholder="e.g. 456 Nguyễn Thị Minh Khai, Quận 3, HCM"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Dummy selected dishes for easy testing */}
          <div className="border border-slate-100 bg-slate-50/50 p-3.5 rounded-xl flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Danh mục món ăn chọn mẫu</span>
            <div className="flex justify-between items-center text-xs p-2 bg-white border border-slate-200 rounded-lg">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800">Combo Thượng Hạng</span>
                <span className="text-[10px] text-slate-400">265.000 vnđ</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewOrderItems(prev => [{ ...prev[0], quantity: Math.max(1, prev[0].quantity - 1) }])}
                  className="w-5 h-5 bg-slate-100 rounded text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-slate-800 text-xs px-1">{newOrderItems[0].quantity}</span>
                <button
                  type="button"
                  onClick={() => setNewOrderItems(prev => [{ ...prev[0], quantity: prev[0].quantity + 1 }])}
                  className="w-5 h-5 bg-slate-100 rounded text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOrderOpen(false)}
              className="px-5 py-2.5 text-xs font-bold bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
            >
              HỦY BỎ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer transition-colors"
            >
              TẠO ĐƠN HÀNG
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
