import React, { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
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

  const remindedItemIds = useRef<Set<string | number>>(new Set());

  // Web Audio API Bip báo động tần số cao cho món trễ quá 2h
  const playAlarmSound = () => {
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
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playNote(988, now, 0.15); // Bip 1
      playNote(988, now + 0.2, 0.15); // Bip 2
      playNote(988, now + 0.4, 0.25); // Bip 3
      
      setTimeout(() => {
        audioCtx.close();
      }, 800);
    } catch (err) {
      console.error("Lỗi phát âm thanh báo động:", err);
    }
  };

  // Cảnh báo Bếp trưởng nếu có món đã đợi hơn 2 giờ (120 phút)
  useEffect(() => {
    const now = Date.now();
    let hasNewDelay = false;
    
    items.forEach((item) => {
      if (item.status !== "pending" && item.status !== "cooking") return;
      
      const elapsedMs = now - new Date(item.createdAt).getTime();
      const elapsedMins = Math.floor(elapsedMs / 60000);
      
      if (elapsedMins >= 120) { // 2 giờ
        if (!remindedItemIds.current.has(item.id)) {
          remindedItemIds.current.add(item.id);
          hasNewDelay = true;
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-bounce" : "opacity-0"
                } max-w-sm w-full bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl pointer-events-auto flex border border-red-200/80 p-4 transition-all duration-300 transform scale-100 hover:scale-[1.02]`}
              >
                <div className="flex-1 w-0 flex items-start gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="bg-red-500 text-white p-2 rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                      <AlertCircle size={18} className="stroke-[2.5]" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
                      Cảnh báo trễ món
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
                      Món <strong className="text-red-600 font-black">"{item.name}"</strong> của Bàn <strong className="text-slate-800 font-extrabold">{item.tableName || "Mang về"}</strong> đã chờ hơn 2 giờ!
                    </p>
                  </div>
                </div>
                <div className="flex border-l border-slate-100 pl-3 ml-3 items-center">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-1.5 flex items-center justify-center text-xs font-black text-red-500 hover:text-red-700 transition-colors focus:outline-none"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ),
            { id: `delay_alert_${item.id}`, duration: 30000 }
          );
        }
      }
    });

    if (hasNewDelay) {
      playAlarmSound();
    }
  }, [items]);

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

  // Helper to format elapsed time and check delay (> 2 hours)
  const getTimerInfo = (createdAtStr: string) => {
    const elapsedMs = Date.now() - new Date(createdAtStr).getTime();
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
    const timeStr = `${elapsedMins}:${elapsedSecs < 10 ? "0" : ""}${elapsedSecs}`;
    const isDelayed = elapsedMins >= 120; // 2 giờ = 120 phút
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
    <div className="bg-slate-50 text-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-6 select-none min-h-[700px] transition-all">
      
      {/* 1. KDS Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat size={28} className="text-[#0f62fe]" />
            <h3 className="text-2xl font-black tracking-tight text-slate-800 font-display">
              Hệ Thống Hiển Thị Bếp (KDS)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Quản lý chi tiết trạng thái món ăn theo thời gian thực
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              soundEnabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 border-slate-350 text-slate-500 hover:bg-slate-200"
            }`}
            title={soundEnabled ? "Tắt âm thanh thông báo" : "Bật âm thanh thông báo"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? "Âm thanh: Bật" : "Âm thanh: Tắt"}</span>
          </button>

          {/* Mode Tabs */}
          <div className="bg-slate-200/80 border border-slate-300 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                activeTab === "kanban"
                  ? "bg-[#0f62fe] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-850"
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
                  : "text-slate-600 hover:text-slate-850"
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
                className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-rose-500 text-white p-1.5 rounded-lg">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-rose-800">
                      CẢNH BÁO HỦY MÓN: {alert.name} (x{alert.quantity})
                    </div>
                    <div className="text-[11px] text-rose-600 mt-0.5">
                      Bàn: <strong className="text-rose-900">{alert.tableName}</strong> | Lý do: {alert.voidReason || "Yêu cầu từ nhân viên phục vụ"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(dismissVoidAlert(alert.id))}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-800 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
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
                className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
                    <Info size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-emerald-800">
                      MÓN MỚI: {alert.name} (x{alert.quantity})
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">
                      Bàn: <strong className="text-emerald-900">{alert.tableName}</strong> | Trạm: {getStationLabel(alert.kitchenStation)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(dismissNewAlert(alert.id))}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-850 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
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
                className="bg-amber-50 border border-amber-200 text-amber-700 p-3.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500 text-white p-1.5 rounded-lg">
                    <RefreshCcw size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-amber-800">
                      ĐỔI {alert.changeType === "quantity" ? "SỐ LƯỢNG" : "GHI CHÚ"}: {alert.name}
                    </div>
                    <div className="text-[11px] text-amber-600 mt-0.5">
                      Bàn: <strong className="text-amber-900">{alert.tableName}</strong> | Thay đổi: {alert.oldValue} ➔ <strong className="text-amber-750 bg-amber-100 px-1.5 py-0.5 rounded font-black">{alert.newValue}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => dispatch(dismissChangeAlert(alert.id))}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-850 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X size={12} />
                  Đã xác nhận
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 3. KDS Station Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
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
                  : "bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-250"
              }`}
            >
              {station === "all" ? "Tất Cả Trạm" : getStationLabel(station)}
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <ChefHat size={48} className="text-slate-500 animate-bounce" />
          <span className="text-sm text-slate-500 italic animate-pulse">Đang tải danh sách món ăn từ bếp...</span>
        </div>
      ) : activeTab === "kanban" ? (
        
        /* 4. Kanban View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột 1: Chờ nấu */}
          <div className="flex flex-col gap-4 bg-[#f8fafc] p-4.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-xs font-black uppercase text-blue-700 tracking-wider flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                Chờ nấu (Pending)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-700 border border-blue-200/60 shadow-sm">
                {columns.pending.length}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 min-h-[500px] max-h-[620px] overflow-y-auto pr-1 scrollbar">
              {columns.pending.length === 0 ? (
                <div className="text-center py-24 text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
                  <Inbox size={22} className="text-slate-350" />
                  Chưa có món ăn nào chờ nấu
                </div>
              ) : (
                columns.pending.map((item) => {
                  const { timeStr, isDelayed } = getTimerInfo(item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className={`bg-white border-l-[5px] rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-250 ${
                        isDelayed
                          ? "border-rose-300 border-l-rose-500 bg-rose-50/20 shadow-lg shadow-rose-100/30 animate-[pulse_3s_infinite]"
                          : "border-slate-200/80 border-l-blue-500 hover:border-blue-300"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[11px] font-extrabold text-slate-700 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg shadow-inner">
                            Bàn: {item.tableName || "Mang về"}{item.areaName ? ` - ${item.areaName}` : ""}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                              isDelayed ? "text-rose-600 bg-rose-50" : "text-slate-500 bg-slate-50 border border-slate-100"
                            }`}
                          >
                            <Clock size={10} /> {timeStr}
                          </span>
                        </div>
                        {(item.orderType === "pre_order" || (item.kitchenNote && item.kitchenNote.includes("Món đặt trước"))) && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] uppercase shadow-sm">
                            🍳 Món đặt trước (Nấu sẵn)
                          </div>
                        )}

                        {/* Dish Details */}
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[13px] font-extrabold text-slate-800">
                            <span className="truncate max-w-[80%] leading-snug">{item.name}</span>
                            <span className="text-blue-600 text-xs font-black bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-200/60 shadow-sm">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="text-[9px] mt-2 flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-blue-600 border border-slate-200/50">
                              {getStationLabel(item.kitchenStation)}
                            </span>
                            {item.orderType && (
                              <span className="text-slate-400 font-semibold">
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Ship" : item.orderType === "pre_order" ? "Đặt trước" : "Takeaway"})
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {(item.kitchenNote || (item as any).kitchen_note) && (
                            <div className="mt-2.5 text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm animate-pulse">
                              📝 {item.kitchenNote || (item as any).kitchen_note}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(item.id, "cooking")}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-750 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
                      >
                        <Play size={11} className="fill-white" /> Bắt đầu nấu
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột 2: Đang nấu */}
          <div className="flex flex-col gap-4 bg-[#f8fafc] p-4.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider flex items-center gap-2">
                <Flame size={14} className="text-amber-500 animate-pulse" />
                Đang nấu (Cooking)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[10px] font-extrabold text-amber-700 border border-amber-200/60 shadow-sm">
                {columns.cooking.length}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 min-h-[500px] max-h-[620px] overflow-y-auto pr-1 scrollbar">
              {columns.cooking.length === 0 ? (
                <div className="text-center py-24 text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
                  <Inbox size={22} className="text-slate-350" />
                  Không có món nào đang nấu
                </div>
              ) : (
                columns.cooking.map((item) => {
                  const { timeStr, isDelayed } = getTimerInfo(item.updatedAt || item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className={`bg-white border-l-[5px] rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-250 ${
                        isDelayed
                          ? "border-rose-300 border-l-rose-500 bg-rose-50/20 shadow-lg shadow-rose-100/30 animate-[pulse_3s_infinite]"
                          : "border-slate-200/80 border-l-amber-500 hover:border-amber-300"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-slate-700 px-2.5 py-1 bg-slate-55/40 bg-slate-50 border border-slate-200/80 rounded-lg shadow-inner">
                              Bàn: {item.tableName || "Mang về"}{item.areaName ? ` - ${item.areaName}` : ""}
                            </span>
                            <button
                              onClick={() => handleRecallStatus(item.id)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 border border-slate-100 hover:border-slate-200/80 transition-all cursor-pointer shadow-sm hover:shadow"
                              title="Hoàn tác về Chờ nấu"
                            >
                              <Undo2 size={11} />
                            </button>
                          </div>
                          <span
                            className={`text-[10px] font-extrabold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                              isDelayed ? "text-rose-600 bg-rose-50" : "text-amber-600 bg-amber-50/55 border border-amber-100/50"
                            }`}
                          >
                            <Clock size={10} className="animate-[spin_4s_linear_infinite]" /> {timeStr}
                          </span>
                        </div>
                        {(item.orderType === "pre_order" || (item.kitchenNote && item.kitchenNote.includes("Món đặt trước"))) && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] uppercase shadow-sm">
                            🍳 Món đặt trước (Nấu sẵn)
                          </div>
                        )}

                        {/* Dish Details */}
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[13px] font-extrabold text-slate-800">
                            <span className="truncate max-w-[80%] leading-snug">{item.name}</span>
                            <span className="text-amber-600 text-xs font-black bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60 shadow-sm">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="text-[9px] mt-2 flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-amber-600 border border-slate-200/50">
                              {getStationLabel(item.kitchenStation)}
                            </span>
                            {item.orderType && (
                              <span className="text-slate-400 font-semibold">
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Ship" : item.orderType === "pre_order" ? "Đặt trước" : "Takeaway"})
                              </span>
                            )}
                          </div>

                          {/* Notes */}
                          {(item.kitchenNote || (item as any).kitchen_note) && (
                            <div className="mt-2.5 text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200/60 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm animate-pulse">
                              📝 {item.kitchenNote || (item as any).kitchen_note}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateStatus(item.id, "done")}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95"
                      >
                        <Check size={11} /> Hoàn thành
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột 3: Sẵn sàng */}
          <div className="flex flex-col gap-4 bg-[#f8fafc] p-4.5 rounded-2xl border border-slate-200/80 shadow-md">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-xs font-black uppercase text-emerald-700 tracking-wider flex items-center gap-2">
                <CheckCheck size={14} className="text-emerald-500" />
                Sẵn sàng (Done)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[10px] font-extrabold text-emerald-700 border border-emerald-200/60 shadow-sm">
                {columns.done.length}
              </span>
            </div>

            <div className="flex flex-col gap-3.5 min-h-[500px] max-h-[620px] overflow-y-auto pr-1 scrollbar">
              {columns.done.length === 0 ? (
                <div className="text-center py-24 text-slate-400 text-xs font-medium flex flex-col items-center gap-2">
                  <Inbox size={22} className="text-slate-350" />
                  Chưa có món nào đã sẵn sàng
                </div>
              ) : (
                columns.done.map((item) => {
                  const { timeStr } = getTimerInfo(item.updatedAt || item.createdAt);
                  return (
                    <div
                      key={item.id}
                      className="bg-white border-l-[5px] border-l-emerald-500 border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-250"
                    >
                      <div>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-slate-700 px-2.5 py-1 bg-slate-55/40 bg-slate-50 border border-slate-200/80 rounded-lg shadow-inner">
                              Bàn: {item.tableName || "Mang về"}{item.areaName ? ` - ${item.areaName}` : ""}
                            </span>
                            <button
                              onClick={() => handleRecallStatus(item.id)}
                              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 border border-slate-100 hover:border-slate-200/80 transition-all cursor-pointer shadow-sm hover:shadow"
                              title="Hoàn tác về Đang nấu"
                            >
                              <Undo2 size={11} />
                            </button>
                          </div>
                          <span className="text-[10px] font-extrabold flex items-center gap-1 px-2 py-0.5 rounded-md text-emerald-600 bg-emerald-55/40 bg-emerald-50 border border-emerald-100">
                            <Clock size={10} /> {timeStr}
                          </span>
                        </div>
                        {(item.orderType === "pre_order" || (item.kitchenNote && item.kitchenNote.includes("Món đặt trước"))) && (
                          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] uppercase shadow-sm">
                            🍳 Món đặt trước (Nấu sẵn)
                          </div>
                        )}

                        {/* Dish Details */}
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-[13px] font-extrabold text-slate-650">
                            <span className="line-through text-slate-400 truncate max-w-[80%] leading-snug">{item.name}</span>
                            <span className="text-emerald-600 text-xs font-black bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200/60 shadow-sm">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="text-[9px] mt-2 flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-slate-500 border border-slate-200/50">
                              {getStationLabel(item.kitchenStation)}
                            </span>
                            {item.orderType && (
                              <span className="text-slate-400 font-semibold">
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Ship" : item.orderType === "pre_order" ? "Đặt trước" : "Takeaway"})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeliver(item.id)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 cursor-pointer uppercase transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                      >
                        <CheckCheck size={11} /> Đã phục vụ
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
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Danh sách món gộp theo mẻ nấu
            </span>
          </div>

          {batchGroups.length === 0 ? (
            <div className="text-center py-24 text-slate-500 text-xs italic bg-slate-100/30 border border-slate-200 rounded-xl flex flex-col items-center gap-2">
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
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 shadow hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div>
                      {/* Station and name */}
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-50 border border-blue-200 text-[#0f62fe] text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {getStationLabel(group.kitchenStation)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          Tổng cộng: <strong className="text-slate-800 text-sm">{group.totalQty} phần</strong>
                        </span>
                      </div>

                      <h4 className="text-md font-black text-slate-800 mt-3 truncate">{group.name}</h4>

                      {/* Detail list per table */}
                      <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Chi tiết bàn:</span>
                        {group.items.map((item, idy) => {
                          const noteText = item.kitchenNote || (item as any).kitchen_note;
                          return (
                            <div key={idy} className="flex flex-col gap-1 border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                              <div className="flex justify-between items-center text-xs text-slate-600">
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      item.status === "pending" ? "bg-slate-350" : "bg-amber-500"
                                    }`}
                                  />
                                  Bàn {item.tableName || "Mang về"}{item.areaName ? ` - ${item.areaName}` : ""}:
                                </span>
                                <span className="font-bold flex gap-2">
                                  <span>x{item.quantity}</span>
                                  <span
                                    className={`text-[10px] px-1 rounded font-bold ${
                                      item.status === "pending"
                                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                                        : "bg-amber-50 text-amber-600 border border-amber-200"
                                    }`}
                                  >
                                    {item.status === "pending" ? "Chờ" : "Nấu"}
                                  </span>
                                </span>
                              </div>
                              {noteText && (
                                <div className="text-[10px] text-red-600 font-black ml-3 flex items-center gap-1 animate-pulse">
                                  <span>📝 Ghi chú: {noteText}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Batch Action Buttons */}
                    <div className="flex gap-2.5 mt-3 border-t border-slate-100 pt-4">
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
