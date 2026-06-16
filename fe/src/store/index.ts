import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import orderReducer from "./orderSlice";
import inventoryReducer from "./inventorySlice";
import menuReducer from "./menuSlice";
import tableReducer from "./tableSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    inventory: inventoryReducer,
    menu: menuReducer,
    tables: tableReducer,
  },
});

/** Kiểu RootState dùng trong useSelector */
export type RootState = ReturnType<typeof store.getState>;
/** Kiểu AppDispatch dùng trong useDispatch */
export type AppDispatch = typeof store.dispatch;
