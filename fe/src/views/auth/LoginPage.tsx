import { useEffect }        from "react";
import { useNavigate }      from "react-router-dom";
import { useState }         from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loginThunk }       from "../../store/authSlice";
import type { LoginPayload } from "../../interfaces/auth";

/**
 * Trang đăng nhập.
 * Dùng Redux loginThunk — không gọi service trực tiếp trong component.
 */
export default function LoginPage() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { user, isLoading, error } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });

  /** Nếu đã đăng nhập → chuyển thẳng vào dashboard */
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(loginThunk(form));
  };

  return (
  <div
    className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
    style={{
      backgroundImage:
        "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070')",
    }}
  >
    <div className="absolute inset-0 bg-[#062d2d]/80 backdrop-blur-sm" />

    <div className="relative z-10 w-full max-w-md px-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-6xl mb-2">🍽️</h1>

        <h1 className="text-5xl font-bold text-[#f4d27c]">
          ResManager
        </h1>

        <p className="text-gray-300 mt-4">
          Hệ thống quản lý nhà hàng hiện đại
        </p>
      </div>

      {/* Card */}
      <div
        className="
        backdrop-blur-xl
        bg-white/10
        border
        border-white/20
        rounded-3xl
        shadow-2xl
        p-8
      "
      >
        <h2 className="text-4xl font-bold text-center text-[#f4d27c]">
          Đăng nhập
        </h2>

        <p className="text-center text-gray-300 mt-3 mb-8">
          Chào mừng trở lại
        </p>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-400 rounded-xl p-3 text-red-100">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label className="text-white block mb-2">
              Email
            </label>

            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              placeholder="Nhập email"
              className="
              w-full
              bg-black/20
              border border-white/20
              rounded-xl
              px-4 py-3
              text-white
              placeholder-gray-400
              focus:ring-2
              focus:ring-[#f4d27c]
              outline-none
            "
            />
          </div>

          <div>
            <label className="text-white block mb-2">
              Mật khẩu
            </label>

            <input
              type="password"
              required
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
              placeholder="Nhập mật khẩu"
              className="
              w-full
              bg-black/20
              border border-white/20
              rounded-xl
              px-4 py-3
              text-white
              placeholder-gray-400
              focus:ring-2
              focus:ring-[#f4d27c]
              outline-none
            "
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="
            w-full
            py-3
            rounded-xl
            bg-[#f4d27c]
            text-[#062d2d]
            font-bold
            hover:scale-[1.02]
            transition
          "
          >
            {isLoading
              ? "Đang đăng nhập..."
              : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  </div>
);
}