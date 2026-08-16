import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CartItem {
  _id?: string;
  menu_item_id: number;
  productId: number; // for compatibility
  name: string;
  unit_price: number;
  price: number; // for compatibility
  quantity: number;
  notes?: string;
}

interface ClientCartState {
  items: CartItem[];
  sessionId: string | null;
  tableId: string | null;
  token: string | null;
  isConnected: boolean;
}

const initialState: ClientCartState = {
  items: [],
  sessionId: null,
  tableId: null,
  token: null,
  isConnected: false,
};

const clientCartSlice = createSlice({
  name: "clientCart",
  initialState,
  reducers: {
    setSessionData: (state, action: PayloadAction<{ tableId: string; sessionId: string; token: string }>) => {
      state.tableId = action.payload.tableId;
      state.sessionId = action.payload.sessionId;
      state.token = action.payload.token;
    },
    setCartData: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    clearCart: (state) => {
      state.items = [];
    }
  },
});

export const { setSessionData, setCartData, setConnected, clearCart } = clientCartSlice.actions;
export default clientCartSlice.reducer;
