import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getKdsItemsApi,
  updateKdsItemStatusApi,
  updateKdsBatchStatusApi,
  recallKdsItemStatusApi,
  getKdsVoidAlertsApi,
} from "../services/api";

export interface KdsItem {
  id: string | number;
  orderId: string | number;
  menuItemId: string | number;
  name: string;
  kitchenStation: "hot_kitchen" | "bar" | "cold_kitchen";
  quantity: number;
  unitPrice: number;
  seatNumber?: number | null;
  courseNumber?: number | null;
  kitchenNote?: string | null;
  status: "pending" | "cooking" | "done" | "delivered" | "cancelled" | "voided";
  createdAt: string;
  tableName?: string;
  orderType?: "dine_in" | "delivery" | "takeaway";
}

export interface KdsVoidAlert {
  id: string | number;
  orderId: string | number;
  name: string;
  quantity: number;
  voidReason?: string | null;
  tableName: string;
  voidedAt: string;
  dismissed?: boolean;
}

export interface KdsNewAlert {
  id: string | number;
  orderId: string | number;
  name: string;
  quantity: number;
  tableName: string;
  kitchenStation: string;
  createdAt: string;
  dismissed?: boolean;
}

export interface KdsChangeAlert {
  id: string | number;
  orderId: string | number;
  name: string;
  tableName: string;
  changeType: "quantity" | "note";
  oldValue: string | number;
  newValue: string | number;
  createdAt: string;
  dismissed?: boolean;
}

interface KdsState {
  items: KdsItem[];
  voidAlerts: KdsVoidAlert[];
  newAlerts: KdsNewAlert[];
  changeAlerts: KdsChangeAlert[];
  loading: boolean;
  error: string | null;
  stationFilter: "all" | "hot_kitchen" | "bar" | "cold_kitchen";
}

const initialState: KdsState = {
  items: [],
  voidAlerts: [],
  newAlerts: [],
  changeAlerts: [],
  loading: false,
  error: null,
  stationFilter: "all",
};

// Async Thunks
export const fetchKdsItems = createAsyncThunk(
  "kds/fetchKdsItems",
  async (station: string | undefined, { rejectWithValue }) => {
    try {
      return await getKdsItemsApi(station);
    } catch (err: any) {
      return rejectWithValue(err.message || "Không thể tải danh sách món ăn KDS");
    }
  }
);

export const updateKdsItemStatus = createAsyncThunk(
  "kds/updateKdsItemStatus",
  async ({ id, status }: { id: string | number; status: string }, { rejectWithValue }) => {
    try {
      return await updateKdsItemStatusApi(id, status);
    } catch (err: any) {
      return rejectWithValue(err.message || "Không thể cập nhật trạng thái món ăn");
    }
  }
);

export const updateKdsBatchStatus = createAsyncThunk(
  "kds/updateKdsBatchStatus",
  async ({ itemIds, status }: { itemIds: (string | number)[]; status: string }, { rejectWithValue }) => {
    try {
      return await updateKdsBatchStatusApi(itemIds, status);
    } catch (err: any) {
      return rejectWithValue(err.message || "Không thể cập nhật trạng thái theo mẻ");
    }
  }
);

export const recallKdsItemStatus = createAsyncThunk(
  "kds/recallKdsItemStatus",
  async (id: string | number, { rejectWithValue }) => {
    try {
      return await recallKdsItemStatusApi(id);
    } catch (err: any) {
      return rejectWithValue(err.message || "Không thể hoàn tác trạng thái");
    }
  }
);

export const fetchKdsVoidAlerts = createAsyncThunk(
  "kds/fetchKdsVoidAlerts",
  async (_, { rejectWithValue }) => {
    try {
      return await getKdsVoidAlertsApi();
    } catch (err: any) {
      return rejectWithValue(err.message || "Không thể tải cảnh báo hủy món");
    }
  }
);

