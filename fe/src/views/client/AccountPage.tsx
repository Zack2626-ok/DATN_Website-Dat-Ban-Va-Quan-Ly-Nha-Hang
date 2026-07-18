import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  User, Calendar, Award, PartyPopper, ClipboardList, Sparkles, LogOut, Loader2, Phone, Mail, Edit3, Key, Plus
} from "lucide-react";
import {
  getCustomerProfile, updateCustomerProfile, changeCustomerPassword,
  getMyBookings, cancelBooking, getCustomerLoyalty, getCustomerVouchers,
  getPublicHalls, getPublicEventPackages, createEventContract, getMyEventContracts
} from "../../services/customerService";

export const AccountPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "loyalty" | "events">("profile");

  // Authentication check
  const token = localStorage.getItem("customer_token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      toast.error("Bạn cần đăng nhập để truy cập trang này!");
      navigate("/customer/login", { replace: true });
    }
  }, [navigate, token]);

  // Queries
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: getCustomerProfile,
    enabled: !!token,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["customer-bookings"],
    queryFn: getMyBookings,
    enabled: !!token && activeTab === "bookings",
  });

  const { data: loyaltyData, isLoading: loadingLoyalty } = useQuery({
    queryKey: ["customer-loyalty"],
    queryFn: getCustomerLoyalty,
    enabled: !!token && activeTab === "loyalty",
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ["customer-vouchers"],
    queryFn: getCustomerVouchers,
    enabled: !!token && activeTab === "loyalty",
  });

  const { data: halls = [] } = useQuery({
    queryKey: ["public-halls"],
    queryFn: getPublicHalls,
    enabled: !!token && activeTab === "events",
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["public-packages"],
    queryFn: getPublicEventPackages,
    enabled: !!token && activeTab === "events",
  });

  const { data: eventContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["customer-contracts"],
    queryFn: getMyEventContracts,
    enabled: !!token && activeTab === "events",
  });

  // Mutators
  const updateProfileMutation = useMutation({
    mutationFn: updateCustomerProfile,
    onSuccess: (data) => {
      localStorage.setItem("customer_info", JSON.stringify(data));
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast.success("Cập nhật thông tin thành công!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cập nhật thất bại.");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeCustomerPassword,
    onSuccess: () => {
      toast.success("Thay đổi mật khẩu thành công!");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Đổi mật khẩu thất bại.");
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      toast.success("Hủy đặt bàn thành công!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Không thể hủy đặt bàn.");
    }
  });

  const createContractMutation = useMutation({
    mutationFn: createEventContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-contracts"] });
      toast.success("Gửi yêu cầu đặt tiệc sự kiện thành công!");
      setEventForm({
        hall_id: "",
        package_id: "",
        event_date: "",
        guest_count: 50,
        table_count: 5,
        note: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gửi yêu cầu thất bại.");
    }
  });

  // States for Forms
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [eventForm, setEventForm] = useState({
    hall_id: "",
    package_id: "",
    event_date: "",
    guest_count: 50,
    table_count: 5,
    note: "",
  });

  // Sync profile data to profile form when loaded
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_info");
    toast.success("Đăng xuất thành công!");
    window.location.href = "/";
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.phone && profileForm.phone.trim()) {
      const cleanedPhone = profileForm.phone.trim().replace(/[\s-]/g, '');
      const phoneRegex = /^(03|09)\d{8}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        toast.error("Số điện thoại không hợp lệ (bắt buộc 10 chữ số, bắt đầu bằng 03 hoặc 09)");
        return;
      }
    }
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Mật khẩu mới không khớp!");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự!");
      return;
    }
    changePasswordMutation.mutate({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
  };

  // Estimate cost for event package
  const selectedPackage = packages.find((p: any) => String(p.id) === eventForm.package_id);
  const estimatedCost = selectedPackage
    ? Number(selectedPackage.price_per_person) * eventForm.guest_count
    : 0;

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!eventForm.hall_id || !eventForm.event_date) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    createContractMutation.mutate({
      hall_id: Number(eventForm.hall_id),
      package_id: eventForm.package_id ? Number(eventForm.package_id) : null,
      contact_name: profile.name,
      contact_phone: profile.phone || "0900000000",
      event_date: eventForm.event_date,
      guest_count: Number(eventForm.guest_count),
      table_count: Number(eventForm.table_count),
      total_amount: estimatedCost,
      note: eventForm.note,
    });
  };

  // Member levels configurations for UI rendering
  const getLevelStyle = (level: string) => {
    switch (level?.toLowerCase()) {
      case "vip":
        return {
          bg: "bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700",
          badge: "bg-purple-500 text-white",
          text: "text-purple-200",
          cardTitle: "VIP MEMBER",
        };
      case "gold":
        return {
          bg: "bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-750",
          badge: "bg-amber-500 text-white",
          text: "text-amber-100",
          cardTitle: "GOLD MEMBER",
        };
      case "silver":
        return {
          bg: "bg-gradient-to-br from-slate-600 via-slate-400 to-slate-700",
          badge: "bg-slate-500 text-white",
          text: "text-slate-100",
          cardTitle: "SILVER MEMBER",
        };
      default: // bronze
        return {
          bg: "bg-gradient-to-br from-amber-800 via-orange-700 to-amber-900",
          badge: "bg-amber-700 text-white",
          text: "text-amber-200",
          cardTitle: "BRONZE MEMBER",
        };
    }
  };

  const levelConf = getLevelStyle(profile?.member_level || "bronze");

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-sky-50/50">
        <Loader2 size={36} className="animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50/50 pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* User Hero Banner */}
        <div className="bg-white rounded-3xl border border-sky-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center font-display font-black text-2xl">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "K"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800 font-display">{profile?.name}</h1>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${levelConf.badge}`}>
                  {profile?.member_level}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1"><Mail size={12} /> {profile?.email}</span>
                {profile?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {profile?.phone}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="bg-emerald-55/10 border border-emerald-500/20 text-emerald-700 rounded-2xl px-5 py-2.5 text-center flex-1 md:flex-none">
              <span className="text-[10px] font-bold text-emerald-500 uppercase block tracking-wider">Điểm thưởng</span>
              <span className="text-xl font-black block mt-0.5">{profile?.loyalty_points || 0} điểm</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Dashboard Tabs & Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left ${activeTab === "profile"
                ? "bg-blue-700 text-white shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-sky-100 border border-sky-100 text-slate-600"
                }`}
            >
              <User size={18} /> Hồ sơ cá nhân
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left ${activeTab === "bookings"
                ? "bg-blue-700 text-white shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-sky-100 border border-sky-100 text-slate-600"
                }`}
            >
              <Calendar size={18} /> Lịch sử đặt bàn
            </button>
            <button
              onClick={() => setActiveTab("loyalty")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left ${activeTab === "loyalty"
                ? "bg-blue-700 text-white shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-sky-100 border border-sky-100 text-slate-600"
                }`}
            >
              <Award size={18} /> Thẻ VIP & Tích điểm
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left ${activeTab === "events"
                ? "bg-blue-700 text-white shadow-md shadow-blue-500/10"
                : "bg-white hover:bg-sky-100 border border-sky-100 text-slate-600"
                }`}
            >
              <PartyPopper size={18} /> Yêu cầu đặt tiệc
            </button>
          </div>

          {/* Active Panel */}
          <div className="lg:col-span-3">

            {/* Tab 1: Profile */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-sky-100 p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 font-display mb-6 border-b border-gray-50 pb-4 flex items-center gap-2">
                    <Edit3 size={18} className="text-blue-700" /> Cập nhật hồ sơ
                  </h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Họ và tên</label>
                        <input
                          required
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Số điện thoại</label>
                        <input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, '') }))}
                          placeholder="Chưa cập nhật"
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {updateProfileMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      Lưu thay đổi
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-3xl border border-sky-100 p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 font-display mb-6 border-b border-gray-50 pb-4 flex items-center gap-2">
                    <Key size={18} className="text-blue-700" /> Đổi mật khẩu
                  </h2>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu cũ</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu mới</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {changePasswordMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      Đổi mật khẩu
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Tab 2: Bookings */}
            {activeTab === "bookings" && (
              <div className="bg-white rounded-3xl border border-sky-100 p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 font-display mb-6 border-b border-gray-50 pb-4">Lịch sử đặt bàn</h2>

                {loadingBookings ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 size={28} className="animate-spin text-blue-750" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-sm font-medium">Bạn chưa thực hiện đơn đặt bàn nào.</p>
                    <Link to="/booking" className="mt-4 inline-block text-sm text-blue-700 font-bold hover:underline">
                      Đặt bàn ngay bây giờ &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking: any) => {
                      const isCancellable = ["pending", "confirmed"].includes(booking.status);
                      return (
                        <div key={booking.id} className="border border-gray-150 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-xs transition-shadow">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-950 font-display">{booking.table_name || `Bàn ID: ${booking.table_id}`}</span>
                              <span className="text-xs text-gray-400">({booking.area_name || "Nhà hàng"})</span>
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${booking.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                booking.status === "cancelled" ? "bg-red-50 text-red-700" :
                                  booking.status === "confirmed" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                }`}>
                                {booking.status === "pending" ? "Chờ duyệt" :
                                  booking.status === "confirmed" ? "Đã xác nhận" :
                                    booking.status === "completed" ? "Hoàn thành" : "Đã hủy"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Mã đơn: <span className="font-bold text-slate-600">{booking.confirmation_code || `#${booking.id}`}</span> · Số khách: <span className="font-bold text-slate-600">{booking.party_size} khách</span>
                            </p>
                            <p className="text-xs text-slate-400">
                              Thời gian đến: <span className="font-bold text-slate-600">{new Date(booking.start_time).toLocaleString("vi-VN")}</span>
                            </p>
                          </div>
                          {isCancellable && (
                            <button
                              onClick={() => {
                                if (window.confirm("Bạn có chắc chắn muốn hủy đơn đặt bàn này không?")) {
                                  cancelBookingMutation.mutate(booking.id);
                                }
                              }}
                              disabled={cancelBookingMutation.isPending}
                              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Hủy đặt bàn
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Loyalty Card & History */}
            {activeTab === "loyalty" && (
              <div className="space-y-6 animate-fade-in">

                {/* Visual Glassmorphic Card */}
                <div className={`${levelConf.bg} rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden h-48 sm:h-56 flex flex-col justify-between border border-slate-200`}>
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <span className="text-[10px] tracking-widest font-black uppercase text-white/60 block">Loyalty Membership</span>
                      <span className="text-xl sm:text-2xl font-black font-display tracking-wide mt-1 block">{levelConf.cardTitle}</span>
                    </div>
                    <Sparkles size={28} className="text-white/40" />
                  </div>

                  <div className="z-10">
                    <span className="text-[10px] uppercase text-white/50 tracking-wider block">Mã số thẻ</span>
                    <span className="font-mono text-base tracking-widest block mt-0.5">RES-MEMBER-{profile?.id?.toString().padStart(6, "0")}</span>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-200 pt-3 z-10">
                    <div>
                      <span className="text-[9px] uppercase text-white/50 block">Chủ thẻ</span>
                      <span className="text-sm font-semibold block">{profile?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase text-white/50 block">Số điểm hiện tại</span>
                      <span className="text-lg font-black block">{profile?.loyalty_points || 0} PTS</span>
                    </div>
                  </div>
                </div>

                {/* Loyalty Transactions & Vouchers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Loyalty Transactions */}
                  <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 font-display mb-4">Lịch sử tích/đổi điểm</h3>

                    {loadingLoyalty ? (
                      <div className="flex justify-center items-center py-10">
                        <Loader2 size={24} className="animate-spin text-blue-700" />
                      </div>
                    ) : !loyaltyData?.transactions || loyaltyData.transactions.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">Chưa có giao dịch tích điểm nào.</p>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                        {loyaltyData.transactions.map((t: any) => (
                          <div key={t.id} className="flex justify-between items-center text-xs py-2 border-b border-gray-50 last:border-0">
                            <div>
                              <p className="font-bold text-slate-700">{t.note || (t.type === "earn" ? "Tích điểm hóa đơn" : "Đổi điểm quà tặng")}</p>
                              <span className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <span className={`font-black text-sm ${t.type === "earn" ? "text-emerald-600" : "text-red-500"}`}>
                              {t.type === "earn" ? "+" : "-"}{t.points} PTS
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vouchers lists */}
                  <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-800 font-display mb-4">Vouchers ưu đãi dành cho bạn</h3>

                    {vouchers.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">Hiện tại không có voucher khuyến mãi nào.</p>
                    ) : (
                      <div className="space-y-3">
                        {vouchers.map((v: any) => (
                          <div key={v.id} className="border border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/30 flex justify-between items-center">
                            <div>
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">{v.code}</span>
                              <p className="text-xs text-slate-600 font-bold mt-1.5">
                                Giảm {v.type === "percent" ? `${Number(v.value)}%` : `${Number(v.value).toLocaleString("vi-VN")}đ`}
                              </p>
                              <span className="text-[10px] text-gray-400 block mt-0.5">HSD: {new Date(v.expired_at).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(v.code);
                                toast.success("Đã sao chép mã voucher!");
                              }}
                              className="px-3 py-1 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold"
                            >
                              Sao chép
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* Tab 4: Event contract submissions */}
            {activeTab === "events" && (
              <div className="space-y-6 animate-fade-in">

                {/* Event Creation Form */}
                <div className="bg-white rounded-3xl border border-sky-100 p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 font-display mb-6 border-b border-gray-50 pb-4 flex items-center gap-2">
                    <Plus size={18} className="text-blue-700" /> Yêu cầu đặt tiệc sự kiện (Hội nghị, Cưới hỏi, Sinh nhật)
                  </h2>
                  <form onSubmit={handleCreateEvent} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn sảnh tiệc *</label>
                        <select
                          required
                          value={eventForm.hall_id}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, hall_id: e.target.value }))}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Chọn sảnh tiệc</option>
                          {halls.map((h: any) => (
                            <option key={h.id} value={h.id}>{h.name} (Sức chứa tối đa: {h.capacity} người)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chọn Gói Set Menu Tiệc</label>
                        <select
                          value={eventForm.package_id}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, package_id: e.target.value }))}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Không chọn (Tự thiết kế / Báo giá sau)</option>
                          {packages.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} ({Number(p.price_per_person).toLocaleString("vi-VN")}đ/khách)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ngày diễn ra sự kiện *</label>
                        <input
                          required
                          type="date"
                          value={eventForm.event_date}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Số khách dự kiến *</label>
                          <input
                            required
                            type="number"
                            value={eventForm.guest_count}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, guest_count: Math.max(1, Number(e.target.value)) }))}
                            className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Số bàn dự kiến *</label>
                          <input
                            required
                            type="number"
                            value={eventForm.table_count}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, table_count: Math.max(1, Number(e.target.value)) }))}
                            className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ghi chú yêu cầu sự kiện</label>
                        <textarea
                          value={eventForm.note}
                          onChange={(e) => setEventForm((prev) => ({ ...prev, note: e.target.value }))}
                          rows={3}
                          placeholder="Yêu cầu riêng về trang trí, thiết bị âm thanh, ánh sáng, hoặc các món ăn ngoài set menu..."
                          className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Estimate panel */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex justify-between items-center text-sm font-semibold">
                      <span className="text-blue-800">Chi phí dự kiến tạm tính:</span>
                      <span className="text-xl font-black text-blue-700">
                        {estimatedCost > 0 ? `${estimatedCost.toLocaleString("vi-VN")}đ` : "Báo giá cụ thể sau"}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={createContractMutation.isPending}
                      className="px-6 py-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {createContractMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      Gửi yêu cầu đặt tiệc
                    </button>
                  </form>
                </div>

                {/* Event Contracts History */}
                <div className="bg-white rounded-3xl border border-sky-100 p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 font-display mb-6 border-b border-gray-50 pb-4">
                    Lịch sử yêu cầu & Hợp đồng đặt tiệc
                  </h2>

                  {loadingContracts ? (
                    <div className="flex justify-center py-10">
                      <Loader2 size={24} className="animate-spin text-blue-750" />
                    </div>
                  ) : eventContracts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Bạn chưa gửi yêu cầu đặt tiệc sự kiện nào.</p>
                  ) : (
                    <div className="space-y-4">
                      {eventContracts.map((c: any) => (
                        <div key={c.id} className="border border-sky-100 rounded-2xl p-5 hover:shadow-xs transition-shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-950 text-sm flex items-center gap-2">
                                {c.hall_name || `Sảnh ID: ${c.hall_id}`}
                                <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${c.status === "confirmed" ? "bg-blue-50 text-blue-700" :
                                  c.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                    c.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-sky-100 text-slate-500"
                                  }`}>
                                  {c.status === "draft" ? "Yêu cầu nháp" :
                                    c.status === "confirmed" ? "Đã xác nhận" :
                                      c.status === "completed" ? "Hoàn thành" : "Đã hủy"}
                                </span>
                              </h4>
                              <p className="text-xs text-slate-400 mt-1">
                                Gói phục vụ: <span className="font-bold text-slate-600">{c.package_name || "Báo giá sau"}</span> · Số khách: <span className="font-bold text-slate-600">{c.guest_count} người</span>
                              </p>
                              <p className="text-xs text-slate-400">
                                Ngày tổ chức: <span className="font-bold text-slate-600">{new Date(c.event_date).toLocaleDateString("vi-VN")}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-gray-400 block">Tổng chi phí</span>
                              <span className="font-black text-sm text-blue-700">
                                {Number(c.total_amount) > 0 ? `${Number(c.total_amount).toLocaleString("vi-VN")}đ` : "Báo giá sau"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
