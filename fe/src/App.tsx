import { useEffect }         from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider }          from "react-redux";
import { store }             from "./store";
import { useAppDispatch }    from "./store/hooks"
import { restoreSessionThunk } from "./store/authSlice";
import ProtectedRoute        from "./routes/ProtectedRoute";
import LoginPage             from "./views/auth/LoginPage";
import RegisterPage          from "./views/auth/RegisterPage";

/** Khôi phục session một lần khi app khởi động */
function AppRoutes() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreSessionThunk());
  }, [dispatch]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/auth/login" element={<LoginPage />} />

      {/* Cần đăng nhập */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <div className="p-8 text-gray-500">Dashboard — sẽ làm sau</div>
          </ProtectedRoute>
        }
      />

      {/* Chỉ admin / manager */}
          <Route
      path="/auth/register"
      element={<RegisterPage />}
    />
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );  
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter future={{
    v7_startTransition: true,
  }}
>
      
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}

