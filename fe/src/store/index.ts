import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import menuReducer from "./menuSlice";
import tableReducer from "./tableSlice";
import orderReducer from "./orderSlice";
import inventoryReducer from "./inventorySlice";

export const store = configureStore({
  reducer: {
    menu: menuReducer,
    tables: tableReducer,
    orders: orderReducer,
    inventory: inventoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use typed hooks instead of plain useDispatch and useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
