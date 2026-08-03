import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { UtensilsCrossed, Mail, Lock, User, Phone, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { registerCustomer } from "../../services/customerService";

/**
 * CustomerRegisterPage — Trang đăng ký dành riêng cho Khách hàng
 * URL: /customer/register
 * Tông màu đỏ gạch (#a72d1e) và vàng kim (#dfb05b) đồng bộ với Trang chủ Restro
 */
export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/account";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Nếu đã có customer_token → redirect về trang đích
  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    if (token) {
      navigate(redirectParam, { replace: true });
    }
  }, [navigate, redirectParam]);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập họ tên!");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Mật khẩu phải ít nhất 6 ký tự!");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (form.phone) {
      const cleaned = form.phone.trim().replace(/[\s-]/g, "");
      const phoneRegex = /^(03|09)\d{8}$/;
      if (!phoneRegex.test(cleaned)) {
        toast.error("Số điện thoại không hợp lệ (bắt buộc 10 chữ số, bắt đầu bằng 03 hoặc 09)!");
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await registerCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      // Tự động đăng nhập sau khi đăng ký thành công
      localStorage.setItem("customer_token", result.token);
      localStorage.setItem("customer_info", JSON.stringify(result.customer));
      toast.success(`Chào mừng ${result.customer.name}! Tài khoản đã được tạo thành công.`);
      navigate(redirectParam, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative p-6 font-sans py-12"
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

      <div className="relative z-10 w-full max-w-md animate-fade-in my-auto">
        {/* Logo Brand Restro */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a72d1e] text-white shadow-xl ring-4 ring-[#dfb05b]/30">
              <UtensilsCrossed size={28} />
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tight drop-shadow-md">
            Restro
          </h1>
          <p className="text-[#dfb05b] text-xs uppercase tracking-widest font-bold mt-1">
            Fine Dining &amp; Culinary Experience
          </p>
        </div>

        {/* Card Form Đăng Ký */}
        <div className="backdrop-blur-xl bg-[#2a221c]/80 border border-[#dfb05b]/30 rounded-3xl shadow-2xl p-7 text-white relative overflow-hidden">
          {/* Vệt trang trí góc */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#a72d1e]/20 rounded-full blur-2xl pointer-events-none" />

          <h2 className="text-2xl font-extrabold text-center font-display mb-1 text-white">
            Đăng ký tài khoản
          </h2>
          <p className="text-center text-gray-300 text-xs mb-5">
            Tích điểm thành viên, nhận ưu đãi độc quyền mỗi lần đặt bàn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Họ tên */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1">
                Họ và tên *
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1">
                Số điện thoại <span className="text-gray-400 font-normal lowercase">(tùy chọn)</span>
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setField("phone", e.target.value.replace(/[^0-9+]/g, "").replace(/(?!^\+)\+/g, ""))
                  }
                  placeholder="0912345678"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1">
                Mật khẩu *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-white transition cursor-pointer"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="text-xs font-bold text-[#dfb05b] uppercase tracking-wider block mb-1">
                Xác nhận mật khẩu *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full bg-black/40 border border-white/20 rounded-xl pl-10 pr-10 py-2.5 text-white text-xs placeholder-gray-400 focus:ring-2 focus:ring-[#dfb05b] focus:border-[#dfb05b] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-white transition cursor-pointer"
                  aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#a72d1e] hover:bg-[#8e2316] text-white font-bold text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(167,45,30,0.5)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                "Tạo tài khoản ngay"
              )}
            </button>

            {/* Links */}
            <div className="text-center pt-3 border-t border-white/10 mt-4">
              <p className="text-gray-300 text-xs">
                Đã có tài khoản?{" "}
                <Link
                  to={`/customer/login?redirect=${encodeURIComponent(redirectParam)}`}
                  className="text-[#dfb05b] font-extrabold hover:text-[#f3cb7c] underline transition"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

