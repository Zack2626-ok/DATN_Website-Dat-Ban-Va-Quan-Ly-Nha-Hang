import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAppDispatch } from "./store/hooks";
import { restoreSessionThunk } from "./store/authSlice";

import { AppRoutes } from "./routes"; // ✅ Import routes từ routes/index.tsx

/** Khôi phục session một lần khi app khởi động */
function AppProvider() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreSessionThunk());
  }, [dispatch]);

  return <AppRoutes />;
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AppProvider />
      </BrowserRouter>
    </Provider>
  );
}
