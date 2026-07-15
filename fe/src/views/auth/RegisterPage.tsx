import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../../services/authService";
import { ROLE_OPTIONS } from "../../constants/roles";
import { USER_ROLE } from "../../constants/roles";
import type { RegisterPayload, UserRole } from "../../interfaces/auth";

/**
 * Trang tạo tài khoản nhân viên.
 * Chỉ admin / manager mới truy cập được (bảo vệ bởi ProtectedRoute).
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterPayload>({
    full_name: "",
    email: "",
    password: "",
    role_name: USER_ROLE.WAITER,
    phone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  /** Cập nhật một field trong form */
  const setField = (key: keyof RegisterPayload, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (form.phone) {
      const cleanedPhone = form.phone.trim();
      const phoneRegex = /^(0|\+?84)(3|5|7|8|9|2)[0-9]{8,9}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        setError("Số điện thoại không hợp lệ (phải từ 10-11 chữ số)");
        return;
      }
    }

    setLoading(true);
    try {
      await registerApi(form);
      setSuccess(
        `Tạo tài khoản thành công cho ${form.full_name}! Chuyển hướng...`,
      );
      setForm({
        full_name: "",
        email: "",
        password: "",
        role_name: USER_ROLE.WAITER,
        phone: "",
      });
      setTimeout(() => {
        navigate("/auth/login");
      }, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Tạo tài khoản thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative p-6"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070')",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#062d2d]/80 backdrop-blur-sm" />

      <div
        className="
        relative z-10
        w-full
        max-w-5xl
        backdrop-blur-xl
        bg-white/10
        border border-white/20
        rounded-3xl
        shadow-2xl
        p-8 md:p-10
      "
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍽️</div>

          <h1 className="text-4xl font-bold text-[#f4d27c]">
            Đăng ký tài khoản
          </h1>

          <p className="text-gray-300 mt-3">
            Tạo tài khoản nhân viên mới cho hệ thống
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-[#f4d27c] hover:text-yellow-300 transition"
        >
          ← Quay lại
        </button>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400 bg-red-500/20 p-3 text-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-400 bg-green-500/20 p-3 text-green-100">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
          {/* Họ tên */}
          <div>
            <label className="block text-white mb-2">Họ và tên</label>

            <input
              required
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              placeholder="Nguyễn Văn A"
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

          {/* Email */}
          <div>
            <label className="block text-white mb-2">Email</label>

            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="nv@restaurant.com"
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

          {/* Password */}
          <div>
            <label className="block text-white mb-2">Mật khẩu</label>

            <input
              type="password"
              minLength={6}
              required
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
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

          {/* Phone */}
          <div>
            <label className="block text-white mb-2">Số điện thoại</label>

            <input
              required
              type="tel"
              pattern="[0-9]{10}"
              title="Số điện thoại phải bao gồm 10 chữ số"
              value={form.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
              placeholder="0912345678"
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

          {/* Role */}
          <div className="md:col-span-2">
            <label className="block text-white mb-2">Vai trò</label>

            <select
              value={form.role_name}
              onChange={(e) =>
                setField("role_name", e.target.value as UserRole)
              }
              className="
              w-full
              bg-black/20
              border border-white/20
              rounded-xl
              px-4 py-3
              text-white
              focus:ring-2
              focus:ring-[#f4d27c]
              outline-none
            "
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value} className="text-black">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="
            md:col-span-2
            py-3
            rounded-xl
            bg-[#f4d27c]
            text-[#062d2d]
            font-bold
            text-lg
            hover:scale-[1.01]
            transition
            disabled:opacity-50
          "
          >
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}
