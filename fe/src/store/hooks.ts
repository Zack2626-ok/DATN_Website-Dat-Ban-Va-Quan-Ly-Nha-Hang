import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

/** useDispatch đã có kiểu AppDispatch — dùng thay cho useDispatch gốc */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/** useSelector đã có kiểu RootState — dùng thay cho useSelector gốc */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;