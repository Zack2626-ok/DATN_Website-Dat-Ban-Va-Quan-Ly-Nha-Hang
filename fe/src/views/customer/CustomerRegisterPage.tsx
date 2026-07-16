import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { UtensilsCrossed, Mail, Lock, User, Phone, Loader2, Eye, EyeOff } from "lucide-react";
import { registerCustomer } from "../../services/customerService";

/**
 * CustomerRegisterPage — Trang đăng ký dành riêng cho Khách hàng
 * URL: /customer/register
 * Sau khi đăng ký thành công → tự động đăng nhập & redirect /account
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
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative p-6"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070')",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gray-900/60" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/80 text-white backdrop-blur-sm shadow-xl">
              <UtensilsCrossed size={32} />
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white drop-shadow-sm">ResManager</h1>
          <p className="text-gray-300 mt-2">Tạo tài khoản để tận hưởng đặc quyền thành viên</p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            Đăng ký tài khoản
          </h2>
          <p className="text-center text-gray-300 text-sm mb-8">
            Tích điểm thành viên, nhận ưu đãi độc quyền mỗi lần đặt bàn.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Họ tên */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">Họ và tên *</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-black/20 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-black/20 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">
                Số điện thoại <span className="text-gray-400 font-normal">(Tùy chọn)</span>
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setField("phone", e.target.value.replace(/[^0-9+]/g, "").replace(/(?!^\+)\+/g, ""))
                  }
                  placeholder="0912345678"
                  className="w-full bg-black/20 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">Mật khẩu * (ít nhất 6 ký tự)</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
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

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="text-white text-sm font-medium block mb-2">Xác nhận mật khẩu *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full bg-black/20 border border-white/20 rounded-xl pl-11 pr-11 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-white transition"
                  aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 hover:scale-[1.02] transition shadow-[0_0_20px_rgba(37,99,235,0.5)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang tạo tài khoản...
                </>
              ) : (
                "Đăng ký"
              )}
            </button>

            {/* Links */}
            <div className="text-center space-y-2 pt-2">
              <p className="text-gray-300 text-sm">
                Đã có tài khoản?{" "}
                <Link
                  to={`/customer/login?redirect=${encodeURIComponent(redirectParam)}`}
                  className="text-blue-300 font-bold hover:text-blue-200 underline transition"
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
