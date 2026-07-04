import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User, LoginPayload, UserRole } from "../interfaces/auth";
import { loginApi, getMeApi } from "../services/authService";

// ─── State ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/**
 * Đăng nhập — gọi API, lưu token, trả về User
 */
export const loginThunk = createAsyncThunk<
  User,
  LoginPayload,
  { rejectValue: string }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const loginData = await loginApi(payload);
    const apiUser = loginData.user || (loginData as any);
    return {
      ...apiUser,
      role: apiUser.role || (apiUser as unknown as { role_name?: UserRole }).role_name,
    } as User;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message;
    return rejectWithValue(msg ?? "Đăng nhập thất bại");
  }
});

/**
 * Khôi phục session khi load lại trang — gọi GET /auth/me
 */
export const restoreSessionThunk = createAsyncThunk<
  User | null,
  void,
  { rejectValue: string }
>("auth/restoreSession", async (_, { rejectWithValue }) => {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  try {
    const apiUser = await getMeApi();
    return {
      ...apiUser,
      role: apiUser.role || (apiUser as unknown as { role_name?: UserRole }).role_name,
    } as User;
  } catch {
    localStorage.clear();
    return rejectWithValue("Phiên đăng nhập hết hạn");
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Đăng xuất — xóa token và reset state */
    logoutAction(state) {
      state.user = null;
      state.error = null;
      localStorage.clear();
    },
    /** Cập nhật thông tin user (vd: sau khi đổi avatar) */
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    // loginThunk
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Lỗi không xác định";
      });

    // restoreSessionThunk
    builder
      .addCase(restoreSessionThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
      });
  },
});

export const { logoutAction, setUser } = authSlice.actions;
export default authSlice.reducer;
