import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ORDER_STATUS, OrderStatus } from "../constants/orderStatus";
import type { Order, OrderItem } from "../interfaces";
import { getOrdersApi, createOrderApi, updateOrderStatusApi } from "../services/api";

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
}

const INITIAL_ORDERS: Order[] = [
  {
    id: "o_figma_4",
    tableId: "t3",
    tableName: "B03",
    customerName: "Nguyễn Văn A",
    customerPhone: "0904445556",
    customerEmail: "an@gmail.com",
    guestCount: 2,
    items: [
      { menuItemId: "m1", name: "Gỏi hải sản", price: 185, quantity: 1 },
      { menuItemId: "m3", name: "Bò lúc lắc", price: 265, quantity: 1 },
      { menuItemId: "m9", name: "Trà đào cam sả", price: 45, quantity: 2 },
    ],
    status: ORDER_STATUS.SERVED,
    totalAmount: 540,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    orderType: "dine_in",
  },
  {
    id: "o1",
    tableId: "t5",
    tableName: "B05",
    customerName: "Alex Mercer",
    customerPhone: "0901234567",
    customerEmail: "alex@example.com",
    guestCount: 2,
    items: [
      { menuItemId: "m6", name: "Lẩu Thái chua cay", price: 380, quantity: 1 },
      { menuItemId: "m10", name: "Nước ép dưa hấu", price: 40, quantity: 2 },
    ],
    status: ORDER_STATUS.IN_KITCHEN,
    totalAmount: 460,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35m ago
    orderType: "dine_in",
  },
  {
    id: "o2",
    tableId: "t1",
    tableName: "B01",
    customerName: "Elena Rostova",
    customerPhone: "0987654321",
    customerEmail: "elena@yahoo.com",
    guestCount: 3,
    items: [
      { menuItemId: "m4", name: "Cá hồi sốt chanh leo", price: 285, quantity: 1 },
      { menuItemId: "m11", name: "Sinh tố bơ", price: 55, quantity: 1 },
    ],
    status: ORDER_STATUS.SERVED,
    totalAmount: 340,
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(), // 65m ago
    orderType: "dine_in",
  },
  {
    id: "o3",
    tableId: "t9",
    tableName: "B09",
    customerName: "John Doe",
    customerPhone: "0911223344",
    customerEmail: "john.doe@gmail.com",
    guestCount: 4,
    items: [
      { menuItemId: "m2", name: "Khoai tây chiên bơ tỏi", price: 45, quantity: 2 },
      { menuItemId: "m9", name: "Trà đào cam sả", price: 45, quantity: 2 },
    ],
    status: ORDER_STATUS.CONFIRMED,
    totalAmount: 180,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10m ago
    orderType: "dine_in",
  },
  {
    id: "o_past_1",
    tableId: "t5",
    tableName: "B05",
    customerName: "Marcus Aurelius",
    customerPhone: "0900111222",
    customerEmail: "marcus@philosophy.org",
    guestCount: 2,
    items: [
      { menuItemId: "m5", name: "Sườn sụn nướng BBQ", price: 245, quantity: 1 },
      { menuItemId: "m8", name: "Bánh tiramisu", price: 60, quantity: 1 },
    ],
    status: ORDER_STATUS.PAID,
    totalAmount: 305,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3h ago
    orderType: "dine_in",
  },
  {
    id: "o_past_2",
    tableId: "t10",
    tableName: "B10",
    customerName: "Sophia Loren",
    customerPhone: "0922333444",
    customerEmail: "sophia@actress.it",
    guestCount: 3,
    items: [
      { menuItemId: "m7", name: "Lẩu nấm thực dưỡng", price: 350, quantity: 1 },
      { menuItemId: "m11", name: "Sinh tố bơ", price: 55, quantity: 2 },
    ],
    status: ORDER_STATUS.PAID,
    totalAmount: 460,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // 5h ago
    orderType: "dine_in",
  },
];

// Async Thunk to fetch orders from server
export const fetchOrders = createAsyncThunk("orders/fetchOrders", async (_, { rejectWithValue }) => {
  try {
    return await getOrdersApi();
  } catch (err: any) {
    console.warn("⚠️ API fetchOrders failed, using local/mock orders. Error:", err.message);
    return rejectWithValue(err.message || "Failed to fetch");
  }
});

// Async Thunk to place a new order on server
export const placeOrder = createAsyncThunk(
  "orders/placeOrder",
  async (orderData: Omit<Order, "createdAt">, { rejectWithValue }) => {
    try {
      return await createOrderApi(orderData);
    } catch (err: any) {
      console.error("⚠️ API placeOrder failed. Error:", err.message);
      return rejectWithValue(err.message || "Failed to place order");
    }
  }
);

// Async Thunk to update order status on server
export const updateOrderStatusOnServer = createAsyncThunk(
  "orders/updateOrderStatusOnServer",
  async ({ id, status }: { id: string; status: OrderStatus }, { rejectWithValue }) => {
    try {
      return await updateOrderStatusApi(id, status);
    } catch (err: any) {
      console.error("⚠️ API updateOrderStatus failed. Error:", err.message);
      return rejectWithValue(err.message || "Failed to update status");
    }
  }
);

const orderSlice = createSlice({
  name: "orders",
  initialState: {
    orders: INITIAL_ORDERS,
    loading: false,
    error: null,
  } as OrderState,
  reducers: {
    createOrder: (state, action: PayloadAction<Omit<Order, "createdAt">> ) => {
      const newOrder: Order = {
        ...action.payload,
        createdAt: new Date().toISOString(),
      };
      state.orders.push(newOrder);
    },
    updateOrderStatus: (state, action: PayloadAction<{ id: string; status: OrderStatus }>) => {
      const order = state.orders.find((o) => o.id === action.payload.id);
      if (order) {
        order.status = action.payload.status;
      }
    },
    addItemsToOrder: (state, action: PayloadAction<{ id: string; items: OrderItem[]; totalAmount: number }>) => {
      const order = state.orders.find((o) => o.id === action.payload.id);
      if (order) {
        // Merge item lists
        action.payload.items.forEach((newItem) => {
          const existing = order.items.find((item) => item.menuItemId === newItem.menuItemId);
          if (existing) {
            existing.quantity += newItem.quantity;
          } else {
            order.items.push(newItem);
          }
        });
        order.totalAmount += action.payload.totalAmount;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        // If DB has orders, use them. If empty, keep INITIAL_ORDERS so the UI is always beautiful.
        if (action.payload && action.payload.length > 0) {
          state.orders = action.payload;
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Place Order
      .addCase(placeOrder.fulfilled, (state, action) => {
        // Find if order already exists in local list, otherwise push it
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index === -1) {
          state.orders.push(action.payload);
        } else {
          state.orders[index] = action.payload;
        }
      })

      // Update Order Status
      .addCase(updateOrderStatusOnServer.fulfilled, (state, action) => {
        const order = state.orders.find((o) => o.id === action.payload.id);
        if (order) {
          order.status = action.payload.status as OrderStatus;
        }
      });
  },
});

export const { createOrder, updateOrderStatus, addItemsToOrder } = orderSlice.actions;
export default orderSlice.reducer;
