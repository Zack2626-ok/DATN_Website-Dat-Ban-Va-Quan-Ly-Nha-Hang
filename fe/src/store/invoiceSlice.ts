import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { Invoice, InvoiceStatus } from "../interfaces/invoice";
import {
  getInvoicesApi,
  getInvoiceByIdApi,
  processPaymentApi,
  cancelInvoiceApi,
  splitBillEqualApi,
  splitBillByItemsApi,
  mergeBillsApi,
} from "../services/invoiceService";
import type { PaymentRequest, SplitBillEqualRequest, SplitBillByItemsRequest, MergeBillRequest } from "../interfaces/invoice";

interface InvoiceState {
  invoices: Invoice[];
  selectedInvoiceId: string | null;
  loading: boolean;
  error: string | null;
  actionLoading: boolean;
}

const initialState: InvoiceState = {
  invoices: [],
  selectedInvoiceId: null,
  loading: false,
  error: null,
  actionLoading: false,
};

export const fetchInvoices = createAsyncThunk(
  "invoices/fetchInvoices",
  async (params?: { status?: string; search?: string }, thunkAPI?: any) => {
    const rejectWithValue = thunkAPI?.rejectWithValue;
    try {
      return await getInvoicesApi(params);
    } catch (err: any) {
      return rejectWithValue ? rejectWithValue(err.response?.data?.message || err.message) : err.message;
    }
  },
);

export const fetchInvoiceById = createAsyncThunk(
  "invoices/fetchInvoiceById",
  async (id: string, { rejectWithValue }) => {
    try {
      return await getInvoiceByIdApi(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const processInvoicePayment = createAsyncThunk(
  "invoices/processPayment",
  async (
    { invoiceId, data }: { invoiceId: string; data: PaymentRequest },
    { rejectWithValue },
  ) => {
    try {
      return await processPaymentApi(invoiceId, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const cancelInvoice = createAsyncThunk(
  "invoices/cancelInvoice",
  async ({ invoiceId, reason }: { invoiceId: string; reason?: string }, { rejectWithValue }) => {
    try {
      await cancelInvoiceApi(invoiceId, reason);
      return invoiceId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const splitBillEqual = createAsyncThunk(
  "invoices/splitBillEqual",
  async (
    { invoiceId, data }: { invoiceId: string; data: SplitBillEqualRequest },
    { rejectWithValue },
  ) => {
    try {
      return await splitBillEqualApi(invoiceId, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const splitBillByItems = createAsyncThunk(
  "invoices/splitBillByItems",
  async (
    { invoiceId, data }: { invoiceId: string; data: SplitBillByItemsRequest },
    { rejectWithValue },
  ) => {
    try {
      return await splitBillByItemsApi(invoiceId, data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const mergeBills = createAsyncThunk(
  "invoices/mergeBills",
  async (data: MergeBillRequest, { rejectWithValue }) => {
    try {
      return await mergeBillsApi(data);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

const invoiceSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    selectInvoice: (state, action: PayloadAction<string | null>) => {
      state.selectedInvoiceId = action.payload;
    },
    clearInvoiceError: (state) => {
      state.error = null;
    },
    updateInvoiceLocal: (state, action: PayloadAction<Partial<Invoice> & { id: string }>) => {
      const idx = state.invoices.findIndex((inv) => inv.id === action.payload.id);
      if (idx !== -1) {
        state.invoices[idx] = { ...state.invoices[idx], ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(processInvoicePayment.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(processInvoicePayment.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { order } = action.payload;
        const idx = state.invoices.findIndex((inv) => inv.id === order.id);
        if (idx !== -1) {
          state.invoices[idx] = { ...state.invoices[idx], ...order, invoiceStatus: "paid" as InvoiceStatus };
        }
      })
      .addCase(processInvoicePayment.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      .addCase(cancelInvoice.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.invoices.findIndex((inv) => inv.id === action.payload);
        if (idx !== -1) {
          state.invoices[idx].invoiceStatus = "cancelled";
          state.invoices[idx].status = "cancelled";
        }
        if (state.selectedInvoiceId === action.payload) {
          state.selectedInvoiceId = null;
        }
      })
      .addCase(cancelInvoice.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      .addCase(splitBillEqual.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(splitBillEqual.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { originalOrderId, splitBills } = action.payload;
        const idx = state.invoices.findIndex((inv) => inv.id === originalOrderId);
        if (idx !== -1) {
          state.invoices[idx].invoiceStatus = "cancelled";
          state.invoices[idx].status = "cancelled";
        }
        state.invoices.push(
          ...splitBills.map((sb: any) => ({
            ...sb,
            invoiceStatus: "unpaid" as InvoiceStatus,
          })),
        );
        if (state.selectedInvoiceId === originalOrderId) {
          state.selectedInvoiceId = splitBills[0]?.id || null;
        }
      })
      .addCase(splitBillEqual.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      .addCase(splitBillByItems.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(splitBillByItems.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { originalOrderId, splitBills } = action.payload;
        const idx = state.invoices.findIndex((inv) => inv.id === originalOrderId);
        if (idx !== -1) {
          state.invoices[idx].invoiceStatus = "cancelled";
          state.invoices[idx].status = "cancelled";
        }
        state.invoices.push(
          ...splitBills.map((sb: any) => ({
            ...sb,
            invoiceStatus: "unpaid" as InvoiceStatus,
          })),
        );
        if (state.selectedInvoiceId === originalOrderId) {
          state.selectedInvoiceId = splitBills[0]?.id || null;
        }
      })
      .addCase(splitBillByItems.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      .addCase(mergeBills.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(mergeBills.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { mergedOrder, mergedFrom } = action.payload;
        for (const mergedId of mergedFrom) {
          const idx = state.invoices.findIndex((inv) => inv.id === mergedId);
          if (idx !== -1) {
            state.invoices[idx].invoiceStatus = "cancelled";
            state.invoices[idx].status = "cancelled";
          }
        }
        state.invoices.push({
          ...mergedOrder,
          invoiceStatus: "unpaid" as InvoiceStatus,
        });
        state.selectedInvoiceId = mergedOrder.id;
      })
      .addCase(mergeBills.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { selectInvoice, clearInvoiceError, updateInvoiceLocal } = invoiceSlice.actions;
export default invoiceSlice.reducer;
