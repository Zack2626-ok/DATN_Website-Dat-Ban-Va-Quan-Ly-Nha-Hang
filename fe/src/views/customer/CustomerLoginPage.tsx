import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { UtensilsCrossed, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { loginCustomer } from "../../services/customerService";

/**
 * CustomerLoginPage — Trang đăng nhập dành riêng cho Khách hàng
 * URL: /customer/login
 * Tách biệt hoàn toàn với /auth/login (nhân viên)
 */
export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Nếu đã có customer_token → redirect về trang đích
  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    if (token) {
      navigate(redirectParam, { replace: true });
    }
  }, [navigate, redirectParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng nhập email và mật khẩu!");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginCustomer({ email, password });
      // Lưu token và thông tin khách hàng
      localStorage.setItem("customer_token", result.token);
      localStorage.setItem("customer_info", JSON.stringify(result.customer));
      toast.success(`Chào mừng trở lại, ${result.customer.name}!`);
      navigate(redirectParam, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Email hoặc mật khẩu không đúng.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
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
      <div className="absolute inset-0 bg-gray-900/60" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/80 text-white backdrop-blur-sm shadow-xl">
              <UtensilsCrossed size={32} />
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white drop-shadow-sm">ResManager</h1>
          <p className="text-gray-300 mt-2">Đăng nhập để đặt bàn &amp; quản lý tài khoản</p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            Đăng nhập Khách hàng
          </h2>
          <p className="text-center text-gray-300 text-sm mb-8">
            Chào mừng trở lại! Vui lòng nhập thông tin của bạn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-black/20 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-black/20 border border-white/20 rounded-xl pl-11 pr-11 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-white transition"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 hover:scale-[1.02] transition shadow-[0_0_20px_rgba(37,99,235,0.5)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>

            {/* Links */}
            <div className="text-center space-y-2 pt-2">
              <p className="text-gray-300 text-sm">
                Chưa có tài khoản?{" "}
                <Link
                  to={`/customer/register?redirect=${encodeURIComponent(redirectParam)}`}
                  className="text-blue-300 font-bold hover:text-blue-200 underline transition"
                >
                  Đăng ký ngay
                </Link>
              </p>
              <p className="text-gray-500 text-xs">
                Bạn là nhân viên? Hãy truy cập trang Nhân viên.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
