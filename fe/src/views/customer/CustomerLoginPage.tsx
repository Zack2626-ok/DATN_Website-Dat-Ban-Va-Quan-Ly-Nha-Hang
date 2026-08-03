import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { UtensilsCrossed, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { loginCustomer } from "../../services/customerService";

/**
 * CustomerLoginPage — Trang đăng nhập dành riêng cho Khách hàng
 * URL: /customer/login
 * Sử dụng tông màu đỏ gạch (#a72d1e) và vàng kim (#dfb05b) đồng bộ với Trang chủ
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
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative p-6 font-sans"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070')",
      }}
    >
      {/* Nút quay về trang chủ */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md text-xs font-bold transition border border-white/10 shadow-lg"
      >
        <ArrowLeft size={14} className="text-[#dfb05b]" /> Về trang chủ
      </Link>

      {/* Overlay ấm cúng */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/70 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo Brand Restro */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a72d1e] text-white shadow-xl ring-4 ring-[#dfb05b]/30">
              <UtensilsCrossed size={32} />
            </span>
          </div>
          <h1 className="text-4xl font-extrabold text-white font-display tracking-tight drop-shadow-md">
            Restro
          </h1>
          <p className="text-[#dfb05b] text-xs uppercase tracking-widest font-bold mt-1">
            Fine Dining &amp; Culinary Experience
          </p>
        </div>

        {/* Card Form Đăng Nhập */}
        <div className="backdrop-blur-xl bg-[#2a221c]/80 border border-[#dfb05b]/30 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
          {/* Vệt trang trí góc */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#a72d1e]/20 rounded-full blur-2xl pointer-events-none" />

          <h2 className="text-2xl font-extrabold text-center font-display mb-1 text-white">
            Đăng nhập Khách hàng
          </h2>
          <p className="text-center text-gray-300 text-xs mb-6">
            Chào mừng trở lại! Vui lòng nhập thông tin của bạn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-11 pr-11 py-3 text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-white transition cursor-pointer"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#a72d1e] hover:bg-[#8e2316] text-white font-bold text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(167,45,30,0.5)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đăng nhập ngay"
              )}
            </button>

            {/* Links */}
            <div className="text-center space-y-3 pt-4 border-t border-white/10 mt-6">
              <p className="text-gray-300 text-sm">
                Chưa có tài khoản?{" "}
                <Link
                  to={`/customer/register?redirect=${encodeURIComponent(redirectParam)}`}
                  className="text-[#dfb05b] font-extrabold hover:text-[#f3cb7c] underline transition"
                >
                  Đăng ký ngay
                </Link>
              </p>
              <p className="text-gray-400 text-xs">
                Bạn là nhân viên nhà hàng?{" "}
                <Link
                  to="/auth/login"
                  className="text-gray-300 hover:text-white underline transition"
                >
                  Đăng nhập nội bộ
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

