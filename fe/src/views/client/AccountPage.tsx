import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { 
  User, Calendar, Award, ClipboardList, Sparkles, LogOut, Loader2, Phone, Mail, Edit3, Key, Star, X
} from "lucide-react";
import { 
  getCustomerProfile, updateCustomerProfile, changeCustomerPassword, 
  getMyBookings, cancelBooking, getCustomerLoyalty, getCustomerVouchers, 
  redeemVoucher, getMyUnusedVouchers, submitBookingReview
} from "../../services/customerService";

export const AccountPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "loyalty">("profile");

  // Authentication check
  const token = localStorage.getItem("customer_token");
  useEffect(() => {
    if (!token) {
      toast.error("Bạn cần đăng nhập để truy cập trang này!");
      window.location.href = "/customer/login";
    }
  }, [token]);

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

  const { data: myVouchers = [], isLoading: loadingMyVouchers } = useQuery({
    queryKey: ["customer-my-unused-vouchers"],
    queryFn: getMyUnusedVouchers,
    enabled: !!token && activeTab === "loyalty",
    refetchInterval: 15000,
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

  const redeemVoucherMutation = useMutation({
    mutationFn: redeemVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["customer-loyalty"] });
      queryClient.invalidateQueries({ queryKey: ["customer-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-my-unused-vouchers"] });
      toast.success("Đổi voucher thành công!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Đổi voucher thất bại.");
    }
  });

  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    bookingId: number | null;
    tableInfo: string;
    rating: number;
    comment: string;
  }>({
    isOpen: false,
    bookingId: null,
    tableInfo: "",
    rating: 5,
    comment: "",
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { bookingId: number; rating: number; comment?: string }) =>
      submitBookingReview(payload.bookingId, { rating: payload.rating, comment: payload.comment }),
    onSuccess: (data: any) => {
      toast.success(`🎉 ${data.message || "Đã gửi đánh giá thành công (+30 PTS)!"}`);
      setReviewModal({ isOpen: false, bookingId: null, tableInfo: "", rating: 5, comment: "" });
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      queryClient.invalidateQueries({ queryKey: ["customer-loyalty"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Không thể gửi đánh giá lúc này.");
    },
  });

  // States for Forms
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });

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

  /** Derives the displayed membership level from the customer's current points. */
  const getMemberLevelFromPoints = (points: number): "bronze" | "silver" | "gold" | "vip" => {
    if (points >= 20000) return "vip";
    if (points >= 8000) return "gold";
    if (points >= 2000) return "silver";
    return "bronze";
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
          bg: "bg-gradient-to-br from-[#dfb05b] via-[#c99c4c] to-[#a72d1e]",
          badge: "bg-client-secondary text-client-text",
          text: "text-amber-100",
          cardTitle: "GOLD MEMBER",
        };
      case "silver":
        return {
          bg: "bg-gradient-to-br from-slate-600 via-slate-500 to-slate-800",
          badge: "bg-slate-500 text-white",
          text: "text-slate-100",
          cardTitle: "SILVER MEMBER",
        };
      default: // bronze
        return {
          bg: "bg-gradient-to-br from-[#8e2316] via-[#a72d1e] to-[#2a221c]",
          badge: "bg-client-primary text-white",
          text: "text-[#f0eae1]",
          cardTitle: "BRONZE MEMBER",
        };
    }
  };

  const displayedMemberLevel = getMemberLevelFromPoints(profile?.loyalty_points ?? 0);
  const levelConf = getLevelStyle(displayedMemberLevel);

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-client-bg">
        <Loader2 size={36} className="animate-spin text-client-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-client-bg pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* User Hero Banner */}
        <div className="bg-white rounded-3xl border border-client-accent p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-client-primary/10 text-client-primary rounded-2xl flex items-center justify-center font-display font-black text-2xl">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "K"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-client-text font-display">{profile?.name}</h1>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${levelConf.badge}`}>
                  {displayedMemberLevel}
                </span>
              </div>
              <p className="text-xs text-client-muted mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1"><Mail size={12} /> {profile?.email}</span>
                {profile?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {profile?.phone}</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="bg-emerald-50/10 border border-emerald-500/20 text-emerald-700 rounded-2xl px-5 py-2.5 text-center flex-1 md:flex-none">
              <span className="text-[10px] font-bold text-emerald-500 uppercase block tracking-wider">Điểm thưởng</span>
              <span className="text-xl font-black block mt-0.5">{profile?.loyalty_points || 0} điểm</span>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-650 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
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
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "profile" 
                  ? "bg-client-primary text-white shadow-md animate-slide-in" 
                  : "bg-white hover:bg-client-accent border border-client-accent text-client-text"
              }`}
            >
              <User size={18} /> Hồ sơ cá nhân
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "bookings" 
                  ? "bg-client-primary text-white shadow-md animate-slide-in" 
                  : "bg-white hover:bg-client-accent border border-client-accent text-client-text"
              }`}
            >
              <Calendar size={18} /> Lịch sử đặt bàn
            </button>
            <button
              onClick={() => setActiveTab("loyalty")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all text-left cursor-pointer ${
                activeTab === "loyalty" 
                  ? "bg-client-primary text-white shadow-md animate-slide-in" 
                  : "bg-white hover:bg-client-accent border border-client-accent text-client-text"
              }`}
            >
              <Award size={18} /> Thẻ VIP & Tích điểm
            </button>
          </div>

          {/* Active Panel */}
          <div className="lg:col-span-3">
            
            {/* Tab 1: Profile */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-client-accent p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-client-text font-display mb-6 border-b border-[#f0eae1] pb-4 flex items-center gap-2">
                    <Edit3 size={18} className="text-client-primary" /> Cập nhật hồ sơ
                  </h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Họ và tên</label>
                        <input
                          required
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Số điện thoại</label>
                        <input
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, '') }))}
                          placeholder="Chưa cập nhật"
                          className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-6 py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {updateProfileMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      Lưu thay đổi
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-3xl border border-client-accent p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-client-text font-display mb-6 border-b border-[#f0eae1] pb-4 flex items-center gap-2">
                    <Key size={18} className="text-client-primary" /> Đổi mật khẩu
                  </h2>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Mật khẩu cũ</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                          className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Mật khẩu mới</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Xác nhận mật khẩu</label>
                        <input
                          required
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="px-6 py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
              <div className="bg-white rounded-3xl border border-client-accent p-8 shadow-sm">
                <h2 className="text-lg font-bold text-client-text font-display mb-6 border-b border-[#f0eae1] pb-4">Lịch sử đặt bàn</h2>
                
                {loadingBookings ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 size={28} className="animate-spin text-client-primary" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-16 text-client-muted">
                    <ClipboardList size={48} className="mx-auto mb-4 text-[#7b6f65]/40" />
                    <p className="text-sm font-semibold">Bạn chưa thực hiện đơn đặt bàn nào.</p>
                    <Link to="/booking" className="mt-4 inline-block text-sm text-client-primary font-bold hover:underline">
                      Đặt bàn ngay bây giờ &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...bookings]
                      .sort((a: any, b: any) => {
                        const getPriority = (status: string) => {
                          if (status === "confirmed") return 1;
                          if (status === "pending") return 2;
                          if (status === "completed") return 3;
                          if (status === "cancelled") return 4;
                          return 5;
                        };
                        const pA = getPriority(a.status);
                        const pB = getPriority(b.status);
                        if (pA !== pB) return pA - pB;
                        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
                      })
                      .map((booking: any) => {
                        const isCancellable = ["pending", "confirmed"].includes(booking.status);
                        return (
                          <div key={booking.id} className="border border-gray-150 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-xs transition-shadow">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-950 font-display">{booking.table_name || `Bàn ID: ${booking.table_id}`}</span>
                                <span className="text-xs text-gray-400">({booking.area_name || "Nhà hàng"})</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  booking.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                                  booking.status === "cancelled" ? "bg-red-50 text-red-700" :
                                  booking.status === "confirmed" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                }`}>
                                  {booking.status === "pending" ? "Chờ nhà hàng xác nhận" :
                                   booking.status === "confirmed" ? "Đã xác nhận đặt bàn" :
                                   booking.status === "completed" ? "Đã hoàn thành" : "Đã hủy"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Mã đơn: <span className="font-bold text-slate-600">{booking.confirmation_code || `#${booking.id}`}</span> · Số khách: <span className="font-bold text-slate-600">{booking.party_size} khách</span>
                              </p>
                              <p className="text-xs text-slate-400">
                                Thời gian đến: <span className="font-bold text-slate-600">{new Date(booking.start_time).toLocaleString("vi-VN")}</span>
                              </p>
                              {booking.status === "pending" && (
                                <p className="text-[11px] text-amber-700 font-medium">
                                  ↳ Nhà hàng đã tiếp nhận thông tin và đang kiểm tra xếp bàn cho bạn.
                                </p>
                              )}
                            </div>
                            {isCancellable && (
                              <button
                                onClick={() => {
                                  if (window.confirm("Bạn có chắc chắn muốn hủy đơn đặt bàn này không?")) {
                                    cancelBookingMutation.mutate(booking.id);
                                  }
                                }}
                                disabled={cancelBookingMutation.isPending}
                                className="px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Hủy đặt bàn
                              </button>
                            )}

                            {booking.status === "completed" && (
                              <div>
                                {booking.is_reviewed ? (
                                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold">
                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                    <span>Đã đánh giá ({booking.review_rating || 5}★)</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setReviewModal({
                                        isOpen: true,
                                        bookingId: booking.id,
                                        tableInfo: `${booking.table_name || `Bàn ID: ${booking.table_id}`} · ${new Date(booking.start_time).toLocaleDateString("vi-VN")}`,
                                        rating: 5,
                                        comment: "",
                                      })
                                    }
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                                  >
                                    <Star size={14} className="fill-white text-white" />
                                    <span>Đánh giá bữa ăn (+30 PTS)</span>
                                  </button>
                                )}
                              </div>
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

                  <div className="flex justify-between items-end border-t border-slate-200/30 pt-3 z-10">
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

                {/* Tier Progress Section */}
                {(() => {
                  const pts = profile?.loyalty_points || 0;
                  const tiers = [
                    { key: "bronze", label: "Bronze", min: 0,     max: 2000,  color: "from-[#a72d1e] to-[#8e2316]",  dot: "bg-[#a72d1e]",     badge: "bg-[#a72d1e]/10 text-[#a72d1e]",    bar: "bg-[#a72d1e]" },
                    { key: "silver", label: "Silver", min: 2000,  max: 8000,  color: "from-slate-400 to-slate-600",   dot: "bg-slate-500",      badge: "bg-slate-100 text-slate-600",        bar: "bg-slate-500" },
                    { key: "gold",   label: "Gold",   min: 8000,  max: 20000, color: "from-amber-400 to-amber-600",   dot: "bg-amber-500",      badge: "bg-amber-50 text-amber-700",         bar: "bg-amber-500" },
                    { key: "vip",    label: "VIP",    min: 20000, max: 20000, color: "from-purple-500 to-indigo-700", dot: "bg-purple-600",     badge: "bg-purple-100 text-purple-700",      bar: "bg-purple-600" },
                  ];
                  const currentTierIdx = pts >= 20000 ? 3 : pts >= 8000 ? 2 : pts >= 2000 ? 1 : 0;
                  const currentTier = tiers[currentTierIdx];
                  const nextTier = tiers[currentTierIdx + 1];
                  const progressPct = nextTier
                    ? Math.min(100, Math.round(((pts - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
                    : 100;
                  const ptsToNext = nextTier ? Math.max(0, nextTier.min - pts) : 0;

                  return (
                    <div className="bg-white rounded-3xl border border-client-accent p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                        <h3 className="text-base font-bold text-client-text font-display flex items-center gap-2">
                          <Sparkles size={16} className="text-client-primary" />
                          Lộ trình thăng hạng thành viên
                        </h3>
                        <span className="text-xs text-client-muted font-medium bg-client-accent/30 px-3 py-1 rounded-xl">
                          1,000đ thanh toán = 1 điểm
                        </span>
                        {nextTier ? (
                          <span className="text-xs text-client-muted font-semibold">
                            Cần thêm <span className="text-client-primary font-black">{ptsToNext.toLocaleString("vi-VN")} điểm</span> để lên <span className="font-black">{nextTier.label}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-black text-purple-600">🏆 Đã đạt hạng cao nhất!</span>
                        )}
                      </div>

                      {/* 4-tier milestone track */}
                      <div className="relative">
                        {/* Overall progress bar background */}
                        <div className="flex items-center gap-0 mb-3">
                          {tiers.map((tier, idx) => {
                            const isReached = pts >= tier.min;
                            const isCurrent = idx === currentTierIdx;
                            return (
                              <React.Fragment key={tier.key}>
                                {/* Segment bar between tiers */}
                                {idx > 0 && (
                                  <div className="flex-1 h-2.5 rounded-full bg-client-accent mx-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${
                                        pts >= tier.min
                                          ? tier.bar
                                          : isCurrent || idx === currentTierIdx + 1
                                          ? `${tier.bar} opacity-40`
                                          : ""
                                      }`}
                                      style={{
                                        width: pts >= tier.min
                                          ? "100%"
                                          : idx === currentTierIdx + 1
                                          ? `${progressPct}%`
                                          : "0%",
                                      }}
                                    />
                                  </div>
                                )}
                                {/* Tier dot */}
                                <div className="flex flex-col items-center shrink-0">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                    isReached
                                      ? `${tier.dot} border-transparent`
                                      : "bg-white border-client-accent"
                                  } ${isCurrent ? "ring-2 ring-offset-2 ring-client-primary/30 scale-110" : ""} transition-all`}>
                                    {isReached && <span className="text-white text-[9px] font-black">✓</span>}
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Labels */}
                        <div className="flex items-start">
                          {tiers.map((tier, idx) => (
                            <React.Fragment key={tier.key}>
                              {idx > 0 && <div className="flex-1" />}
                              <div className="flex flex-col items-center shrink-0" style={{ minWidth: 48 }}>
                                <span className={`text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-1 ${tier.badge}`}>
                                  {tier.label}
                                </span>
                                <span className="text-[9px] text-client-muted mt-0.5 text-center">
                                  {tier.min === 0 ? "0 pts" : `${tier.min.toLocaleString("vi-VN")} pts`}
                                </span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Current status */}
                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {tiers.map((tier) => {
                          const reached = pts >= tier.min;
                          const isCurrent = tier.key === currentTier.key;
                          return (
                            <div key={tier.key} className={`rounded-2xl p-3 border text-center transition-all ${
                              isCurrent
                                ? "border-client-primary/30 bg-client-primary/5 shadow-sm"
                                : reached
                                ? "border-client-accent bg-client-bg"
                                : "border-client-accent bg-white opacity-50"
                            }`}>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${tier.badge}`}>
                                {tier.label}
                              </span>
                              <p className="text-[9px] text-client-muted mt-1.5 leading-tight">
                                {tier.min === 0 ? "Mặc định" : `Từ ${tier.min.toLocaleString("vi-VN")} điểm`}
                              </p>
                              {isCurrent && (
                                <span className="text-[9px] font-bold text-client-primary block mt-1">✦ Hạng hiện tại</span>
                              )}
                              {reached && !isCurrent && (
                                <span className="text-[9px] font-bold text-emerald-600 block mt-1">✓ Đã đạt</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Loyalty Transactions & Vouchers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Loyalty Transactions */}
                  <div className="bg-white rounded-3xl border border-client-accent p-6 shadow-sm min-h-[540px] flex flex-col">
                    <h3 className="text-base font-bold text-client-text font-display mb-4">Lịch sử tích/đổi điểm</h3>
                    
                    {loadingLoyalty ? (
                      <div className="flex justify-center items-center py-10">
                        <Loader2 size={24} className="animate-spin text-client-primary" />
                      </div>
                    ) : !loyaltyData?.transactions || loyaltyData.transactions.length === 0 ? (
                      <p className="text-xs text-client-muted text-center py-8">Chưa có giao dịch tích điểm nào.</p>
                    ) : (
                      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
                        {loyaltyData.transactions.map((t) => (
                          <div key={t.id} className="flex justify-between items-center text-xs py-2 border-b border-client-accent last:border-0">
                            <div>
                              <p className="font-bold text-client-text">{t.note || (t.type === "earn" ? "Tích điểm hóa đơn" : "Đổi điểm quà tặng")}</p>
                              <span className="text-[10px] text-client-muted">{new Date(t.created_at).toLocaleDateString("vi-VN")}</span>
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
                  <div className="bg-white rounded-3xl border border-client-accent p-6 shadow-sm min-h-[540px] flex flex-col gap-6">
                    {/* Section A: Vouchers đã đổi */}
                    <div>
                      <h3 className="text-base font-bold text-client-text font-display mb-3 flex items-center gap-1.5">
                        <Award size={16} className="text-client-primary" />
                        Vouchers đã đổi của bạn
                      </h3>
                      
                      {loadingMyVouchers ? (
                        <div className="flex justify-center items-center py-4">
                          <Loader2 size={18} className="animate-spin text-client-primary" />
                        </div>
                      ) : myVouchers.length === 0 ? (
                        <p className="text-xs text-client-muted italic text-center py-4 bg-client-bg rounded-xl border border-dashed border-client-accent">
                          Bạn chưa đổi voucher nào. Hãy dùng điểm tích lũy để đổi bên dưới!
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                          {myVouchers.map((v) => (
                            <div key={v.customer_voucher_id} className="border border-dashed border-client-secondary rounded-xl p-3 bg-client-bg flex justify-between items-center">
                              <div>
                                <span className="bg-client-primary/10 text-client-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">{v.code}</span>
                                <p className="text-xs text-client-text font-bold mt-1.5">
                                  {v.type === "percent" ? `Giảm ${Number(v.value)}%` : `Giảm ${Number(v.value).toLocaleString("vi-VN")}đ`}
                                </p>
                                <span className="text-[9px] text-client-muted block mt-0.5">HSD: {v.expired_at ? new Date(v.expired_at).toLocaleDateString("vi-VN") : "Không giới hạn"}</span>
                                <span className="text-[9px] text-slate-500 block">Đơn tối thiểu: {Number(v.min_order || 0).toLocaleString("vi-VN")}đ</span>
                              </div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 font-bold uppercase">Sẵn sàng sử dụng</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section B: Vouchers có thể đổi */}
                    <div>
                      <h3 className="text-base font-bold text-client-text font-display mb-3 flex items-center gap-1.5">
                        <Sparkles size={16} className="text-amber-500" />
                        Đổi điểm nhận Voucher ưu đãi
                      </h3>
                      
                      {vouchers.length === 0 ? (
                        <p className="text-xs text-client-muted italic text-center py-4 bg-client-bg rounded-xl border border-dashed border-client-accent">
                          Hiện không có voucher ưu đãi nào.
                        </p>
                      ) : (
                        <div className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
                          {vouchers.map((v: any) => {
                            const cost = Number(v.points_cost || 0);
                            const userPoints = Number(profile?.loyalty_points || 0);
                            const canAfford = userPoints >= cost;
                            const canRedeem = v.is_unlocked && !v.is_redeemed && canAfford;
                            return (
                              <div key={v.id} className={`border border-dashed rounded-xl p-3 transition-all flex justify-between items-center ${v.is_unlocked ? "border-slate-200 bg-white hover:bg-slate-50/50" : "border-client-accent bg-client-bg opacity-70"}`}>
                                <div>
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">{v.code}</span>
                                  {v.required_member_level && <span className="ml-1.5 text-[9px] font-bold text-client-primary uppercase">{v.required_member_level}</span>}
                                  <p className="text-xs text-client-text font-bold mt-1.5">
                                    {v.name || (v.type === "percent" ? `Giảm ${Number(v.value)}%` : `Giảm ${Number(v.value).toLocaleString("vi-VN")}đ`)}
                                  </p>
                                  {v.min_order !== undefined && (
                                    <p className="text-[10px] text-client-muted mt-0.5">
                                      Đơn tối thiểu: <span className="font-semibold text-slate-700">{Number(v.min_order).toLocaleString("vi-VN")}đ</span>
                                    </p>
                                  )}
                                  <span className="text-[9px] text-client-muted block mt-0.5">Yêu cầu: <strong className="text-amber-600 font-bold">{cost} điểm</strong></span>
                                  {!v.is_unlocked && v.required_member_level && <span className="text-[9px] text-client-muted block mt-0.5">Mở khóa khi đạt hạng {String(v.required_member_level).toUpperCase()}.</span>}
                                  {v.is_redeemed && <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Đã đổi — mỗi hạng chỉ một voucher.</span>}
                                </div>
                                <button
                                  disabled={redeemVoucherMutation.isPending || !canRedeem}
                                  onClick={() => {
                                    if (!v.is_unlocked || v.is_redeemed) return;
                                    if (!canAfford) {
                                      toast.error(`Bạn không đủ điểm để đổi voucher này (Cần ${cost} điểm, hiện có ${userPoints} điểm).`);
                                      return;
                                    }
                                    if (window.confirm(`Đổi ${cost} điểm tích lũy lấy voucher ${v.code}?`)) {
                                      redeemVoucherMutation.mutate(v.id);
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                    canRedeem
                                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                  }`}
                                >
                                  {redeemVoucherMutation.isPending
                                    ? "Đang xử lý..."
                                    : v.is_redeemed
                                    ? "Đã đổi"
                                    : !v.is_unlocked
                                    ? "Chưa mở khóa"
                                    : canAfford
                                    ? `Đổi (${cost} điểm)`
                                    : `Thiếu ${cost - userPoints} điểm`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-sky-100 animate-scale-up">
            <div className="p-6 border-b border-sky-100 flex justify-between items-center bg-sky-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Star className="text-amber-500 fill-amber-500" size={18} />
                  Đánh giá chất lượng bữa ăn
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{reviewModal.tableInfo}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal({ isOpen: false, bookingId: null, tableInfo: "", rating: 5, comment: "" })}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reviewModal.bookingId) {
                  reviewMutation.mutate({
                    bookingId: reviewModal.bookingId,
                    rating: reviewModal.rating,
                    comment: reviewModal.comment,
                  });
                }
              }}
              className="p-6 space-y-5"
            >
              <div className="text-center space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Bạn cảm thấy bữa ăn như thế nào? *
                </label>
                <div className="flex justify-center items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModal((prev) => ({ ...prev, rating: star }))}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={
                          star <= reviewModal.rating
                            ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                            : "text-gray-200 fill-gray-100"
                        }
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-600 block">
                  {reviewModal.rating === 5 ? "Rất tuyệt vời (5/5)" :
                   reviewModal.rating === 4 ? "Hài lòng (4/5)" :
                   reviewModal.rating === 3 ? "Bình thường (3/5)" :
                   reviewModal.rating === 2 ? "Chưa tốt (2/5)" : "Tệ (1/5)"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Ý kiến nhận xét / Góp ý
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Hãy chia sẻ trải nghiệm về món ăn, không gian, hoặc thái độ phục vụ..."
                  className="w-full rounded-2xl border border-sky-200 p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2 text-xs text-amber-800 font-medium">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>Hoàn tất đánh giá nhận ngay <strong className="font-extrabold text-amber-700">+30 PTS</strong> điểm tích lũy thưởng!</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, bookingId: null, tableInfo: "", rating: 5, comment: "" })}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {reviewMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Gửi đánh giá (+30 PTS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
