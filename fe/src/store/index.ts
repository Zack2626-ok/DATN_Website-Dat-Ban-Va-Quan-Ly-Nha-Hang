import { configureStore } from "@reduxjs/toolkit";
import authReducer         from "./authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

/** Kiểu RootState dùng trong useSelector */
export type RootState   = ReturnType<typeof store.getState>;
/** Kiểu AppDispatch dùng trong useDispatch */
export type AppDispatch = typeof store.dispatch;