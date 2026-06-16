import React, { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { updateOrderStatus } from "../../../store/orderSlice";
import { Clock, Check, Play, AlertCircle, ChefHat } from "lucide-react";

export const ChefKitchenQueue: React.FC = () => {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((state) => state.orders.orders);

  // Group kitchen orders into 3 columns: Chờ nấu (CONFIRMED), Đang nấu (IN_KITCHEN), Sẵn sàng (SERVED)
  const columns = useMemo(() => {
    return {
      waiting: orders.filter((o) => o.status === ORDER_STATUS.CONFIRMED),
      cooking: orders.filter((o) => o.status === ORDER_STATUS.IN_KITCHEN),
      ready: orders.filter((o) => o.status === ORDER_STATUS.SERVED),
    };
  }, [orders]);

  const handleStartCooking = (orderId: string) => {
    dispatch(
      updateOrderStatus({ id: orderId, status: ORDER_STATUS.IN_KITCHEN }),
    );
  };

  const handleFinishCooking = (orderId: string) => {
    dispatch(updateOrderStatus({ id: orderId, status: ORDER_STATUS.SERVED }));
  };

  const handleDeliver = (orderId: string) => {
    // If it's delivery, it goes to delivery status, otherwise we can set it to PAID or keep it in served until cashier checks out
    dispatch(updateOrderStatus({ id: orderId, status: ORDER_STATUS.PAID }));
  };

  // Helper to get formatted elapsed time and check if it's delayed (e.g. > 10 mins)
  const getTimerInfo = (createdAtStr: string) => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${elapsedMins}:${elapsedSecs < 10 ? "0" : ""}${elapsedSecs}`;
    const isDelayed = elapsedMins >= 10;
    return { timeStr, isDelayed };
  };

  // Component force update pattern to refresh timers every second
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0b1329] text-slate-100 p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-6 select-none">
      {/* KDS Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white">
            Màn hình Bếp (KDS)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Hệ thống hiển thị đơn hàng cho nhà bếp
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-amber-500">
            <AlertCircle size={14} /> Trễ hạn ({">"}10 phút)
          </span>
          <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
            <ChefHat size={14} className="text-blue-400 animate-pulse" /> Đang
            xử lý: {columns.waiting.length + columns.cooking.length}
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Chờ nấu */}
        <div className="flex flex-col gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Chờ nấu
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
              {columns.waiting.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 min-h-[500px] max-h-[600px] overflow-y-auto pr-1 scrollbar">
            {columns.waiting.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-xs italic">
                Chưa có đơn chờ nấu
              </div>
            ) : (
              columns.waiting.map((order) => {
                const { timeStr, isDelayed } = getTimerInfo(order.createdAt);
                return (
                  <div
                    key={order.id}
                    className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">
                          {order.tableName}
                        </span>
                        <span
                          className={`text-[10px] font-bold flex items-center gap-1 ${isDelayed ? "text-rose-500 animate-pulse" : "text-emerald-500"}`}
                        >
                          <Clock size={10} /> {timeStr}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-2 mt-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-bold text-slate-200">
                              <span>{item.name}</span>
                              <span className="text-blue-400">
                                x{item.quantity}
                              </span>
                            </div>

                            {/* Options/Modifiers Mock */}
                            {item.name.toLowerCase().includes("bò") && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Chín vừa
                                </span>
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Ít ớt chuông
                                </span>
                              </div>
                            )}
                            {item.name.toLowerCase().includes("gỏi") && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Nhiều thính
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartCooking(order.id)}
                      className="w-full py-2 bg-[#0f62fe] hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                    >
                      <Play size={11} /> Bắt đầu nấu
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Đang nấu */}
        <div className="flex flex-col gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Đang nấu
            </span>
            <span className="px-2 py-0.5 rounded-full bg-orange-500 text-[10px] font-semibold text-white">
              {columns.cooking.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 min-h-[500px] max-h-[600px] overflow-y-auto pr-1 scrollbar">
            {columns.cooking.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-xs italic">
                Chưa có món nào đang nấu
              </div>
            ) : (
              columns.cooking.map((order) => {
                const { timeStr, isDelayed } = getTimerInfo(order.createdAt);
                return (
                  <div
                    key={order.id}
                    className="bg-[#1e293b] border border-orange-500/30 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">
                          {order.tableName}
                        </span>
                        <span
                          className={`text-[10px] font-bold flex items-center gap-1 ${isDelayed ? "text-rose-500 animate-pulse" : "text-emerald-500"}`}
                        >
                          <Clock size={10} /> {timeStr}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-2 mt-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-bold text-slate-200">
                              <span className="flex items-center gap-1.5">
                                {idx === 0 ? (
                                  <Check
                                    size={11}
                                    className="text-emerald-500"
                                  />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                )}
                                <span
                                  className={
                                    idx === 0
                                      ? "line-through text-slate-400"
                                      : ""
                                  }
                                >
                                  {item.name}
                                </span>
                              </span>
                              <span className="text-blue-400">
                                x{item.quantity}
                              </span>
                            </div>

                            {item.name.toLowerCase().includes("cá hồi") && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Nhiều sốt chanh leo
                                </span>
                              </div>
                            )}
                            {item.name.toLowerCase().includes("bò") && (
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Chín kỹ
                                </span>
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  Thêm hành tây
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleFinishCooking(order.id)}
                      className="w-full py-2 bg-[#0f62fe] hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                    >
                      <Check size={11} /> Nấu xong
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Sẵn sàng */}
        <div className="flex flex-col gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Sẵn sàng
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
              {columns.ready.length}
            </span>
          </div>

          <div className="flex flex-col gap-3 min-h-[500px] max-h-[600px] overflow-y-auto pr-1 scrollbar">
            {columns.ready.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-xs italic">
                Chưa có món nào sẵn sàng
              </div>
            ) : (
              columns.ready.map((order) => {
                const { timeStr, isDelayed } = getTimerInfo(order.createdAt);
                return (
                  <div
                    key={order.id}
                    className="bg-[#1e293b] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">
                          {order.tableName}
                        </span>
                        <span
                          className={`text-[10px] font-bold flex items-center gap-1 ${isDelayed ? "text-rose-500 animate-pulse" : "text-emerald-500"}`}
                        >
                          <Clock size={10} /> {timeStr}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="flex flex-col gap-2 mt-1">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-xs font-bold text-slate-400"
                          >
                            <span className="flex items-center gap-1.5">
                              <Check size={11} className="text-emerald-500" />
                              <span className="line-through">{item.name}</span>
                            </span>
                            <span className="text-blue-400">
                              x{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeliver(order.id)}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-colors"
                    >
                      <Check size={11} /> Đã giao
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
