import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchKdsItems,
  fetchKdsVoidAlerts,
  updateKdsItemStatus,
  updateKdsBatchStatus,
  recallKdsItemStatus,
  setStationFilter,
  dismissVoidAlert,
  dismissNewAlert,
  dismissChangeAlert,
  updateItemStatusLocal,
  recallItemStatusLocal,
  KdsItem
} from "../../../store/kdsSlice";
import {
  Clock,
  Check,
  CheckCheck,
  Play,
  AlertCircle,
  ChefHat,
  Volume2,
  VolumeX,
  Undo2,
  Flame,
  Info,
  RefreshCcw,
  Layers,
  Inbox,
  Filter,
  X,
  FolderKanban
} from "lucide-react";

export const ChefKitchenQueue: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items, voidAlerts, newAlerts, changeAlerts, loading, stationFilter } = useAppSelector((state) => state.kds);
  const searchQuery = useAppSelector((state) => state.ui.searchQuery);

  // Lọc món ăn dựa trên ô tìm kiếm chung
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.tableName && item.tableName.toLowerCase().includes(lowerQuery)) ||
      (item.kitchenNote && item.kitchenNote.toLowerCase().includes(lowerQuery))
    );
  }, [items, searchQuery]);
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"kanban" | "batch">("kanban");
  const lastAlertsCount = useRef<number>(0);

  // Web Audio API Beep Synthesizer for alerts
  const playBuzzerSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playNote(880, now, 0.15); // Bip 1
      playNote(880, now + 0.25, 0.15); // Bip 2
      
      setTimeout(() => {
        audioCtx.close();
      }, 600);
    } catch (err) {
      console.error("Lỗi phát âm thanh cảnh báo:", err);
    }
  };

  // Fetch data immediately and setup polling every 3 seconds
  useEffect(() => {
    const loadData = () => {
      dispatch(fetchKdsItems(stationFilter === "all" ? undefined : stationFilter));
      dispatch(fetchKdsVoidAlerts());
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [dispatch, stationFilter]);

  // Audio trigger on new active alerts
  useEffect(() => {
    const activeVoid = voidAlerts.filter((a) => !a.dismissed).length;
    const activeNew = newAlerts.filter((a) => !a.dismissed).length;
    const activeChange = changeAlerts.filter((a) => !a.dismissed).length;
    const totalActive = activeVoid + activeNew + activeChange;
    if (totalActive > lastAlertsCount.current) {
      playBuzzerSound();
    }
    lastAlertsCount.current = totalActive;
  }, [voidAlerts, newAlerts, changeAlerts, soundEnabled]);

  // Redux action wrappers with local fallback for offline/development
  const handleUpdateStatus = (id: string | number, nextStatus: "pending" | "cooking" | "done" | "cancelled" | "voided") => {
    dispatch(updateKdsItemStatus({ id, status: nextStatus }))
      .unwrap()
      .catch(() => {
        // Fallback local state update if backend is offline/mock
        dispatch(updateItemStatusLocal({ id, status: nextStatus }));
      });
  };

  const handleRecallStatus = (id: string | number) => {
    dispatch(recallKdsItemStatus(id))
      .unwrap()
      .catch(() => {
        // Fallback local recall if backend is offline/mock
        dispatch(recallItemStatusLocal(id));
      });
  };

  const handleDeliver = (id: string | number) => {
    // Delivery / archive item
    dispatch(updateKdsItemStatus({ id, status: "delivered" }))
      .unwrap()
      .catch(() => {
        dispatch(updateItemStatusLocal({ id, status: "delivered" }));
      });
  };

  // Group kitchen items into 3 columns: Chờ nấu (pending), Đang nấu (cooking), Sẵn sàng (done)
  const columns = useMemo(() => {
    return {
      pending: filteredItems.filter((item) => item.status === "pending"),
      cooking: filteredItems.filter((item) => item.status === "cooking"),
      done: filteredItems.filter((item) => item.status === "done"),
    };
  }, [filteredItems]);

  // Group pending items for Batch Cooking
  const batchGroups = useMemo(() => {
    const groups: {
      [key: string]: {
        name: string;
        kitchenStation: string;
        totalQty: number;
        items: KdsItem[];
      };
    } = {};

    // Group only "pending" and "cooking" items for batch
    filteredItems.forEach((item) => {
      if (item.status !== "pending" && item.status !== "cooking") return;
      const key = `${item.name.trim()}_${item.kitchenStation}`;
      if (!groups[key]) {
        groups[key] = {
          name: item.name,
          kitchenStation: item.kitchenStation,
          totalQty: 0,
          items: [],
        };
      }
      groups[key].totalQty += item.quantity;
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredItems]);

  const handleBatchStartCooking = (groupItems: KdsItem[]) => {
    const ids = groupItems.filter((i) => i.status === "pending").map((i) => i.id);
    if (ids.length === 0) return;
    dispatch(updateKdsBatchStatus({ itemIds: ids, status: "cooking" }))
      .unwrap()
      .catch(() => {
        ids.forEach((id) => dispatch(updateItemStatusLocal({ id, status: "cooking" })));
      });
  };

  const handleBatchFinishCooking = (groupItems: KdsItem[]) => {
    const ids = groupItems.filter((i) => i.status === "cooking").map((i) => i.id);
    if (ids.length === 0) return;
    dispatch(updateKdsBatchStatus({ itemIds: ids, status: "done" }))
      .unwrap()
      .catch(() => {
        ids.forEach((id) => dispatch(updateItemStatusLocal({ id, status: "done" })));
      });
  };

  // Helper to format elapsed time and check delay (> 10 mins)
  const getTimerInfo = (createdAtStr: string) => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${elapsedMins}:${elapsedSecs < 10 ? "0" : ""}${elapsedSecs}`;
    const isDelayed = elapsedMins >= 10;
    return { timeStr, isDelayed, elapsedMins };
  };

  // State force update to refresh timers every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Station Label mapper
  const getStationLabel = (station: string) => {
    switch (station) {
      case "hot_kitchen":
        return "Bếp Nóng";
      case "cold_kitchen":
        return "Bếp Nguội";
      case "bar":
        return "Quầy Nước";
      default:
        return station;
    }
  };

  return (
    <div className="bg-[#0b1329] text-slate-100 p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-6 select-none min-h-[700px] transition-all">
      
      {/* 1. KDS Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat size={28} className="text-[#0f62fe]" />
            <h3 className="text-2xl font-black tracking-tight text-white font-display">
              Hệ Thống Hiển Thị Bếp (KDS)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý chi tiết trạng thái món ăn theo thời gian thực
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              soundEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
            }`}
            title={soundEnabled ? "Tắt âm thanh thông báo" : "Bật âm thanh thông báo"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? "Âm thanh: Bật" : "Âm thanh: Tắt"}</span>
          </button>

          {/* Mode Tabs */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                activeTab === "kanban"
                  ? "bg-[#0f62fe] text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FolderKanban size={13} />
              Kanban Món Ăn
            </button>
            <button
              onClick={() => setActiveTab("batch")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                activeTab === "batch"
                  ? "bg-[#0f62fe] text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers size={13} />
              Nấu Theo Mẻ ({batchGroups.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Void Alerts Banner */}
      {voidAlerts.filter((a) => !a.dismissed).length > 0 && (
        <div className="flex flex-col gap-2">
          {voidAlerts
            .filter((a) => !a.dismissed)
            .map((alert) => (
              <div
                key={alert.id}
                className="bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-rose-500 text-white p-1.5 rounded-lg">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">
                      CẢNH BÁO HỦY MÓN: {alert.name} (x{alert.quantity})
                    </div>
                    <div className="text-[11px] text-rose-300 mt-0.5">
                      Bàn: <strong className="text-white">{alert.tableName}</strong> | Lý do: {alert.voidReason || "Yêu cầu từ nhân viên phục vụ"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(dismissVoidAlert(alert.id))}
                  className="bg-rose-900/40 hover:bg-rose-950/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X size={12} />
                  Đã xem & Xác nhận
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 2.1 New Item Alerts Banner */}
      {newAlerts.filter((a) => !a.dismissed).length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {newAlerts
            .filter((a) => !a.dismissed)
            .map((alert) => (
              <div
                key={alert.id}
                className="bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
                    <Info size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">
                      MÓN MỚI: {alert.name} (x{alert.quantity})
                    </div>
                    <div className="text-[11px] text-emerald-300 mt-0.5">
                      Bàn: <strong className="text-white">{alert.tableName}</strong> | Trạm: {getStationLabel(alert.kitchenStation)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(dismissNewAlert(alert.id))}
                  className="bg-emerald-900/40 hover:bg-emerald-950/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X size={12} />
                  Đã xem
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 2.2 Changed Item Alerts Banner */}
      {changeAlerts.filter((a) => !a.dismissed).length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          {changeAlerts
            .filter((a) => !a.dismissed)
            .map((alert) => (
              <div
                key={alert.id}
                className="bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500 text-white p-1.5 rounded-lg">
                    <RefreshCcw size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">
                      ĐỔI {alert.changeType === "quantity" ? "SỐ LƯỢNG" : "GHI CHÚ"}: {alert.name}
                    </div>
                    <div className="text-[11px] text-amber-300 mt-0.5">
                      Bàn: <strong className="text-white">{alert.tableName}</strong> | Thay đổi: {alert.oldValue} ➔ <strong className="text-amber-500 bg-amber-500/20 px-1 rounded">{alert.newValue}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(dismissChangeAlert(alert.id))}
                  className="bg-amber-900/40 hover:bg-amber-950/60 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X size={12} />
                  Đã xác nhận
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 3. KDS Station Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Filter size={13} className="text-[#0f62fe]" />
          Bộ lọc trạm bếp:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "hot_kitchen", "cold_kitchen", "bar"] as const).map((station) => (
            <button
              key={station}
              onClick={() => dispatch(setStationFilter(station))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                stationFilter === station
                  ? "bg-[#0f62fe] text-white border border-[#0f62fe]"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50"
              }`}
            >
              {station === "all" ? "Tất Cả Trạm" : getStationLabel(station)}
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <ChefHat size={48} className="text-slate-600 animate-bounce" />
          <span className="text-sm text-slate-500 italic animate-pulse">Đang tải danh sách món ăn từ bếp...</span>
        </div>
      ) : activeTab === "kanban" ? (
        
        /* 4. Kanban View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cột 1: Chờ nấu */}
          <div className="flex flex-col gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                Chờ nấu (Pending)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700">
                {columns.pending.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px] max-h-[620px] overflow-y-auto pr-1 scrollbar">
              {columns.pending.length === 0 ? (
                <div className="text-center py-24 text-slate-600 text-xs italic flex flex-col items-center gap-2">
                  <Inbox size={20} />
                  Chưa có món ăn nào chờ nấu
                </div>
              ) : (
                columns.pending.map((item) => {
                  const { timeStr, isDelayed } = getTimerInfo(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className={`bg-[#1e293b] border-l-4 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all hover:-translate-y-0.5 ${
                        isDelayed
                          ? "border-l-rose-500 border-2 border-rose-500/20 shadow-rose-950/20 animate-pulse"
                          : "border-l-slate-400 border border-slate-700/60"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-black text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                            Bàn: {item.tableName || "Mang về"}
                          </span>
                          <span
                            className={`text-[10px] font-bold flex items-center gap-1 ${
                              isDelayed ? "text-rose-400" : "text-slate-400"
                            }`}
                          >
                            <Clock size={10} /> {timeStr}
                          </span>
                        </div>

                        {/* Dish Details */}
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center text-sm font-extrabold text-white">
                            <span className="truncate max-w-[80%]">{item.name}</span>
                            <span className="text-[#0f62fe] text-md bg-[#0f62fe]/10 px-2 py-0.5 rounded border border-[#0f62fe]/20">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1.5">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider text-[#0f62fe]/80 border border-slate-700">
                              {getStationLabel(item.kitchenStation)}
                            </span>
                            {item.orderType && (
                              <span className="text-slate-500">
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Ship" : "Takeaway"})
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {item.kitchenNote && (
                            <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1.5 rounded-lg font-medium">
                              📝 {item.kitchenNote}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(item.id, "cooking")}
                        className="w-full py-2 bg-[#0f62fe] hover:bg-blue-600 active:scale-95 text-white rounded-lg text-xs font-extrabold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all"
                      >
                        <Play size={12} /> Bắt đầu nấu
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột 2: Đang nấu */}
          <div className="flex flex-col gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <Flame size={13} className="text-amber-500 animate-bounce" />
                Đang nấu (Cooking)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                {columns.cooking.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px] max-h-[620px] overflow-y-auto pr-1 scrollbar">
              {columns.cooking.length === 0 ? (
                <div className="text-center py-24 text-slate-600 text-xs italic flex flex-col items-center gap-2">
                  <Inbox size={20} />
                  Không có món nào đang nấu
                </div>
              ) : (
                columns.cooking.map((item) => {
                  const { timeStr, isDelayed } = getTimerInfo(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className={`bg-[#1e293b] border-l-4 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all hover:-translate-y-0.5 ${
                        isDelayed
                          ? "border-l-rose-500 border-2 border-rose-500/20 shadow-rose-950/20 animate-pulse"
                          : "border-l-amber-500 border border-amber-500/30"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                              Bàn: {item.tableName || "Mang về"}
                            </span>
                            <button
                              onClick={() => handleRecallStatus(item.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-all cursor-pointer"
                              title="Hoàn tác về Chờ nấu"
                            >
                              <Undo2 size={11} />
                            </button>
                          </div>
                          <span
                            className={`text-[10px] font-bold flex items-center gap-1 ${
                              isDelayed ? "text-rose-400" : "text-amber-500"
                            }`}
                          >
                            <Clock size={10} className="animate-spin" style={{ animationDuration: "3s" }} /> {timeStr}
                          </span>
                        </div>

                        {/* Dish Details */}
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center text-sm font-extrabold text-white">
                            <span className="truncate max-w-[80%]">{item.name}</span>
                            <span className="text-amber-400 text-md bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1.5">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider text-amber-500/80 border border-slate-700">
                              {getStationLabel(item.kitchenStation)}
                            </span>
                            {item.orderType && (
                              <span className="text-slate-500">
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Ship" : "Takeaway"})
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {item.kitchenNote && (
                            <div className="mt-2 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1.5 rounded-lg font-medium">
                              📝 {item.kitchenNote}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(item.id, "done")}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-xs font-extrabold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all"
                      >
                        <Check size={12} /> Hoàn thành
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột 3: Sẵn sàng */}
          <div className="flex flex-col gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <span className="text-xs font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                <CheckCheck size={14} className="text-emerald-500" />
                Sẵn sàng (Done)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                {columns.done.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px] max-h-[620px] overflow-y-auto pr-1 scrollbar">
              {columns.done.length === 0 ? (
                <div className="text-center py-24 text-slate-600 text-xs italic flex flex-col items-center gap-2">
                  <Inbox size={20} />
                  Chưa có món nào đã sẵn sàng
                </div>
              ) : (
                columns.done.map((item) => {
                  const { timeStr } = getTimerInfo(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className="bg-[#1e293b] border-l-4 border-l-emerald-500 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md shadow-emerald-950/5 hover:-translate-y-0.5 transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700">
                              Bàn: {item.tableName || "Mang về"}
                            </span>
                            <button
                              onClick={() => handleRecallStatus(item.id)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-all cursor-pointer"
                              title="Hoàn tác về Đang nấu"
                            >
                              <Undo2 size={11} />
                            </button>
                          </div>
                          <span className="text-[10px] font-bold flex items-center gap-1 text-emerald-400">
                            <Clock size={10} /> {timeStr}
                          </span>
                        </div>

                        {/* Dish Details */}
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center text-sm font-extrabold text-slate-300">
                            <span className="line-through truncate max-w-[85%]">{item.name}</span>
                            <span className="text-emerald-400 text-md bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-semibold flex items-center gap-1.5">
                            <span className="bg-slate-850 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider text-slate-400 border border-slate-750">
                              {getStationLabel(item.kitchenStation)}
                            </span>
                            {item.orderType && (
                              <span>
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Ship" : "Takeaway"})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeliver(item.id)}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg text-xs font-extrabold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all"
                      >
                        <CheckCheck size={12} /> Đã phục vụ
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        
        /* 5. Batch Cooking View */
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Danh sách món gộp theo mẻ nấu
            </span>
          </div>

          {batchGroups.length === 0 ? (
            <div className="text-center py-24 text-slate-600 text-xs italic bg-slate-900/20 border border-slate-800/80 rounded-xl flex flex-col items-center gap-2">
              <Inbox size={24} />
              Không có món ăn nào đang hoạt động để gộp mẻ
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {batchGroups.map((group, idx) => {
                const pendingItems = group.items.filter((i) => i.status === "pending");
                const cookingItems = group.items.filter((i) => i.status === "cooking");
                const totalPendingQty = pendingItems.reduce((acc, item) => acc + item.quantity, 0);
                const totalCookingQty = cookingItems.reduce((acc, item) => acc + item.quantity, 0);

                return (
                  <div
                    key={idx}
                    className="bg-[#1e293b] border border-slate-700/60 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <div>
                      {/* Station and name */}
                      <div className="flex justify-between items-center">
                        <span className="bg-[#0f62fe]/10 border border-[#0f62fe]/20 text-[#0f62fe] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {getStationLabel(group.kitchenStation)}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          Tổng cộng: <strong className="text-white text-sm">{group.totalQty} phần</strong>
                        </span>
                      </div>

                      <h4 className="text-md font-bold text-white mt-3 truncate">{group.name}</h4>

                      {/* Detail list per table */}
                      <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-800 pt-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Chi tiết bàn:</span>
                        {group.items.map((item, idy) => (
                          <div key={idy} className="flex justify-between items-center text-xs text-slate-300">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.status === "pending" ? "bg-slate-400" : "bg-amber-500"
                                }`}
                              />
                              Bàn {item.tableName || "Mang về"}:
                            </span>
                            <span className="font-bold flex gap-2">
                              <span>x{item.quantity}</span>
                              <span
                                className={`text-[10px] px-1 rounded font-bold ${
                                  item.status === "pending"
                                    ? "bg-slate-800 text-slate-400"
                                    : "bg-amber-500/10 text-amber-500"
                                }`}
                              >
                                {item.status === "pending" ? "Chờ" : "Nấu"}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Batch Action Buttons */}
                    <div className="flex gap-2.5 mt-3 border-t border-slate-850 pt-4">
                      {totalPendingQty > 0 && (
                        <button
                          onClick={() => handleBatchStartCooking(group.items)}
                          className="flex-1 py-2 bg-[#0f62fe] hover:bg-blue-600 active:scale-95 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Play size={11} />
                          Nấu mẻ chờ (x{totalPendingQty})
                        </button>
                      )}
                      {totalCookingQty > 0 && (
                        <button
                          onClick={() => handleBatchFinishCooking(group.items)}
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Check size={11} />
                          Xong mẻ nấu (x{totalCookingQty})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
