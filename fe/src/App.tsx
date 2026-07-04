import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { useAppDispatch } from "./store/hooks";
import { restoreSessionThunk } from "./store/authSlice";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppRoutes } from "./routes"; // ✅ Import routes từ routes/index.tsx

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

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
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppProvider />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