const kdsSlice = createSlice({
  name: "kds",
  initialState,
  reducers: {
    setStationFilter: (state, action: PayloadAction<"all" | "hot_kitchen" | "bar" | "cold_kitchen">) => {
      state.stationFilter = action.payload;
    },
    dismissVoidAlert: (state, action: PayloadAction<string | number>) => {
      state.voidAlerts = state.voidAlerts.filter((alert) => alert.id !== action.payload);
    },
    dismissNewAlert: (state, action: PayloadAction<string | number>) => {
      state.newAlerts = state.newAlerts.filter((alert) => alert.id !== action.payload);
    },
    dismissChangeAlert: (state, action: PayloadAction<string | number>) => {
      state.changeAlerts = state.changeAlerts.filter((alert) => alert.id !== action.payload);
    },
    dismissAllAlerts: (state) => {
      state.newAlerts = [];
      state.changeAlerts = [];
      state.voidAlerts = [];
    },
    // Mock handler for offline mode
    updateItemStatusLocal: (state, action: PayloadAction<{ id: string | number; status: any }>) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.status = action.payload.status;
      }
    },
    recallItemStatusLocal: (state, action: PayloadAction<string | number>) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        if (item.status === "done") item.status = "cooking";
        else if (item.status === "cooking") item.status = "pending";
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch KDS Items
      .addCase(fetchKdsItems.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchKdsItems.fulfilled, (state, action) => {
        state.loading = false;
        const newItemsList = action.payload || [];
        
        // 1. So sánh để tìm món mới (chưa có trong state cũ)
        // Chỉ tìm những món có createdAt gần đây (ví dụ < 2 phút) để tránh alert món cũ lúc mới load trang
        const now = Date.now();
        const twoMinsAgo = now - 2 * 60 * 1000;
        
        if (state.items.length > 0) { // Đã load lần đầu xong
          newItemsList.forEach((newItem: KdsItem) => {
            const oldItem = state.items.find((i) => i.id === newItem.id);
            
            // Check Món mới
            if (!oldItem && new Date(newItem.createdAt).getTime() > twoMinsAgo) {
              // Bỏ qua nếu đã có alert rồi hoặc đã dismissed
              if (!state.newAlerts.some(a => a.id === newItem.id)) {
                state.newAlerts.push({
                  id: newItem.id,
                  orderId: newItem.orderId,
                  name: newItem.name,
                  quantity: newItem.quantity,
                  tableName: newItem.tableName || "Mang về",
                  kitchenStation: newItem.kitchenStation,
                  createdAt: new Date().toISOString()
                });
              }
            }
            
            // Check Đổi món (Số lượng hoặc Ghi chú)
            if (oldItem && newItem.status !== "done" && newItem.status !== "delivered") {
              if (oldItem.quantity !== newItem.quantity) {
                state.changeAlerts.push({
                  id: `${newItem.id}_qty_${now}`,
                  orderId: newItem.orderId,
                  name: newItem.name,
                  tableName: newItem.tableName || "Mang về",
                  changeType: "quantity",
                  oldValue: oldItem.quantity,
                  newValue: newItem.quantity,
                  createdAt: new Date().toISOString()
                });
              }
              if (oldItem.kitchenNote !== newItem.kitchenNote) {
                state.changeAlerts.push({
                  id: `${newItem.id}_note_${now}`,
                  orderId: newItem.orderId,
                  name: newItem.name,
                  tableName: newItem.tableName || "Mang về",
                  changeType: "note",
                  oldValue: oldItem.kitchenNote || "(Không có)",
                  newValue: newItem.kitchenNote || "(Không có)",
                  createdAt: new Date().toISOString()
                });
              }
            }
          });
        }
        
        state.items = newItemsList;
      })
      .addCase(fetchKdsItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Void Alerts
      .addCase(fetchKdsVoidAlerts.fulfilled, (state, action) => {
        // Keep user dismissed flags
        const newAlerts = (action.payload || []) as KdsVoidAlert[];
        state.voidAlerts = newAlerts.filter(
          (newA) => !state.voidAlerts.some((oldA) => oldA.id === newA.id && oldA.dismissed)
        );
      })

      // Update KDS Item Status
      .addCase(updateKdsItemStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const item = state.items.find((i) => i.id === id);
        if (item) {
          item.status = status;
        }
      })
      // Update KDS Batch Status
      .addCase(updateKdsBatchStatus.fulfilled, (state, action) => {
        const { status } = action.payload;
        const { itemIds } = action.meta.arg;
        itemIds.forEach((id) => {
          const item = state.items.find((i) => i.id === id);
          if (item) {
            item.status = status;
          }
        });
      })
      // Recall KDS Item Status
      .addCase(recallKdsItemStatus.fulfilled, (state, action) => {
        const { id } = action.payload;
        const item = state.items.find((i) => i.id === id);
        if (item) {
          if (item.status === "done") item.status = "cooking";
          else if (item.status === "cooking") item.status = "pending";
        }
      });
  },
});

export const { 
  setStationFilter, 
  dismissVoidAlert, 
  dismissNewAlert,
  dismissChangeAlert,
  dismissAllAlerts,
  updateItemStatusLocal, 
  recallItemStatusLocal 
} = kdsSlice.actions;
export default kdsSlice.reducer;
