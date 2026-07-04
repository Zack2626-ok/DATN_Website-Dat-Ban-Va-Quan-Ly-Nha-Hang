import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import orderReducer from "./orderSlice";
import inventoryReducer from "./inventorySlice";
import menuReducer from "./menuSlice";
import tableReducer from "./tableSlice";
import kdsReducer from "./kdsSlice";
import uiReducer from "./uiSlice";
import banquetReducer from "./banquetSlice";
import invoiceReducer from "./invoiceSlice";

// Load state from localStorage
const loadState = () => {
  try {
    const serializedState = localStorage.getItem("resmanagerState");
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

const preloadedState = loadState();

const rootReducer = combineReducers({
  auth: authReducer,
  orders: orderReducer,
  inventory: inventoryReducer,
  menu: menuReducer,
  tables: tableReducer,
  kds: kdsReducer,
  ui: uiReducer,
  banquet: banquetReducer,
  invoices: invoiceReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  preloadedState,
});

// Save state to localStorage
const saveState = (state: RootState) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem("resmanagerState", serializedState);
  } catch {
    // ignore write errors
  }
};

// Subscribe to store changes to save to localStorage
store.subscribe(() => {
  saveState(store.getState());
});

/** Kiểu RootState dùng trong useSelector */
export type RootState = ReturnType<typeof store.getState>;
/** Kiểu AppDispatch dùng trong useDispatch */
export type AppDispatch = typeof store.dispatch;
