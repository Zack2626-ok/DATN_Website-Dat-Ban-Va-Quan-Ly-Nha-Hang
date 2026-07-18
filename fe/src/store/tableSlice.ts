import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { TABLE_STATUS, TableStatus } from "../constants/tableStatus";
import type { Table } from "../interfaces";
import { getTablesV1 } from "../services/tableService";

interface TableState {
  tables: Table[];
  loading?: boolean;
}

const INITIAL_TABLES: Table[] = [
  { id: "t1", name: "B01", status: TABLE_STATUS.AVAILABLE, seats: 4, zone: "Tầng 1", currentOrderId: null },
  { id: "t2", name: "B02", status: TABLE_STATUS.AVAILABLE, seats: 2, zone: "Tầng 1", currentOrderId: null },
  { id: "t3", name: "B03", status: TABLE_STATUS.OCCUPIED, seats: 4, zone: "Tầng 1", currentOrderId: "o_figma_4" },
  { id: "t4", name: "B04", status: TABLE_STATUS.AVAILABLE, seats: 6, zone: "Tầng 1", currentOrderId: null },
  { id: "t5", name: "B05", status: TABLE_STATUS.RESERVED, seats: 4, zone: "Tầng 2", currentOrderId: "o1" },
  { id: "t6", name: "B06", status: TABLE_STATUS.AVAILABLE, seats: 2, zone: "Tầng 2", currentOrderId: null },
  { id: "t7", name: "B07", status: TABLE_STATUS.AVAILABLE, seats: 8, zone: "Tầng 2", currentOrderId: null },
  { id: "t8", name: "B08", status: TABLE_STATUS.AVAILABLE, seats: 4, zone: "Sân vườn", currentOrderId: null },
  { id: "t9", name: "B09", status: TABLE_STATUS.CLEANING, seats: 4, zone: "Sân vườn", currentOrderId: null },
  { id: "t10", name: "B10", status: TABLE_STATUS.AVAILABLE, seats: 4, zone: "Sân vườn", currentOrderId: null },
];

export const fetchTables = createAsyncThunk(
  "tables/fetchTables",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getTablesV1();
      return data.map((t: any) => ({
        id: String(t.id || `t_${t.tableNumber}`),
        name: t.name || `Bàn ${t.tableNumber}`,
        status: (t.status || "empty") as TableStatus,
        seats: t.capacity || 4,
        zone: t.location || "Tầng 1",
        currentOrderId: t.currentOrderId || null,
      }));
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch tables");
    }
  }
);

const tableSlice = createSlice({
  name: "tables",
  initialState: {
    tables: INITIAL_TABLES,
    loading: false,
  } as TableState,
  reducers: {
    setTables: (state, action: PayloadAction<Table[]>) => {
      state.tables = action.payload;
    },
    setTableStatus: (state, action: PayloadAction<{ id: string; status: TableStatus; currentOrderId?: string | null }>) => {
      const table = state.tables.find((t) => t.id === action.payload.id);
      if (table) {
        table.status = action.payload.status;
        if (action.payload.currentOrderId !== undefined) {
          table.currentOrderId = action.payload.currentOrderId;
        }
      }
    },
    occupyTable: (state, action: PayloadAction<{ id: string; orderId: string }>) => {
      const table = state.tables.find((t) => t.id === action.payload.id);
      if (table) {
        table.status = TABLE_STATUS.OCCUPIED;
        table.currentOrderId = action.payload.orderId;
      }
    },
    releaseTableToCleaning: (state, action: PayloadAction<{ id: string }>) => {
      const table = state.tables.find((t) => t.id === action.payload.id);
      if (table) {
        table.status = TABLE_STATUS.CLEANING;
        table.currentOrderId = null;
      }
    },
    makeTableAvailable: (state, action: PayloadAction<{ id: string }>) => {
      const table = state.tables.find((t) => t.id === action.payload.id);
      if (table) {
        table.status = TABLE_STATUS.AVAILABLE;
        table.currentOrderId = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.length > 0) {
          state.tables = action.payload;
        }
      })
      .addCase(fetchTables.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setTables, setTableStatus, occupyTable, releaseTableToCleaning, makeTableAvailable } = tableSlice.actions;
export default tableSlice.reducer;
