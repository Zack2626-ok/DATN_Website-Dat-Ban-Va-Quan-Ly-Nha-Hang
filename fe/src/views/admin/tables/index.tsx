import React, { useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { TABLE_STATUS } from "../../../constants/tableStatus";
import { Badge } from "../../../components/Badge";
import { Modal } from "../../../components/Modal";
import {
  createOrder,
  addItemsToOrder,
  updateOrderStatus,
} from "../../../store/orderSlice";
import { occupyTable, makeTableAvailable } from "../../../store/tableSlice";
import { Utensils, Clock, Grid, RefreshCw } from "lucide-react";
import type { MenuItem } from "../../../interfaces";

/**
 * WaiterTableMap - Renders table grids and action drawers for placing/updating orders
 */
export const WaiterTableMap: React.FC = () => {
  const dispatch = useAppDispatch();
  const tables = useAppSelector((state) => state.tables.tables);
  const orders = useAppSelector((state) => state.orders.orders);
  const menu = useAppSelector((state) => state.menu.items);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isOrderingModalOpen, setIsOrderingModalOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [cart, setCart] = useState<
    { menuItemId: string | number; name: string; price: number; quantity: number }[]
  >([]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) || null,
    [tables, selectedTableId],
  );

  const activeOrder = useMemo(() => {
    if (!selectedTable || !selectedTable.currentOrderId) return null;
    return orders.find((o) => o.id === selectedTable.currentOrderId) || null;
  }, [orders, selectedTable]);

  const handleAddToCart = (item: MenuItem) => {
    const inStock = item.inStock ?? item.is_active ?? item.available ?? true;
    if (!inStock) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const handleCreateWaiterOrder = () => {
    if (!selectedTableId || cart.length === 0) return;
    const newOrderId = "ord_" + Math.random().toString(36).substr(2, 9);
    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    dispatch(
      createOrder({
        id: newOrderId,
        tableId: selectedTableId,
        tableName: selectedTable?.name || "",
        guestCount,
        items: cart,
        status: ORDER_STATUS.CONFIRMED,
        totalAmount: total,
      }),
    );

    dispatch(occupyTable({ id: selectedTableId, orderId: newOrderId }));
    setCart([]);
    setIsOrderingModalOpen(false);
  };

  const handleAddMoreItems = () => {
    if (!activeOrder || cart.length === 0) return;
    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    dispatch(
      addItemsToOrder({
        id: activeOrder.id,
        items: cart,
        totalAmount: total,
      }),
    );

    if (activeOrder.status === ORDER_STATUS.SERVED) {
      dispatch(
        updateOrderStatus({
          id: activeOrder.id,
          status: ORDER_STATUS.CONFIRMED,
        }),
      );
    }

    setCart([]);
    setIsOrderingModalOpen(false);
  };

  const handleCheckInReserved = (tableId: string, orderId: string) => {
    dispatch(occupyTable({ id: tableId, orderId }));
  };

  const handleCompleteCleaning = (tableId: string) => {
    dispatch(makeTableAvailable({ id: tableId }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Table Maps */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-admin-text-main font-display">
            Sơ đồ trạng thái bàn
          </h3>
          <span className="text-xs text-admin-text-sub">
            Chọn một bàn để thực hiện các thao tác quản lý đơn hàng
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-admin-border">
          {tables.map((table) => {
            const isSelected = selectedTableId === table.id;
            const statusColor =
              table.status === TABLE_STATUS.AVAILABLE
                ? "bg-[#e8f5e9] border-[#a5d6a7] text-[#2e7d32]"
                : table.status === TABLE_STATUS.RESERVED
                  ? "bg-[#fffde7] border-[#fff59d] text-[#f57f17]"
                  : table.status === TABLE_STATUS.OCCUPIED
                    ? "bg-[#ffebee] border-[#ef9a9a] text-[#c62828]"
                    : "bg-[#e3f2fd] border-[#90caf9] text-[#1565c0]";

            const order = orders.find((o) => o.id === table.currentOrderId);
            const priceLabel = order
              ? `${(order.totalAmount * 1000).toLocaleString("vi-VN")} vnđ`
              : null;
            const VietnameseLabels: { [key: string]: string } = {
              available: "Trống",
              reserved: "Đã đặt",
              occupied: "Đang phục vụ",
              cleaning: "Chờ thanh toán",
            };

            return (
              <div
                key={table.id}
                onClick={() => setSelectedTableId(table.id)}
                className={`p-4 border rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer transition-all ${statusColor} ${
                  isSelected
                    ? "ring-2 ring-admin-primary scale-102 shadow-xs"
                    : "hover:scale-[1.01] shadow-2xs"
                }`}
              >
                <span className="text-[12px] font-extrabold font-display">
                  {table.name}
                </span>
                <span className="text-[10px] font-semibold opacity-85">
                  {table.seats} chỗ
                </span>
                {priceLabel && (
                  <span className="text-[11px] font-extrabold my-0.5">
                    {priceLabel}
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/60 border border-current/10 mt-1">
                  {VietnameseLabels[table.status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Action panel */}
      <div className="bg-white p-6 rounded-2xl border border-admin-border flex flex-col gap-6 shadow-xs">
        {selectedTable ? (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-admin-border pb-4">
              <div>
                <h4 className="text-lg font-bold text-admin-text-main">
                  {selectedTable.name}
                </h4>
                <span className="text-xs text-admin-text-sub capitalize">
                  Khu vực: {selectedTable.zone} ({selectedTable.seats} chỗ)
                </span>
              </div>
              <Badge status={selectedTable.status} type="table" theme="light" />
            </div>

            {/* Conditional actions */}
            {selectedTable.status === TABLE_STATUS.AVAILABLE && (
              <div className="flex flex-col gap-4 text-center py-6">
                <Utensils size={36} className="text-slate-400 mx-auto" />
                <h5 className="font-bold text-sm text-admin-text-main">
                  Bàn trống
                </h5>
                <p className="text-xs text-admin-text-sub">
                  Thêm khách dùng tại chỗ hoặc tạo đơn gọi món trực tiếp.
                </p>

                <div className="flex flex-col gap-2.5 mt-2">
                  <div className="flex items-center justify-between text-xs px-2 text-admin-text-sub font-semibold">
                    <span>Số lượng khách ngồi:</span>
                    <input
                      type="number"
                      min={1}
                      max={selectedTable.seats}
                      value={guestCount}
                      onChange={(e) =>
                        setGuestCount(parseInt(e.target.value) || 1)
                      }
                      className="w-16 bg-slate-50 border border-admin-border rounded py-1 px-2 text-center focus:outline-none text-admin-text-main focus:border-admin-primary"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setCart([]);
                      setIsOrderingModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-admin-primary text-white text-xs font-bold tracking-widest rounded-lg hover:bg-admin-primary-hover cursor-pointer font-display transition-colors"
                  >
                    MỞ GIỎ GỌI MÓN
                  </button>
                </div>
              </div>
            )}

            {selectedTable.status === TABLE_STATUS.RESERVED && (
              <div className="flex flex-col gap-4 text-center py-6">
                <Clock size={36} className="text-amber-500/80 mx-auto" />
                <h5 className="font-bold text-sm text-admin-text-main">
                  Bàn đã được đặt trước
                </h5>
                <p className="text-xs text-admin-text-sub">
                  Khách hàng đã đặt bàn này trực tuyến. Đang chờ khách đến.
                </p>

                {activeOrder && (
                  <div className="text-left bg-slate-50 p-3 rounded-lg border border-admin-border text-xs flex flex-col gap-1.5 mt-2 text-admin-text-sub font-medium">
                    <div>
                      <strong>Tên khách hàng:</strong>{" "}
                      {activeOrder.customerName}
                    </div>
                    <div>
                      <strong>Số điện thoại:</strong>{" "}
                      {activeOrder.customerPhone}
                    </div>
                    <div>
                      <strong>Sức chứa yêu cầu:</strong>{" "}
                      {activeOrder.guestCount} khách
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (activeOrder) {
                      handleCheckInReserved(selectedTable.id, activeOrder.id);
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-500 text-black text-xs font-bold tracking-widest rounded-lg hover:bg-emerald-400 cursor-pointer font-display mt-2"
                >
                  XÁC NHẬN KHÁCH ĐẾN (SỬ DỤNG BÀN)
                </button>
              </div>
            )}

            {selectedTable.status === TABLE_STATUS.OCCUPIED && (
              <div className="flex flex-col gap-4">
                <h5 className="font-bold text-sm text-admin-primary">
                  Hóa đơn món đang dùng
                </h5>
                {activeOrder ? (
                  <div className="flex flex-col gap-3">
                    <div className="max-h-[180px] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar">
                      {activeOrder.items.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-2">
                          Chưa gọi món nào. Vui lòng mở danh mục thực đơn.
                        </p>
                      ) : (
                        activeOrder.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-admin-border"
                          >
                            <span className="font-semibold text-admin-text-main">
                              {item.name}{" "}
                              <strong className="text-admin-text-sub font-normal">
                                x{item.quantity}
                              </strong>
                            </span>
                            <span className="font-bold text-admin-text-main">
                              {(
                                item.price *
                                item.quantity *
                                1000
                              ).toLocaleString("vi-VN")}{" "}
                              vnđ
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold border-t border-admin-border pt-3 text-admin-text-main">
                      <span>Tổng tiền:</span>
                      <span className="text-admin-primary">
                        {(activeOrder.totalAmount * 1000).toLocaleString(
                          "vi-VN",
                        )}{" "}
                        vnđ
                      </span>
                    </div>

                    <div className="text-xs text-admin-text-sub bg-slate-50 p-2.5 rounded-md border border-admin-border flex justify-between items-center font-semibold">
                      <span>Trạng thái đơn:</span>
                      <Badge status={activeOrder.status} theme="light" />
                    </div>

                    <button
                      onClick={() => {
                        setCart([]);
                        setIsOrderingModalOpen(true);
                      }}
                      className="w-full py-2.5 border border-admin-border hover:border-admin-primary/60 text-admin-text-main hover:text-admin-primary text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer mt-2 font-display transition-colors"
                    >
                      GỌI THÊM MÓN
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-rose-400 font-bold">
                    Lỗi: Bàn đang hoạt động nhưng thiếu thông tin đơn hàng.
                  </p>
                )}
              </div>
            )}

            {selectedTable.status === TABLE_STATUS.CLEANING && (
              <div className="flex flex-col gap-4 text-center py-6">
                <RefreshCw
                  size={36}
                  className="text-blue-500 animate-spin mx-auto"
                />
                <h5 className="font-bold text-sm text-admin-text-main">
                  Bàn đang được dọn dẹp
                </h5>
                <p className="text-xs text-admin-text-sub">
                  Nhân viên đang vệ sinh và sát khuẩn khu vực bàn ăn.
                </p>
                <button
                  onClick={() => handleCompleteCleaning(selectedTable.id)}
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-black text-xs font-bold tracking-widest rounded-lg cursor-pointer mt-2 font-display"
                >
                  ĐÁNH DẤU SẠCH & SẴN SÀNG
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Grid size={40} className="mx-auto text-zinc-700 mb-3" />
            <h5 className="font-bold text-sm text-slate-700">Chưa chọn bàn</h5>
            <p className="text-xs mt-1">
              Chọn một bàn bất kỳ trên sơ đồ để xem thông tin hóa đơn hoặc thực
              hiện gọi món.
            </p>
          </div>
        )}
      </div>

      {/* Ordering Modal */}
      <Modal
        isOpen={isOrderingModalOpen}
        onClose={() => setIsOrderingModalOpen(false)}
        title={
          activeOrder
            ? `Sửa hóa đơn ${selectedTable?.name || ""}`
            : `Tạo đơn gọi món cho ${selectedTable?.name || ""}`
        }
        size="lg"
        theme="light"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Menu Catalog */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold text-admin-primary border-b border-slate-100 pb-2 font-display">
              Danh mục món ăn
            </h4>

            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar">
              {menu.map((item) => {
                const inStock = item.inStock ?? item.is_active ?? item.available ?? true;
                const imageSrc = item.image ?? item.image_url ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                return (
                <div
                  key={item.id}
                  onClick={() => inStock && handleAddToCart(item)}
                  className={`flex items-center gap-3 p-2 border rounded-xl cursor-pointer transition-all hover:bg-slate-100 bg-slate-50 border-slate-100 ${
                    inStock ? "" : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <img
                    src={imageSrc}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="flex-1 flex flex-col min-w-0">
                    <span className="text-xs font-bold text-admin-text-main truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-admin-text-sub font-semibold">
                      {(item.price * 1000).toLocaleString("vi-VN")} vnđ
                    </span>
                  </div>
                  {inStock ? (
                    <span className="text-[10px] text-admin-primary font-bold bg-admin-primary-light px-2 py-0.5 rounded border border-admin-primary/20">
                      Thêm +
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      Hết hàng
                    </span>
                  )}
                </div>
              )})}
            </div>
          </div>

          {/* Checkout Cart drawer */}
          <div className="p-4 rounded-xl border border-admin-border bg-slate-50 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-admin-text-main border-b border-admin-border pb-2 flex justify-between font-display">
                <span>Món đã chọn</span>
                <span className="text-admin-text-sub text-xs">
                  {cart.length} món
                </span>
              </h4>

              <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1 scrollbar">
                {cart.length === 0 ? (
                  <p className="text-xs text-admin-text-sub italic text-center py-8">
                    Giỏ hàng trống. Nhấp chọn món từ thực đơn bên trái để thêm.
                  </p>
                ) : (
                  cart.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-admin-border"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-admin-text-main">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-admin-text-sub">
                          {(item.price * 1000).toLocaleString("vi-VN")} vnđ/món
                        </span>
                      </div>
                      <span className="font-bold text-admin-primary">
                        x{item.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-3 border-t border-admin-border">
              <div className="flex justify-between text-sm font-bold text-admin-text-main">
                <span>Tổng tạm tính:</span>
                <span className="text-admin-primary font-extrabold">
                  {(
                    cart.reduce((sum, i) => sum + i.price * i.quantity, 0) *
                    1000
                  ).toLocaleString("vi-VN")}{" "}
                  vnđ
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOrderingModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold bg-white border border-admin-border hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors"
                >
                  Đóng
                </button>
                {activeOrder ? (
                  <button
                    onClick={handleAddMoreItems}
                    disabled={cart.length === 0}
                    className="flex-1 py-2 text-xs font-bold bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    THÊM VÀO HÓA ĐƠN
                  </button>
                ) : (
                  <button
                    onClick={handleCreateWaiterOrder}
                    disabled={cart.length === 0}
                    className="flex-1 py-2 text-xs font-bold bg-admin-primary text-white rounded-lg hover:bg-admin-primary-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    GỬI ĐƠN XUỐNG BẾP
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
