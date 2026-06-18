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
  status: "pending" | "cooking" | "done" | "cancelled" | "voided";
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

interface KdsState {
  items: KdsItem[];
  voidAlerts: KdsVoidAlert[];
  loading: boolean;
  error: string | null;
  stationFilter: "all" | "hot_kitchen" | "bar" | "cold_kitchen";
}

const initialState: KdsState = {
  items: [],
  voidAlerts: [],
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
        state.items = action.payload || [];
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
      });
  },
});

export const { setStationFilter, dismissVoidAlert, updateItemStatusLocal, recallItemStatusLocal } = kdsSlice.actions;
export default kdsSlice.reducer;
