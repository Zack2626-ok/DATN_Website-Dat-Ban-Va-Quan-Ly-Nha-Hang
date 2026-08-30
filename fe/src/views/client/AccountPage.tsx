import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  User, Calendar, Award, ClipboardList, Sparkles, LogOut, Loader2, Phone, Mail, Edit3, Key, Star, X,
  Eye, EyeOff, AlertCircle, AlertTriangle, Clock, MapPin, Users, UtensilsCrossed, FileText,
  MessageSquareQuote, ShieldAlert, Copy, Info, CheckCircle, Utensils, ShieldCheck, Crown, ChevronRight, Check,
  Lock, CalendarX, MoreHorizontal
} from "lucide-react";
import {
  getCustomerProfile, updateCustomerProfile, changeCustomerPassword,
  getMyBookings, cancelBooking, updateBookingContact, getCustomerLoyalty, getCustomerVouchers,
  redeemVoucher, getMyUnusedVouchers, submitBookingReview
} from "../../services/customerService";

export const AccountPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "loyalty">(() => {
    if (tabParam === "bookings" || tabParam === "loyalty" || tabParam === "profile") {
      return tabParam;
    }
    return "profile";
  });

  // Action menu dropdown state for booking cards
  const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setActiveActionMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "bookings" || currentTab === "loyalty" || currentTab === "profile") {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "profile" | "bookings" | "loyalty") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
    mutationFn: (payload: { id: number; reason?: string }) => cancelBooking(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      toast.success("Hủy đơn đặt bàn thành công!");
      setCancelModal({
        isOpen: false,
        booking: null,
        reason: "Bận việc đột xuất / Thay đổi lịch trình",
        customReason: "",
        agreePolicy: false,
      });
      setDetailModal({ isOpen: false, booking: null });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Không thể hủy đặt bàn lúc này.");
    }
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { guest_name: string; guest_phone: string; guest_email?: string; guest_note?: string } }) =>
      updateBookingContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      toast.success("Cập nhật thông tin người đặt bàn thành công!");
      setEditContactModal((prev) => ({ ...prev, isOpen: false, booking: null }));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Cập nhật thông tin thất bại.");
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

  // Detail Modal State
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    booking: any | null;
  }>({
    isOpen: false,
    booking: null,
  });

  // Edit Contact Info Modal State
  const [editContactModal, setEditContactModal] = useState<{
    isOpen: boolean;
    booking: any | null;
    name: string;
    phone: string;
    email: string;
    note: string;
    errors: { name?: string; phone?: string; email?: string };
    touched: { name?: boolean; phone?: boolean; email?: boolean };
  }>({
    isOpen: false,
    booking: null,
    name: "",
    phone: "",
    email: "",
    note: "",
    errors: {},
    touched: {},
  });

  // View Review Modal State
  const [viewReviewModal, setViewReviewModal] = useState<{
    isOpen: boolean;
    booking: any | null;
  }>({
    isOpen: false,
    booking: null,
  });

  // Cancel Booking Modal State with enhanced validation & policy check
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    booking: any | null;
    reason: string;
    customReason: string;
    agreePolicy: boolean;
  }>({
    isOpen: false,
    booking: null,
    reason: "Bận việc đột xuất / Thay đổi lịch trình",
    customReason: "",
    agreePolicy: false,
  });

  // Submit Review Modal State
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
      if (detailModal.isOpen && detailModal.booking) {
        setDetailModal((prev) => ({
          ...prev,
          booking: {
            ...prev.booking,
            is_reviewed: 1,
            review_rating: data.data?.rating || 5,
            review_comment: data.data?.comment || "",
            review_created_at: new Date().toISOString(),
          },
        }));
      }
      setViewReviewModal({ isOpen: false, booking: null });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Không thể gửi đánh giá lúc này.");
    },
  });

  // States for Forms & Password visibility
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Filter state for Bookings history
  const [bookingStatusFilter, setBookingStatusFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");

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

  // States for Profile Validation
  const [profileErrors, setProfileErrors] = useState<{ name?: string; phone?: string }>({});
  const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});

  const validateProfileField = (field: "name" | "phone", value: string) => {
    let err = "";
    if (field === "name") {
      if (!value || !value.trim()) {
        err = "Vui lòng nhập họ và tên của bạn";
      } else if (value.trim().length < 2) {
        err = "Họ và tên tối thiểu từ 2 ký tự";
      }
    }
    if (field === "phone") {
      if (!value || !value.trim()) {
        err = "Vui lòng nhập số điện thoại liên hệ";
      } else {
        const cleaned = value.trim().replace(/[\s-]/g, "");
        const phoneRegex = /^(03|05|07|08|09|\+84[3|5|7|8|9])\d{8}$/;
        if (!phoneRegex.test(cleaned)) {
          err = "Số điện thoại không hợp lệ (10 chữ số, bắt đầu 03, 05, 07, 08, 09)";
        }
      }
    }
    return err;
  };

  const validateAllProfile = (formData: { name: string; phone: string }) => {
    const errs: { name?: string; phone?: string } = {};
    const nameErr = validateProfileField("name", formData.name);
    const phoneErr = validateProfileField("phone", formData.phone);
    if (nameErr) errs.name = nameErr;
    if (phoneErr) errs.phone = phoneErr;
    return errs;
  };

  const handleProfileBlur = (field: "name" | "phone") => {
    setProfileTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateProfileField(field, profileForm[field]);
    setProfileErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleProfileChange = (field: "name" | "phone", value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (profileTouched[field]) {
      const err = validateProfileField(field, value);
      setProfileErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  // States for Password Validation
  const [passwordErrors, setPasswordErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});

  const validatePasswordField = (
    field: "oldPassword" | "newPassword" | "confirmPassword",
    formData: { oldPassword?: string; newPassword?: string; confirmPassword?: string }
  ) => {
    let err = "";
    if (field === "oldPassword") {
      if (!formData.oldPassword) {
        err = "Vui lòng nhập mật khẩu hiện tại";
      }
    }
    if (field === "newPassword") {
      if (!formData.newPassword) {
        err = "Vui lòng nhập mật khẩu mới";
      } else if (formData.newPassword.length < 6) {
        err = "Mật khẩu mới phải có tối thiểu 6 ký tự";
      } else if (formData.oldPassword && formData.newPassword === formData.oldPassword) {
        err = "Mật khẩu mới không được trùng với mật khẩu hiện tại";
      }
    }
    if (field === "confirmPassword") {
      if (!formData.confirmPassword) {
        err = "Vui lòng xác nhận lại mật khẩu mới";
      } else if (formData.newPassword && formData.confirmPassword !== formData.newPassword) {
        err = "Mật khẩu xác nhận không khớp với mật khẩu mới";
      }
    }
    return err;
  };

  const validateAllPassword = (formData: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    const errs: { oldPassword?: string; newPassword?: string; confirmPassword?: string } = {};
    const oldErr = validatePasswordField("oldPassword", formData);
    const newErr = validatePasswordField("newPassword", formData);
    const confErr = validatePasswordField("confirmPassword", formData);
    if (oldErr) errs.oldPassword = oldErr;
    if (newErr) errs.newPassword = newErr;
    if (confErr) errs.confirmPassword = confErr;
    return errs;
  };

  const handlePasswordBlur = (field: "oldPassword" | "newPassword" | "confirmPassword") => {
    setPasswordTouched((prev) => ({ ...prev, [field]: true }));
    const err = validatePasswordField(field, passwordForm);
    setPasswordErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handlePasswordChange = (field: "oldPassword" | "newPassword" | "confirmPassword", value: string) => {
    const updated = { ...passwordForm, [field]: value };
    setPasswordForm(updated);
    if (passwordTouched[field]) {
      const err = validatePasswordField(field, updated);
      setPasswordErrors((prev) => ({ ...prev, [field]: err }));
    }
    if (field === "newPassword" && passwordTouched.confirmPassword) {
      const confErr = validatePasswordField("confirmPassword", updated);
      setPasswordErrors((prev) => ({ ...prev, confirmPassword: confErr }));
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileTouched({ name: true, phone: true });
    const errs = validateAllProfile(profileForm);
    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin hồ sơ");
      return;
    }
    updateProfileMutation.mutate(profileForm);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched({ oldPassword: true, newPassword: true, confirmPassword: true });
    const errs = validateAllPassword(passwordForm);
    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Vui lòng kiểm tra lại thông tin đổi mật khẩu");
      return;
    }
    changePasswordMutation.mutate({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
  };

  /** Derives the displayed membership level from the customer's current points. */
  const getMemberLevelFromPoints = (points: number): "bronze" | "silver" | "gold" | "diamond" => {
    if (points >= 20000) return "diamond";
    if (points >= 8000) return "gold";
    if (points >= 2000) return "silver";
    return "bronze";
  };

  // Member levels configurations for UI rendering
  const getLevelStyle = (level: string) => {
    switch (level?.toLowerCase()) {
      case "diamond":
        return {
          bg: "bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-950",
          badge: "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm border border-purple-300/40",
          text: "text-purple-200",
          cardTitle: "DIAMOND VIP",
        };
      case "gold":
        return {
          bg: "bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-700",
          badge: "bg-gradient-to-r from-[#dfb05b] to-[#b8860b] text-amber-950 shadow-sm border border-amber-300/40 font-black",
          text: "text-amber-100",
          cardTitle: "GOLD MEMBER",
        };
      case "silver":
        return {
          bg: "bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800",
          badge: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-900 shadow-sm border border-slate-200/40 font-bold",
          text: "text-slate-100",
          cardTitle: "SILVER MEMBER",
        };
      default: // bronze
        return {
          bg: "bg-gradient-to-r from-[#7a2e1d] via-[#5c1c11] to-[#3a110a]",
          badge: "bg-gradient-to-r from-[#b35338] to-[#80321c] text-amber-100 shadow-sm border border-amber-500/30 font-bold",
          text: "text-amber-200/80",
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

        {/* User Hero Banner - Ultra Luxury Fine Dining Theme */}
        <div className="bg-[#1a120f] bg-radial-[at_top_right] from-[#3d1810] via-[#241310] to-[#140c0a] text-white rounded-3xl border border-[#dfb05b]/25 p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-8">
          {/* Subtle ambient lighting glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#dfb05b]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-client-primary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

            {/* Left: Avatar & User Identity */}
            <div className="flex items-center gap-5">
              {/* Avatar with Gold Ring */}
              <div className="relative shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#dfb05b] via-[#c99c4c] to-[#8e2316] p-0.5 shadow-lg shadow-black/40">
                  <div className="w-full h-full bg-[#201512] rounded-[14px] flex items-center justify-center font-display font-black text-2xl sm:text-3xl text-[#dfb05b]">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : "K"}
                  </div>
                </div>
                {/* Active Status Glowing Dot */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-[#1a120f] rounded-full flex items-center justify-center shadow-xs" title="Tài khoản đang hoạt động">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </div>
              </div>

              {/* Name, Tier & Contact Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                    {profile?.name || "Quý khách"}
                  </h1>
                  <span className={`text-[10px] uppercase tracking-widest px-3 py-0.5 rounded-full flex items-center gap-1 ${levelConf.badge}`}>
                    <Crown size={11} className="shrink-0" />
                    {displayedMemberLevel} MEMBER
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-white/70 flex-wrap pt-0.5">
                  <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                    <Mail size={12} className="text-[#dfb05b]" />
                    <span>{profile?.email}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                    <Phone size={12} className="text-[#dfb05b]" />
                    <span>{profile?.phone || "Chưa cập nhật SĐT"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Loyalty Points Widget & Logout */}
            <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">

              {/* Points Card */}
              <div className="flex-1 sm:flex-initial bg-gradient-to-br from-[#2a1b15] to-[#1e130f] border border-[#dfb05b]/30 hover:border-[#dfb05b]/60 rounded-2xl p-3.5 px-5 transition-all shadow-inner flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#dfb05b] to-[#a87d2a] text-[#1a120f] flex items-center justify-center shadow-md shrink-0">
                  <Sparkles size={20} className="text-[#1a120f] fill-[#1a120f]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#dfb05b] uppercase tracking-widest block">Điểm thưởng tích lũy</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white font-display">
                      {profile?.loyalty_points || 0}
                    </span>
                    <span className="text-xs font-bold text-[#dfb05b]">PTS</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("loyalty")}
                  className="ml-2 text-[11px] font-bold text-amber-200/90 hover:text-white bg-white/10 hover:bg-[#dfb05b] hover:text-[#1a120f] px-2.5 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer hidden sm:block shrink-0"
                >
                  Đổi ưu đãi &rarr;
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-3.5 bg-white/5 hover:bg-rose-500/20 text-white/80 hover:text-rose-200 border border-white/10 hover:border-rose-500/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                title="Đăng xuất khỏi tài khoản"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>

            </div>

          </div>
        </div>

        {/* Dashboard Tabs & Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-[#fdfbf9] border border-[#e8dfd5] p-3 rounded-3xl space-y-2 shadow-xs">
              <button
                onClick={() => handleTabChange("profile")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer ${activeTab === "profile"
                    ? "bg-gradient-to-r from-client-primary to-[#7a1f14] text-white shadow-md shadow-client-primary/20"
                    : "bg-white hover:bg-client-accent/50 border border-[#f0eae1] text-client-text"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <User size={18} />
                  <span>Hồ sơ & Bảo mật</span>
                </div>
                <ChevronRight size={14} className={activeTab === "profile" ? "opacity-100" : "opacity-40"} />
              </button>

              <button
                onClick={() => handleTabChange("bookings")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer ${activeTab === "bookings"
                    ? "bg-gradient-to-r from-client-primary to-[#7a1f14] text-white shadow-md shadow-client-primary/20"
                    : "bg-white hover:bg-client-accent/50 border border-[#f0eae1] text-client-text"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={18} />
                  <span>Lịch sử đặt bàn</span>
                </div>
                {bookings && bookings.length > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === "bookings" ? "bg-white text-client-primary" : "bg-client-primary/10 text-client-primary"
                    }`}>
                    {bookings.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabChange("loyalty")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer ${activeTab === "loyalty"
                    ? "bg-gradient-to-r from-client-primary to-[#7a1f14] text-white shadow-md shadow-client-primary/20"
                    : "bg-white hover:bg-client-accent/50 border border-[#f0eae1] text-client-text"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Award size={18} />
                  <span>Thẻ VIP & Ưu đãi</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === "loyalty" ? "bg-[#dfb05b] text-[#1a120f]" : "bg-[#dfb05b]/20 text-[#8e2316]"
                  }`}>
                  {profile?.loyalty_points || 0} PTS
                </span>
              </button>
            </div>
          </div>

          {/* Active Panel */}
          <div className="lg:col-span-3">

            {/* Tab 1: Profile */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fade-in">

                {/* Personal Information Card */}
                <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] p-6 sm:p-8 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#f0eae1] pb-5 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-client-primary/10 text-client-primary flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-client-text font-display">Thông tin cá nhân</h2>
                        <p className="text-xs text-client-muted">Quản lý họ tên, số điện thoại để nhà hàng phục vụ chu đáo nhất</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#dfb05b] uppercase tracking-wider bg-[#dfb05b]/10 border border-[#dfb05b]/30 px-3 py-1 rounded-full hidden sm:inline-block">
                      Chính chủ
                    </span>
                  </div>

                  <form noValidate onSubmit={handleUpdateProfile} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">

                      {/* Họ và tên */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                          Họ và tên <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${profileErrors.name ? "text-rose-500" : "text-gray-400"}`} />
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => handleProfileChange("name", e.target.value)}
                            onBlur={() => handleProfileBlur("name")}
                            placeholder="Nhập họ và tên..."
                            className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${profileErrors.name
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                                : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                              }`}
                          />
                        </div>
                        {profileErrors.name && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                            <AlertCircle size={13} className="shrink-0 text-rose-500" />
                            <span>{profileErrors.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Số điện thoại */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                          Số điện thoại liên hệ <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${profileErrors.phone ? "text-rose-500" : "text-gray-400"}`} />
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => handleProfileChange("phone", e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
                            onBlur={() => handleProfileBlur("phone")}
                            placeholder="Ví dụ: 0912345678"
                            className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${profileErrors.phone
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                                : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                              }`}
                          />
                        </div>
                        {profileErrors.phone ? (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                            <AlertCircle size={13} className="shrink-0 text-rose-500" />
                            <span>{profileErrors.phone}</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-client-muted">Định dạng 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09) để nhận mã đặt bàn SMS.</p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                          Địa chỉ Email đăng ký
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            disabled
                            type="email"
                            value={profile?.email || ""}
                            className="w-full rounded-2xl border border-[#e8dfd5] bg-[#f5f1ea] pl-10 pr-28 py-3 text-xs sm:text-sm text-client-muted cursor-not-allowed outline-none select-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                            <ShieldCheck size={12} /> Đã xác thực
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-6 py-3 bg-gradient-to-r from-client-primary to-[#7a1f14] hover:from-[#7a1f14] hover:to-client-primary text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-client-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                      >
                        {updateProfileMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                        <Check size={16} />
                        Lưu thông tin hồ sơ
                      </button>
                    </div>
                  </form>
                </div>

                {/* Password & Security Card */}
                <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] p-6 sm:p-8 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#f0eae1] pb-5 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Key size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-client-text font-display">Bảo mật & Đổi mật khẩu</h2>
                        <p className="text-xs text-client-muted">Bảo vệ tài khoản và điểm thưởng thành viên của bạn</p>
                      </div>
                    </div>
                  </div>

                  <form noValidate onSubmit={handleChangePassword} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-3">

                      {/* Old Password */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                          Mật khẩu hiện tại <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showOldPassword ? "text" : "password"}
                            value={passwordForm.oldPassword}
                            onChange={(e) => handlePasswordChange("oldPassword", e.target.value)}
                            onBlur={() => handlePasswordBlur("oldPassword")}
                            placeholder="Nhập mật khẩu cũ..."
                            className={`w-full rounded-2xl border bg-white px-4 pr-10 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${passwordErrors.oldPassword
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                                : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                              }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordErrors.oldPassword && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                            <AlertCircle size={13} className="shrink-0 text-rose-500" />
                            <span>{passwordErrors.oldPassword}</span>
                          </div>
                        )}
                      </div>

                      {/* New Password */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                          Mật khẩu mới <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                            onBlur={() => handlePasswordBlur("newPassword")}
                            placeholder="Tối thiểu 6 ký tự..."
                            className={`w-full rounded-2xl border bg-white px-4 pr-10 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${passwordErrors.newPassword
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                                : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                              }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordErrors.newPassword && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                            <AlertCircle size={13} className="shrink-0 text-rose-500" />
                            <span>{passwordErrors.newPassword}</span>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                          Xác nhận mật khẩu <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                            onBlur={() => handlePasswordBlur("confirmPassword")}
                            placeholder="Nhập lại mật khẩu mới..."
                            className={`w-full rounded-2xl border bg-white px-4 pr-10 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${passwordErrors.confirmPassword
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                                : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                              }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                            <AlertCircle size={13} className="shrink-0 text-rose-500" />
                            <span>{passwordErrors.confirmPassword}</span>
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="px-6 py-3 bg-gradient-to-r from-client-primary to-[#7a1f14] hover:from-[#7a1f14] hover:to-client-primary text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-client-primary/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                      >
                        {changePasswordMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                        <ShieldCheck size={16} />
                        Cập nhật mật khẩu mới
                      </button>
                    </div>
                  </form>
                </div>

                {/* Membership Privileges Card */}
                <div className="bg-gradient-to-br from-[#fdfbf9] to-[#f7f2ea] rounded-3xl border border-[#dfb05b]/30 p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Sparkles size={18} className="text-[#dfb05b]" />
                    <h3 className="text-sm font-bold text-client-text uppercase tracking-wider font-display">Đặc quyền hội viên nhà hàng Fine Dining</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="bg-white/80 p-4 rounded-2xl border border-[#f0eae1] shadow-2xs space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-client-primary/10 text-client-primary flex items-center justify-center font-bold text-xs mb-2">
                        💳
                      </div>
                      <strong className="text-xs font-bold text-gray-900 block">Tích lũy 5% hóa đơn</strong>
                      <p className="text-[11px] text-client-muted leading-relaxed">Nhận điểm thưởng mỗi lần dùng bữa và nâng hạng thành viên nhanh chóng.</p>
                    </div>
                    <div className="bg-white/80 p-4 rounded-2xl border border-[#f0eae1] shadow-2xs space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs mb-2">
                        ⭐
                      </div>
                      <strong className="text-xs font-bold text-gray-900 block">+30 PTS cho đánh giá</strong>
                      <p className="text-[11px] text-client-muted leading-relaxed">Chia sẻ cảm nhận sau mỗi bữa ăn để nhận điểm thưởng ngay lập tức.</p>
                    </div>
                    <div className="bg-white/80 p-4 rounded-2xl border border-[#f0eae1] shadow-2xs space-y-1">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs mb-2">
                        🎁
                      </div>
                      <strong className="text-xs font-bold text-gray-900 block">Đổi Voucher ưu đãi</strong>
                      <p className="text-[11px] text-client-muted leading-relaxed">Dùng điểm thưởng đổi các voucher giảm giá 50k, 100k, 200k khi đặt bàn.</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: Bookings */}
            {activeTab === "bookings" && (() => {
              const pendingBookingsCount = bookings.filter((b: any) => b.status === "pending").length;
              const confirmedBookingsCount = bookings.filter((b: any) => b.status === "confirmed" || b.status === "arrived").length;
              const completedBookingsCount = bookings.filter((b: any) => b.status === "completed").length;
              const cancelledBookingsCount = bookings.filter((b: any) => b.status === "cancelled").length;

              const filteredBookings = bookings.filter((b: any) => {
                if (bookingStatusFilter === "pending") return b.status === "pending";
                if (bookingStatusFilter === "confirmed") return b.status === "confirmed" || b.status === "arrived";
                if (bookingStatusFilter === "completed") return b.status === "completed";
                if (bookingStatusFilter === "cancelled") return b.status === "cancelled";
                return true;
              });

              return (
                <div className="bg-white rounded-3xl border border-client-accent p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6 border-b border-[#f0eae1] pb-4 flex-wrap gap-2">
                    <h2 className="text-lg font-bold text-client-text font-display flex items-center gap-2">
                      <Calendar size={20} className="text-client-primary" />
                      Lịch sử đặt bàn
                    </h2>
                    <span className="text-xs text-client-muted font-medium bg-[#f9f6f0] px-3 py-1 rounded-xl border border-client-accent/40">
                      Tổng: <strong>{bookings.length}</strong> đơn đặt bàn
                    </span>
                  </div>

                  {/* Filter Tabs Bar (Tổng đơn, Chờ xác nhận, Đã xác nhận, Hoàn thành, Đã hủy) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-[#f7f2ea]">
                    <button
                      type="button"
                      onClick={() => setBookingStatusFilter("all")}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${bookingStatusFilter === "all"
                          ? "bg-client-primary text-white shadow-sm"
                          : "bg-[#fdfbf9] hover:bg-[#f5eee6] text-client-text border border-[#e8dfd5]"
                        }`}
                    >
                      <span>Tất cả đơn</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${bookingStatusFilter === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                        }`}>
                        {bookings.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingStatusFilter("pending")}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${bookingStatusFilter === "pending"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-[#fdfbf9] hover:bg-amber-50 text-amber-900 border border-[#e8dfd5]"
                        }`}
                    >
                      <span>Chờ xác nhận</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${bookingStatusFilter === "pending" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                        }`}>
                        {pendingBookingsCount}
                      </span>
                    </button>

                    {confirmedBookingsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setBookingStatusFilter("confirmed")}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${bookingStatusFilter === "confirmed"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-[#fdfbf9] hover:bg-blue-50 text-blue-900 border border-[#e8dfd5]"
                          }`}
                      >
                        <span>Đã xác nhận</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${bookingStatusFilter === "confirmed" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                          }`}>
                          {confirmedBookingsCount}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setBookingStatusFilter("completed")}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${bookingStatusFilter === "completed"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-[#fdfbf9] hover:bg-emerald-50 text-emerald-900 border border-[#e8dfd5]"
                        }`}
                    >
                      <span>Đã hoàn thành</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${bookingStatusFilter === "completed" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                        {completedBookingsCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingStatusFilter("cancelled")}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${bookingStatusFilter === "cancelled"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-[#fdfbf9] hover:bg-rose-50 text-rose-900 border border-[#e8dfd5]"
                        }`}
                    >
                      <span>Đã hủy</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${bookingStatusFilter === "cancelled" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
                        }`}>
                        {cancelledBookingsCount}
                      </span>
                    </button>
                  </div>

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
                  ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-12 text-client-muted bg-[#fdfbf9] rounded-2xl border border-dashed border-[#e8dfd5]">
                      <ClipboardList size={36} className="mx-auto mb-3 text-[#7b6f65]/40" />
                      <p className="text-xs sm:text-sm font-semibold text-client-text">Không có đơn đặt bàn nào ở mục này.</p>
                      <button
                        type="button"
                        onClick={() => setBookingStatusFilter("all")}
                        className="mt-3 text-xs text-client-primary font-bold hover:underline cursor-pointer"
                      >
                        Xem tất cả đơn đặt bàn &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...filteredBookings]
                        .sort((a: any, b: any) => {
                          const getPriority = (status: string) => {
                            if (status === "confirmed") return 1;
                            if (status === "pending") return 2;
                            if (status === "arrived") return 3;
                            if (status === "completed") return 4;
                            if (status === "cancelled") return 5;
                            return 6;
                          };
                          const pA = getPriority(a.status);
                          const pB = getPriority(b.status);
                          if (pA !== pB) return pA - pB;
                          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
                        })
                        .map((booking: any) => {
                          const isCancellable = ["pending", "confirmed"].includes(booking.status);
                          const displayTableName = booking.table_names || booking.table_name || `Bàn ID: ${booking.table_id}`;
                          const displayAreaName = booking.area_name || "Nhà hàng";
                          const cancelReasonText = booking.cancel_reason || booking.note;

                          // Format date & time nicely
                          const startDate = new Date(booking.start_time);
                          const formattedTime = startDate.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          const formattedDate = startDate.toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          });

                          return (
                            <div
                              key={booking.id}
                              className="group border border-[#e8ded1] hover:border-[#dfb05b]/70 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4.5 hover:shadow-lg hover:shadow-amber-950/5 transition-all duration-300 bg-white relative overflow-hidden"
                            >
                              {/* Left status accent strip */}
                              <div
                                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                  booking.status === "completed"
                                    ? "bg-emerald-500"
                                    : booking.status === "cancelled"
                                    ? "bg-rose-500"
                                    : booking.status === "confirmed"
                                    ? "bg-client-primary"
                                    : booking.status === "arrived"
                                    ? "bg-indigo-500"
                                    : "bg-amber-500"
                                }`}
                              />

                              {/* Main Container */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0 pl-1.5">
                                {/* 1. PROMINENT DATE & TIME TILE */}
                                <div className="flex sm:flex-col items-center justify-center bg-[#FAF8F5] border border-[#EBE3D7] rounded-xl px-3.5 py-2.5 shrink-0 text-center min-w-[100px] shadow-2xs group-hover:border-[#dfb05b]/40 transition-colors">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {formattedDate}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5 text-client-primary font-black text-base font-display">
                                    <Clock size={14} className="text-amber-600" />
                                    <span>{formattedTime}</span>
                                  </div>
                                </div>

                                {/* 2. STRUCTURED BOOKING DETAILS */}
                                <div className="space-y-2 flex-1 min-w-0">
                                  {/* Title & Status Badge Row */}
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-gray-950 font-display text-base tracking-tight">
                                        {displayTableName}
                                      </span>
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                                        {displayAreaName}
                                      </span>
                                    </div>

                                    {/* Status Badge */}
                                    <span
                                      className={`text-xs font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                                        booking.status === "completed"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : booking.status === "cancelled"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : booking.status === "confirmed"
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                                          : booking.status === "arrived"
                                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                          : "bg-amber-50 text-amber-800 border-amber-300"
                                      }`}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          booking.status === "completed"
                                            ? "bg-emerald-500"
                                            : booking.status === "cancelled"
                                            ? "bg-rose-500"
                                            : booking.status === "confirmed"
                                            ? "bg-emerald-600"
                                            : booking.status === "arrived"
                                            ? "bg-indigo-500"
                                            : "bg-amber-500 animate-pulse"
                                        }`}
                                      />
                                      <span>
                                        {booking.status === "pending"
                                          ? "Chờ nhà hàng xác nhận"
                                          : booking.status === "confirmed"
                                          ? "Đã xác nhận đặt bàn"
                                          : booking.status === "arrived"
                                          ? "Đang phục vụ tại bàn"
                                          : booking.status === "completed"
                                          ? "Đã hoàn thành"
                                          : "Đã hủy"}
                                      </span>
                                    </span>
                                  </div>

                                  {/* Clean Info Grid Chips */}
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                                    {/* Confirmation Code */}
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EBE3D7] text-slate-700 font-medium">
                                      <span className="text-slate-400">Mã đơn:</span>
                                      <strong className="font-mono font-bold text-slate-900">
                                        {booking.confirmation_code || `#${booking.id}`}
                                      </strong>
                                    </div>

                                    {/* Party Size */}
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EBE3D7] text-slate-700 font-medium">
                                      <Users size={13} className="text-slate-400" />
                                      <span className="text-slate-400">Số khách:</span>
                                      <strong className="font-bold text-slate-900">
                                        {booking.party_size} khách
                                      </strong>
                                    </div>

                                    {/* Pre-ordered items badge if available */}
                                    {booking.pre_ordered_items && booking.pre_ordered_items.length > 0 && (
                                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-client-primary bg-client-primary/10 border border-client-primary/20 px-2.5 py-1 rounded-lg">
                                        <UtensilsCrossed size={12} />
                                        <span>Đã đặt {booking.pre_ordered_items.length} món</span>
                                        {Number(booking.pre_order_total || 0) > 0 && (
                                          <span className="font-bold">
                                            ({Number(booking.pre_order_total).toLocaleString("vi-VN")}đ)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Pending status callout */}
                                  {booking.status === "pending" && (
                                    <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-amber-900 mt-1">
                                      <Clock size={13.5} className="shrink-0 text-amber-600 animate-pulse" />
                                      <span className="font-medium">
                                        Nhà hàng đã tiếp nhận thông tin và đang kiểm tra xếp bàn cho bạn.
                                      </span>
                                    </div>
                                  )}

                                  {/* Confirmed status hint */}
                                  {booking.status === "confirmed" && (
                                    <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-emerald-900 mt-1">
                                      <CheckCircle size={13.5} className="shrink-0 text-emerald-600" />
                                      <span className="font-medium">
                                        Bàn đã được giữ chỗ thành công. Quý khách vui lòng đến trước 10-15 phút.
                                      </span>
                                    </div>
                                  )}

                                  {/* Cancellation reason box */}
                                  {booking.status === "cancelled" && (
                                    <div className="bg-rose-50/90 border border-rose-200 rounded-xl px-3 py-2 flex items-start gap-2 text-xs text-rose-800 max-w-2xl mt-1">
                                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                                      <div>
                                        <span className="font-bold">Lý do hủy: </span>
                                        <span className="font-medium">
                                          {cancelReasonText || "Khách hàng yêu cầu hủy đơn"}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions button group - Ultra-Compact Executive Bar */}
                              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-start md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#f2ebe1] relative">
                                {/* Xem chi tiết button */}
                                <button
                                  type="button"
                                  onClick={() => setDetailModal({ isOpen: true, booking })}
                                  className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fdfbf9] hover:bg-white text-[#4a3f35] hover:text-[#1e1b18] border border-[#e2d7c9] hover:border-[#cbbaa5] rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                                  title="Xem chi tiết đơn đặt bàn"
                                >
                                  <Eye size={13.5} className="text-[#8c7e72] group-hover:text-[#4a3f35] transition-colors" />
                                  <span>Chi tiết</span>
                                </button>

                                {/* More Actions Dropdown (Edit Info / Copy Code / Cancel Booking) */}
                                {isCancellable && (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionMenuId(activeActionMenuId === booking.id ? null : booking.id);
                                      }}
                                      className={`w-7.5 h-7.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${activeActionMenuId === booking.id
                                          ? "bg-client-primary text-white border-client-primary shadow-xs"
                                          : "bg-[#fdfbf9] hover:bg-white text-[#6e6053] hover:text-[#2a241f] border-[#e2d7c9] hover:border-[#cbbaa5]"
                                        }`}
                                      title="Tùy chọn khác"
                                    >
                                      <MoreHorizontal size={15} />
                                    </button>

                                    {/* Floating Action Menu */}
                                    {activeActionMenuId === booking.id && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-[#e8dfd5] py-1.5 z-30 animate-scale-in text-xs"
                                      >
                                        {/* Sửa thông tin */}
                                        {["pending", "confirmed"].includes(booking.status) && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              setEditContactModal({
                                                isOpen: true,
                                                booking,
                                                name: booking.guest_name || profile?.name || "",
                                                phone: booking.guest_phone || profile?.phone || "",
                                                email: booking.guest_email || profile?.email || "",
                                                note: booking.guest_note || booking.note || "",
                                                errors: {},
                                                touched: {},
                                              });
                                            }}
                                            className="w-full px-3.5 py-2 text-left hover:bg-amber-50/80 text-amber-950 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                                          >
                                            <Edit3 size={13.5} className="text-amber-600 shrink-0" />
                                            <span>Sửa thông tin</span>
                                          </button>
                                        )}

                                        {/* Copy confirmation code */}
                                        {booking.confirmation_code && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveActionMenuId(null);
                                              navigator.clipboard.writeText(booking.confirmation_code);
                                              toast.success(`Đã sao chép mã ${booking.confirmation_code}`);
                                            }}
                                            className="w-full px-3.5 py-2 text-left hover:bg-[#fbf9f6] text-slate-700 font-medium flex items-center gap-2.5 transition-colors cursor-pointer"
                                          >
                                            <Copy size={13.5} className="text-slate-400 shrink-0" />
                                            <span>Sao chép mã đơn</span>
                                          </button>
                                        )}

                                        {/* Divider */}
                                        <div className="my-1 border-t border-[#f2ebe1]" />

                                        {/* Hủy đặt bàn */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveActionMenuId(null);
                                            setCancelModal({
                                              isOpen: true,
                                              booking,
                                              reason: "Bận việc đột xuất / Thay đổi lịch trình",
                                              customReason: "",
                                              agreePolicy: false,
                                            });
                                          }}
                                          className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                                        >
                                          <CalendarX size={13.5} className="text-rose-500 shrink-0" />
                                          <span>Hủy đặt bàn</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Completed: Xem đánh giá hoặc Đánh giá */}
                                {booking.status === "completed" && (
                                  <div>
                                    {booking.is_reviewed ? (
                                      <button
                                        onClick={() => setViewReviewModal({ isOpen: true, booking })}
                                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        title="Xem đánh giá đã gửi"
                                      >
                                        <Star size={14} className="fill-amber-400 text-amber-400" />
                                        <span>Xem đánh giá ({booking.review_rating || 5}★)</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setReviewModal({
                                            isOpen: true,
                                            bookingId: booking.id,
                                            tableInfo: `${displayTableName} · ${new Date(booking.start_time).toLocaleDateString("vi-VN")}`,
                                            rating: 5,
                                            comment: "",
                                          })
                                        }
                                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                                      >
                                        <Star size={14} className="fill-white text-white" />
                                        <span>Đánh giá bữa ăn (+30 PTS)</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })()}

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
                    { key: "bronze", label: "Bronze", min: 0, max: 2000, color: "from-[#a72d1e] to-[#8e2316]", dot: "bg-[#a72d1e]", badge: "bg-[#a72d1e]/10 text-[#a72d1e]", bar: "bg-[#a72d1e]" },
                    { key: "silver", label: "Silver", min: 2000, max: 8000, color: "from-slate-400 to-slate-600", dot: "bg-slate-500", badge: "bg-slate-100 text-slate-600", bar: "bg-slate-500" },
                    { key: "gold", label: "Gold", min: 8000, max: 20000, color: "from-amber-400 to-amber-600", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
                    { key: "vip", label: "VIP", min: 20000, max: 20000, color: "from-purple-500 to-indigo-700", dot: "bg-purple-600", badge: "bg-purple-100 text-purple-700", bar: "bg-purple-600" },
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
                                      className={`h-full rounded-full transition-all duration-700 ${pts >= tier.min
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
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isReached
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
                            <div key={tier.key} className={`rounded-2xl p-3 border text-center transition-all ${isCurrent
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
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${canRedeem
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

      {/* Booking Details Modal */}
      {detailModal.isOpen && detailModal.booking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#fdfbf9] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#e8dfd5] animate-scale-in max-h-[92vh] flex flex-col my-auto relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#dfb05b]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#8e2316]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-[#f0eae1] shrink-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-client-primary to-[#7a1f14] text-white flex items-center justify-center shadow-md shadow-client-primary/20">
                  <UtensilsCrossed size={22} className="text-[#dfb05b]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-client-text font-display tracking-tight">Chi tiết đơn đặt bàn</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#dfb05b] bg-[#dfb05b]/10 px-2 py-0.5 rounded-full border border-[#dfb05b]/30">
                      Fine Dining
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-client-muted font-medium">Mã đơn:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = detailModal.booking.confirmation_code || `#${detailModal.booking.id}`;
                        navigator.clipboard.writeText(code);
                        toast.success("Đã sao chép mã đơn đặt bàn!");
                      }}
                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-client-primary bg-client-primary/10 hover:bg-client-primary/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      title="Nhấn để sao chép mã đơn"
                    >
                      <span>{detailModal.booking.confirmation_code || `#${detailModal.booking.id}`}</span>
                      <Copy size={11} className="opacity-70" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailModal({ isOpen: false, booking: null })}
                className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto py-5 space-y-4 pr-1 text-xs scrollbar-thin z-10">

              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border shadow-xs transition-all ${detailModal.booking.status === "completed" ? "bg-gradient-to-r from-emerald-50 to-teal-50/50 border-emerald-200/80 text-emerald-900" :
                  detailModal.booking.status === "cancelled" ? "bg-gradient-to-r from-rose-50 to-red-50/50 border-rose-200/80 text-rose-900" :
                    detailModal.booking.status === "confirmed" ? "bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200/80 text-blue-900" :
                      detailModal.booking.status === "arrived" ? "bg-gradient-to-r from-indigo-50 to-purple-50/50 border-indigo-200/80 text-indigo-900" :
                        "bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-200/80 text-amber-900"
                }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-70 block">
                      Trạng thái hiện tại
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-display">
                        {detailModal.booking.status === "pending" ? "Đang chờ nhà hàng xác nhận" :
                          detailModal.booking.status === "confirmed" ? "Đã xác nhận đặt bàn" :
                            detailModal.booking.status === "arrived" ? "Khách đã đến & đang phục vụ" :
                              detailModal.booking.status === "completed" ? "Đã hoàn thành bữa ăn" : "Đơn đặt bàn đã hủy"}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-85 leading-relaxed pt-0.5">
                      {detailModal.booking.status === "pending" ? "Nhà hàng đã tiếp nhận thông tin và đang kiểm tra xếp bàn phù hợp cho bạn." :
                        detailModal.booking.status === "confirmed" ? "Bàn của bạn đã được nhà hàng giữ chỗ thành công. Hân hạnh đón tiếp quý khách!" :
                          detailModal.booking.status === "arrived" ? "Quý khách đang dùng bữa tại nhà hàng. Chúc quý khách có trải nghiệm tuyệt vời!" :
                            detailModal.booking.status === "completed" ? "Bữa ăn đã hoàn tất. Cảm ơn quý khách đã tin tưởng và đồng hành cùng nhà hàng." :
                              "Đơn đặt bàn này đã được hủy và giải phóng bàn cho khách hàng khác."}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 shadow-xs ${detailModal.booking.status === "completed" ? "bg-emerald-600 text-white" :
                      detailModal.booking.status === "cancelled" ? "bg-rose-600 text-white" :
                        detailModal.booking.status === "confirmed" ? "bg-blue-600 text-white" :
                          detailModal.booking.status === "arrived" ? "bg-indigo-600 text-white" :
                            "bg-amber-500 text-white"
                    }`}>
                    {detailModal.booking.status}
                  </span>
                </div>

                {/* Progress Stepper Mini */}
                <div className="mt-3.5 pt-3 border-t border-black/5 flex items-center justify-between text-[10px] font-bold">
                  {[
                    { key: "pending", label: "1. Tiếp nhận" },
                    { key: "confirmed", label: "2. Xác nhận" },
                    { key: "arrived", label: "3. Phục vụ" },
                    { key: "completed", label: "4. Hoàn tất" },
                  ].map((step, idx) => {
                    const statusOrder = ["pending", "confirmed", "arrived", "completed"];
                    const currentIdx = statusOrder.indexOf(detailModal.booking.status);
                    const isPassed = detailModal.booking.status !== "cancelled" && currentIdx >= idx;
                    const isCurrent = detailModal.booking.status === step.key;

                    return (
                      <div key={step.key} className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${detailModal.booking.status === "cancelled" ? "bg-gray-200 text-gray-500" :
                            isPassed ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"
                          }`}>
                          {isPassed ? "✓" : idx + 1}
                        </div>
                        <span className={isCurrent ? "font-black text-slate-900" : isPassed ? "text-slate-700" : "text-gray-400"}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cancellation Reason Alert Box if Cancelled */}
              {detailModal.booking.status === "cancelled" && (
                <div className="bg-gradient-to-r from-rose-50 via-red-50/50 to-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                      <AlertCircle size={14} />
                    </div>
                    <span className="text-xs uppercase tracking-wide">Thông tin lý do hủy đặt bàn</span>
                  </div>
                  <div className="bg-white/90 p-3 rounded-xl border border-rose-200/80 text-xs text-rose-900 font-medium leading-relaxed shadow-2xs">
                    {detailModal.booking.cancel_reason || detailModal.booking.note || "Khách hàng yêu cầu hủy đơn qua tài khoản"}
                  </div>
                </div>
              )}

              {/* Main Info Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                {/* Table & Space Info */}
                <div className="bg-white border border-[#f0eae1] hover:border-client-secondary/50 rounded-2xl p-4 space-y-2.5 shadow-2xs transition-all">
                  <div className="flex items-center gap-2 text-client-primary">
                    <Utensils size={15} className="text-[#dfb05b]" />
                    <span className="text-[11px] uppercase font-black tracking-wider text-client-muted">Vị trí bàn & Không gian</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-bold text-gray-900 font-display">
                      {detailModal.booking.table_names || detailModal.booking.table_name || `Bàn ID: ${detailModal.booking.table_id}`}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="inline-flex items-center gap-1 bg-[#fbf9f6] border border-[#f0eae1] px-2 py-0.5 rounded-md font-semibold text-client-text">
                        <MapPin size={11} className="text-client-primary" />
                        {detailModal.booking.area_name || "Khu vực chính"}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#fbf9f6] border border-[#f0eae1] px-2 py-0.5 rounded-md font-semibold text-client-text">
                        <Users size={11} className="text-client-primary" />
                        {detailModal.booking.party_size} khách
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date & Time Info */}
                <div className="bg-white border border-[#f0eae1] hover:border-client-secondary/50 rounded-2xl p-4 space-y-2.5 shadow-2xs transition-all">
                  <div className="flex items-center gap-2 text-client-primary">
                    <Clock size={15} className="text-[#dfb05b]" />
                    <span className="text-[11px] uppercase font-black tracking-wider text-client-muted">Lịch hẹn dùng bữa</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-gray-900 font-display">
                      {new Date(detailModal.booking.start_time).toLocaleString("vi-VN", {
                        weekday: "long",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                    <div className="text-xs text-client-muted flex items-center justify-between gap-1 flex-wrap">
                      {detailModal.booking.end_time && (
                        <span>Dự kiến kết thúc: <strong>{new Date(detailModal.booking.end_time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      )}
                      <span>Tạo: {detailModal.booking.created_at ? new Date(detailModal.booking.created_at).toLocaleDateString("vi-VN") : "N/A"}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Customer Contact Details */}
              <div className="bg-white border border-[#f0eae1] rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#dfb05b]" />
                  <span className="text-[11px] uppercase font-black tracking-wider text-client-muted">Thông tin người đặt bàn</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="bg-[#fbf9f6] p-2.5 rounded-xl border border-[#f0eae1]/80">
                    <span className="text-client-muted block text-[10px] uppercase font-bold">Họ và tên</span>
                    <strong className="text-gray-900 font-bold text-xs block mt-0.5">
                      {detailModal.booking.guest_name || profile?.name || "Khách hàng"}
                    </strong>
                  </div>
                  <div className="bg-[#fbf9f6] p-2.5 rounded-xl border border-[#f0eae1]/80">
                    <span className="text-client-muted block text-[10px] uppercase font-bold">Số điện thoại</span>
                    <a
                      href={`tel:${detailModal.booking.guest_phone || profile?.phone}`}
                      className="text-client-primary hover:underline font-bold text-xs block mt-0.5"
                    >
                      {detailModal.booking.guest_phone || profile?.phone || "Chưa cung cấp"}
                    </a>
                  </div>
                  <div className="bg-[#fbf9f6] p-2.5 rounded-xl border border-[#f0eae1]/80">
                    <span className="text-client-muted block text-[10px] uppercase font-bold">Địa chỉ Email</span>
                    <span className="text-gray-900 font-semibold text-xs block mt-0.5 truncate" title={detailModal.booking.guest_email || profile?.email}>
                      {detailModal.booking.guest_email || profile?.email || "Chưa cung cấp"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest Special Request Note */}
              {(detailModal.booking.guest_note || (detailModal.booking.status !== "cancelled" && detailModal.booking.note)) && (
                <div className="bg-[#fcfaf5] border border-[#f3e9d7] rounded-2xl p-4 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-[11px] uppercase tracking-wide">
                    <MessageSquareQuote size={15} className="text-amber-600" />
                    <span>Ghi chú & Yêu cầu đặc biệt của quý khách</span>
                  </div>
                  <p className="text-xs text-[#594218] italic bg-white/90 p-3 rounded-xl border border-[#f0e1c6] leading-relaxed">
                    "{detailModal.booking.guest_note || detailModal.booking.note}"
                  </p>
                </div>
              )}

              {/* Pre-ordered Menu Dishes */}
              {detailModal.booking.pre_ordered_items && detailModal.booking.pre_ordered_items.length > 0 && (
                <div className="bg-white border border-[#f0eae1] rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#f0eae1] pb-2.5">
                    <div className="flex items-center gap-2 font-bold text-client-text text-xs">
                      <UtensilsCrossed size={14} className="text-client-primary" />
                      <span>Món ăn đã đặt trước ({detailModal.booking.pre_ordered_items.length} món)</span>
                    </div>
                    <span className="text-xs font-black text-client-primary">
                      Tổng tiền món: {Number(detailModal.booking.pre_order_total || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="divide-y divide-[#f5efe6] border border-[#f0eae1] rounded-xl overflow-hidden">
                    {detailModal.booking.pre_ordered_items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs bg-[#fdfbf9] hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          {item.menu_item_image ? (
                            <img src={item.menu_item_image} alt={item.menu_item_name} className="w-10 h-10 rounded-xl object-cover border border-[#f0eae1]" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-client-primary/10 text-client-primary flex items-center justify-center font-bold text-xs">
                              {idx + 1}
                            </div>
                          )}
                          <div>
                            <strong className="text-gray-900 font-bold block text-xs">{item.menu_item_name || `Món ID: ${item.menu_item_id}`}</strong>
                            <span className="text-client-muted text-[11px]">Đơn giá: {Number(item.unit_price || item.menu_item_price || 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-800 block text-xs bg-slate-100 px-2 py-0.5 rounded-md inline-block">x{item.quantity}</span>
                          <span className="text-client-primary font-bold text-xs block mt-0.5">
                            {(Number(item.unit_price || item.menu_item_price || 0) * Number(item.quantity)).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deposit & Financial Info */}
              {/* <div className="bg-white border border-[#f0eae1] rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Award size={15} className="text-[#dfb05b]" />
                  <span className="text-[11px] uppercase font-black tracking-wider text-client-muted">Thông tin đặt cọc & thanh toán</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#fbf9f6] p-3 rounded-xl border border-[#f0eae1]">
                    <span className="text-client-muted block text-[10px] uppercase font-bold">Số tiền đặt cọc</span>
                    <strong className="text-gray-900 text-sm font-black block mt-0.5">
                      {Number(detailModal.booking.deposit_amount || 0).toLocaleString("vi-VN")}đ
                    </strong>
                  </div>
                  <div className="bg-[#fbf9f6] p-3 rounded-xl border border-[#f0eae1]">
                    <span className="text-client-muted block text-[10px] uppercase font-bold">Trạng thái tiền cọc</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg font-bold text-[11px] border ${
                      detailModal.booking.deposit_status === "paid" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                      detailModal.booking.deposit_status === "refunded" ? "bg-blue-50 text-blue-800 border-blue-200" :
                      detailModal.booking.deposit_status === "unpaid" ? "bg-amber-50 text-amber-800 border-amber-200" :
                      "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                      {detailModal.booking.deposit_status === "paid" ? "Đã thanh toán cọc thành công" :
                       detailModal.booking.deposit_status === "refunded" ? "Đã hoàn cọc cho khách" :
                       detailModal.booking.deposit_status === "unpaid" ? "Chưa thanh toán tiền cọc" : "Không yêu cầu đặt cọc"}
                    </span>
                  </div>
                </div>
              </div> */}

              {/* Review Highlight if already Reviewed */}
              {detailModal.booking.is_reviewed ? (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Star size={16} className="fill-amber-400 text-amber-400" />
                      Đánh giá của bạn ({detailModal.booking.review_rating || 5}/5 sao)
                    </span>
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={12} className="text-emerald-600" />
                      +30 PTS Thưởng
                    </span>
                  </div>
                  {detailModal.booking.review_comment && (
                    <p className="text-xs text-slate-800 italic bg-white/90 p-3 rounded-xl border border-emerald-100 leading-relaxed">
                      "{detailModal.booking.review_comment}"
                    </p>
                  )}
                  {detailModal.booking.review_created_at && (
                    <span className="text-[10px] text-emerald-700 block text-right font-medium">
                      Đã gửi đánh giá lúc: {new Date(detailModal.booking.review_created_at).toLocaleString("vi-VN")}
                    </span>
                  )}
                </div>
              ) : null}

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#f0eae1] shrink-0 z-10">
              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, booking: null })}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {["pending", "confirmed"].includes(detailModal.booking.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const b = detailModal.booking;
                        setDetailModal({ isOpen: false, booking: null });
                        setEditContactModal({
                          isOpen: true,
                          booking: b,
                          name: b.guest_name || profile?.name || "",
                          phone: b.guest_phone || profile?.phone || "",
                          email: b.guest_email || profile?.email || "",
                          note: b.guest_note || b.note || "",
                          errors: {},
                          touched: {},
                        });
                      }}
                      className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500/10 to-amber-600/15 hover:from-amber-500/20 hover:to-amber-600/25 text-amber-950 border border-amber-500/30 hover:border-amber-500/50 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Edit3 size={14} className="text-amber-700 group-hover:text-amber-800 transition-colors" />
                      <span>Sửa thông tin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const b = detailModal.booking;
                        setDetailModal({ isOpen: false, booking: null });
                        setCancelModal({
                          isOpen: true,
                          booking: b,
                          reason: "Bận việc đột xuất / Thay đổi lịch trình",
                          customReason: "",
                          agreePolicy: false,
                        });
                      }}
                      className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50/80 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200/80 hover:border-rose-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                    >
                      <CalendarX size={14} className="text-rose-500 group-hover:text-rose-600 transition-colors" />
                      <span>Hủy đặt bàn</span>
                    </button>
                  </>
                )}

                {detailModal.booking.status === "completed" && (
                  detailModal.booking.is_reviewed ? (
                    <button
                      type="button"
                      onClick={() => {
                        const b = detailModal.booking;
                        setDetailModal({ isOpen: false, booking: null });
                        setViewReviewModal({ isOpen: true, booking: b });
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Star size={14} className="fill-amber-300 text-amber-300" />
                      <span>Xem đánh giá</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const b = detailModal.booking;
                        setDetailModal({ isOpen: false, booking: null });
                        setReviewModal({
                          isOpen: true,
                          bookingId: b.id,
                          tableInfo: `${b.table_names || b.table_name || `Bàn ID: ${b.table_id}`} · ${new Date(b.start_time).toLocaleDateString("vi-VN")}`,
                          rating: 5,
                          comment: "",
                        });
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Star size={14} className="fill-white text-white" />
                      <span>Đánh giá bữa ăn (+30 PTS)</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Review Modal */}
      {viewReviewModal.isOpen && viewReviewModal.booking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#fdfbf9] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#e8dfd5] animate-scale-in relative overflow-hidden">
            {/* Gold background blur accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#dfb05b]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-[#f0eae1] z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
                  <Star size={22} className="fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 font-display">Đánh giá trải nghiệm</h3>
                  <p className="text-xs text-client-muted font-medium">
                    {viewReviewModal.booking.table_names || viewReviewModal.booking.table_name || `Bàn ID: ${viewReviewModal.booking.table_id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewReviewModal({ isOpen: false, booking: null })}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-6 text-center space-y-4 z-10">
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={34}
                    className={
                      star <= (viewReviewModal.booking.review_rating || 5)
                        ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                        : "text-gray-200 fill-gray-100"
                    }
                  />
                ))}
              </div>

              <div>
                <span className="text-base font-extrabold text-amber-600 font-display block">
                  {viewReviewModal.booking.review_rating === 5 ? "Rất tuyệt vời (5/5 sao)" :
                    viewReviewModal.booking.review_rating === 4 ? "Hài lòng (4/5 sao)" :
                      viewReviewModal.booking.review_rating === 3 ? "Bình thường (3/5 sao)" :
                        viewReviewModal.booking.review_rating === 2 ? "Chưa tốt (2/5 sao)" : "Tệ (1/5 sao)"}
                </span>
                <span className="text-xs text-client-muted mt-1 block">
                  {viewReviewModal.booking.review_created_at
                    ? `Đã gửi đánh giá: ${new Date(viewReviewModal.booking.review_created_at).toLocaleString("vi-VN")}`
                    : `Bữa ăn lúc: ${new Date(viewReviewModal.booking.start_time).toLocaleString("vi-VN")}`}
                </span>
              </div>

              <div className="bg-white border border-[#f0eae1] rounded-2xl p-4 text-left shadow-2xs space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-client-muted block tracking-wider">Ý kiến & Nhận xét của bạn:</span>
                <p className="text-xs text-client-text italic leading-relaxed">
                  {viewReviewModal.booking.review_comment
                    ? `"${viewReviewModal.booking.review_comment}"`
                    : "Khách hàng không để lại nhận xét chi tiết."}
                </p>
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-center gap-2 text-xs text-amber-900 font-medium">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>Bạn đã tích lũy <strong className="font-extrabold text-amber-700">+30 PTS</strong> điểm thưởng từ đánh giá này!</span>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-3 border-t border-[#f0eae1]">
              <button
                type="button"
                onClick={() => {
                  const b = viewReviewModal.booking;
                  setViewReviewModal({ isOpen: false, booking: null });
                  setReviewModal({
                    isOpen: true,
                    bookingId: b.id,
                    tableInfo: `${b.table_names || b.table_name || `Bàn ID: ${b.table_id}`} · ${new Date(b.start_time).toLocaleDateString("vi-VN")}`,
                    rating: b.review_rating || 5,
                    comment: b.review_comment || "",
                  });
                }}
                className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-[#f0eae1] text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Edit3 size={14} />
                Chỉnh sửa đánh giá
              </button>

              <button
                type="button"
                onClick={() => setViewReviewModal({ isOpen: false, booking: null })}
                className="px-5 py-2.5 bg-client-primary hover:bg-client-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal (Strict Cancellation Logic & Policies) */}
      {cancelModal.isOpen && cancelModal.booking && (() => {
        const bookingTime = new Date(cancelModal.booking.start_time).getTime();
        const now = Date.now();
        const diffHours = (bookingTime - now) / (1000 * 60 * 60);
        const isUrgentCancel = diffHours < 2 && diffHours > 0;
        const isPastBooking = diffHours <= 0;
        const hasDeposit = Number(cancelModal.booking.deposit_amount || 0) > 0;
        const isDepositPaid = cancelModal.booking.deposit_status === "paid";

        const isReasonOther = cancelModal.reason.includes("Lý do khác");
        const isCustomReasonValid = !isReasonOther || cancelModal.customReason.trim().length >= 10;
        const canSubmit = cancelModal.agreePolicy && isCustomReasonValid;

        const cancellationReasons = [
          { id: "busy", label: "Bận việc đột xuất / Thay đổi lịch trình", icon: Clock },
          { id: "guests", label: "Thay đổi số lượng người / Không đủ thành viên", icon: Users },
          { id: "change_location", label: "Muốn chuyển sang bàn hoặc thời gian khác", icon: MapPin },
          { id: "wrong_info", label: "Đặt nhầm thông tin ngày giờ hoặc nhầm bàn", icon: AlertTriangle },
          { id: "force_majeure", label: "Thời tiết xấu hoặc sự cố bất khả kháng", icon: ShieldAlert },
          { id: "other", label: "Lý do khác (Bắt buộc nhập chi tiết bên dưới)", icon: FileText },
        ];

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#fdfbf9] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-rose-200 animate-scale-in max-h-[92vh] flex flex-col my-auto relative">

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#f0eae1] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 font-display">Xác nhận hủy đơn đặt bàn</h3>
                    <p className="text-xs text-client-muted font-mono font-bold">
                      {cancelModal.booking.confirmation_code || `#${cancelModal.booking.id}`} · {cancelModal.booking.table_names || cancelModal.booking.table_name || `Bàn ID: ${cancelModal.booking.table_id}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, booking: null, reason: "Bận việc đột xuất / Thay đổi lịch trình", customReason: "", agreePolicy: false })}
                  className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto py-4 space-y-4 pr-1 text-xs scrollbar-thin">

                {/* Booking Brief Summary Card */}
                <div className="bg-white border border-[#f0eae1] rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-client-muted font-medium">Thời gian đặt đến:</span>
                    <strong className="text-gray-900 font-bold">
                      {new Date(cancelModal.booking.start_time).toLocaleString("vi-VN")}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-client-muted font-medium">Bàn & Khu vực:</span>
                    <strong className="text-gray-900 font-bold">
                      {cancelModal.booking.table_names || cancelModal.booking.table_name || `Bàn ID: ${cancelModal.booking.table_id}`} ({cancelModal.booking.area_name || "Nhà hàng"})
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-client-muted font-medium">Số lượng khách:</span>
                    <strong className="text-gray-900 font-bold">{cancelModal.booking.party_size} khách</strong>
                  </div>
                  {hasDeposit && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-gray-100">
                      <span className="text-amber-800 font-medium">Tiền cọc của đơn:</span>
                      <strong className="text-amber-700 font-black">
                        {Number(cancelModal.booking.deposit_amount).toLocaleString("vi-VN")}đ ({isDepositPaid ? "Đã cọc" : "Chưa cọc"})
                      </strong>
                    </div>
                  )}
                </div>

                {/* Policy Notice Box */}
                <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${isUrgentCancel
                    ? "bg-amber-50/80 border-amber-200 text-amber-900"
                    : isPastBooking
                      ? "bg-rose-50/80 border-rose-200 text-rose-900"
                      : "bg-blue-50/80 border-blue-200 text-blue-900"
                  }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info size={14} className={isUrgentCancel ? "text-amber-600" : isPastBooking ? "text-rose-600" : "text-blue-600"} />
                    <span>Chính sách hủy đặt bàn của nhà hàng</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {isUrgentCancel ? (
                      <span>
                        ⚠️ <strong>Hủy cận giờ (&lt; 2 tiếng trước giờ hẹn):</strong> Nhà hàng có thể đã chuẩn bị bàn và sắp xếp nguyên liệu phục vụ. Vui lòng cân nhắc trước khi xác nhận hủy.
                      </span>
                    ) : isPastBooking ? (
                      <span>
                        ⚠️ <strong>Đơn đã qua giờ bắt đầu:</strong> Đơn đặt bàn đã bắt đầu, việc hủy đơn sẽ được ghi nhận vào lịch sử của bạn.
                      </span>
                    ) : (
                      <span>
                        ✅ <strong>Hủy tiêu chuẩn (&gt; 2 tiếng trước giờ hẹn):</strong> Bàn sẽ được giải phóng lập tức và không phát sinh phí phụ thu.
                      </span>
                    )}
                  </p>
                  {hasDeposit && isDepositPaid && (
                    <p className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 p-2 rounded-lg border border-amber-200/60">
                      💡 Tiền cọc <strong>{Number(cancelModal.booking.deposit_amount).toLocaleString("vi-VN")}đ</strong> sẽ được xử lý bảo lưu / hoàn điểm theo quy định của nhà hàng.
                    </p>
                  )}
                </div>

                {/* Reasons Selection */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                    Vui lòng chọn lý do hủy đặt bàn: *
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {cancellationReasons.map((r) => {
                      const IconComp = r.icon;
                      const isSelected = cancelModal.reason === r.label;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setCancelModal((prev) => ({ ...prev, reason: r.label }))}
                          className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between gap-2 ${isSelected
                              ? "border-rose-500 bg-rose-50/80 text-rose-900 shadow-2xs ring-1 ring-rose-500/20"
                              : "border-[#f0eae1] hover:border-gray-300 text-slate-700 bg-white"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-rose-200/70 text-rose-700" : "bg-gray-100 text-gray-500"
                              }`}>
                              <IconComp size={13} />
                            </div>
                            <span className="truncate">{r.label}</span>
                          </div>
                          {isSelected && <CheckCircle size={15} className="text-rose-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Reason Textarea */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider">
                      {isReasonOther ? "Chi tiết lý do hủy (Bắt buộc tối thiểu 10 ký tự): *" : "Ghi chú thêm lý do (Tùy chọn):"}
                    </label>
                    {isReasonOther && (
                      <span className={`text-[10px] font-bold ${cancelModal.customReason.trim().length >= 10 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                        {cancelModal.customReason.trim().length} / 10 ký tự
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={cancelModal.customReason}
                    onChange={(e) => setCancelModal((prev) => ({ ...prev, customReason: e.target.value }))}
                    placeholder={isReasonOther ? "Vui lòng ghi rõ lý do hủy đặt bàn..." : "Nhập thêm thông tin chi tiết nếu có..."}
                    className={`w-full rounded-xl border p-2.5 text-xs outline-none resize-none transition-colors ${isReasonOther && cancelModal.customReason.trim().length < 10
                        ? "border-rose-300 focus:ring-2 focus:ring-rose-500 bg-rose-50/20"
                        : "border-[#f0eae1] focus:ring-2 focus:ring-rose-500 bg-white"
                      }`}
                  />
                  {isReasonOther && cancelModal.customReason.trim().length < 10 && (
                    <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle size={11} />
                      Vui lòng nhập tối thiểu 10 ký tự để nêu rõ lý do hủy.
                    </p>
                  )}
                </div>

                {/* Mandatory Consent Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-200 bg-rose-50/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={cancelModal.agreePolicy}
                    onChange={(e) => setCancelModal((prev) => ({ ...prev, agreePolicy: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-rose-900 font-medium leading-relaxed">
                    Tôi xác nhận muốn hủy đơn đặt bàn này và hiểu rằng hành động này không thể hoàn tác sau khi thực hiện.
                  </span>
                </label>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#f0eae1] shrink-0">
                <button
                  type="button"
                  onClick={() => setCancelModal({ isOpen: false, booking: null, reason: "Bận việc đột xuất / Thay đổi lịch trình", customReason: "", agreePolicy: false })}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Giữ lại đơn
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || cancelBookingMutation.isPending}
                  onClick={() => {
                    if (cancelModal.booking) {
                      const finalReason = cancelModal.customReason.trim()
                        ? `${cancelModal.reason}: ${cancelModal.customReason.trim()}`
                        : cancelModal.reason;
                      cancelBookingMutation.mutate({
                        id: cancelModal.booking.id,
                        reason: finalReason,
                      });
                    }
                  }}
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 ${canSubmit && !cancelBookingMutation.isPending
                      ? "bg-rose-600 hover:bg-rose-700 cursor-pointer active:scale-95"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  {cancelBookingMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Xác nhận hủy đặt bàn
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Review Modal (Submit & Edit) */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#fdfbf9] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-[#e8dfd5] animate-scale-in">
            <div className="p-6 border-b border-[#f0eae1] flex justify-between items-center bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display flex items-center gap-2">
                  <Star className="text-amber-500 fill-amber-500" size={18} />
                  Đánh giá chất lượng bữa ăn
                </h3>
                <p className="text-xs text-client-muted mt-0.5 font-medium">{reviewModal.tableInfo}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal({ isOpen: false, bookingId: null, tableInfo: "", rating: 5, comment: "" })}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
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
                <label className="block text-xs font-bold text-client-muted uppercase tracking-wider">
                  Bạn cảm thấy bữa ăn như thế nào? *
                </label>
                <div className="flex justify-center items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModal((prev) => ({ ...prev, rating: star }))}
                      className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                    >
                      <Star
                        size={34}
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
                  {reviewModal.rating === 5 ? "Rất tuyệt vời (5/5 sao)" :
                    reviewModal.rating === 4 ? "Hài lòng (4/5 sao)" :
                      reviewModal.rating === 3 ? "Bình thường (3/5 sao)" :
                        reviewModal.rating === 2 ? "Chưa tốt (2/5 sao)" : "Tệ (1/5 sao)"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-1.5">
                  Ý kiến nhận xét / Góp ý
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Hãy chia sẻ trải nghiệm về món ăn, không gian hoặc thái độ phục vụ..."
                  className="w-full rounded-2xl border border-[#f0eae1] focus:border-client-secondary p-3 text-xs focus:ring-2 focus:ring-client-secondary/20 outline-none resize-none bg-white"
                />
              </div>

              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2 text-xs text-amber-900 font-medium">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>Hoàn tất đánh giá nhận ngay <strong className="font-extrabold text-amber-700">+30 PTS</strong> điểm tích lũy thưởng!</span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#f0eae1]">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, bookingId: null, tableInfo: "", rating: 5, comment: "" })}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="px-5 py-2.5 bg-client-primary hover:bg-client-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {reviewMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Gửi đánh giá (+30 PTS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Contact Info Modal (Only Name, Phone, Email, Note; Locked Date/Time/Guests) */}
      {editContactModal.isOpen && editContactModal.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#fdfbf9] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-[#e8dfd5] animate-scale-in max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="p-6 border-b border-[#f0eae1] flex justify-between items-center bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-display flex items-center gap-2">
                  <Edit3 className="text-blue-600" size={18} />
                  Thay đổi thông tin người đặt bàn
                </h3>
                <p className="text-xs text-client-muted mt-0.5 font-medium">
                  Mã đơn: <strong className="font-mono text-blue-800">{editContactModal.booking.confirmation_code || `#${editContactModal.booking.id}`}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditContactModal((prev) => ({ ...prev, isOpen: false, booking: null }))}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 border border-gray-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nameTrimmed = editContactModal.name.trim();
                const phoneTrimmed = editContactModal.phone.trim();
                const emailTrimmed = editContactModal.email.trim();

                const errs: { name?: string; phone?: string; email?: string } = {};
                if (!nameTrimmed) {
                  errs.name = "Họ và tên không được để trống";
                } else if (nameTrimmed.length < 2) {
                  errs.name = "Họ và tên tối thiểu 2 ký tự";
                }

                const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
                if (!phoneTrimmed) {
                  errs.phone = "Số điện thoại không được để trống";
                } else if (!phoneRegex.test(phoneTrimmed) || phoneTrimmed.length !== 10) {
                  errs.phone = "Số điện thoại phải gồm 10 chữ số chuẩn";
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailTrimmed && !emailRegex.test(emailTrimmed)) {
                  errs.email = "Định dạng email không hợp lệ";
                }

                if (Object.keys(errs).length > 0) {
                  setEditContactModal((prev) => ({
                    ...prev,
                    errors: errs,
                    touched: { name: true, phone: true, email: true },
                  }));
                  return;
                }

                updateContactMutation.mutate({
                  id: editContactModal.booking.id,
                  data: {
                    guest_name: nameTrimmed,
                    guest_phone: phoneTrimmed,
                    guest_email: emailTrimmed || undefined,
                    guest_note: editContactModal.note.trim() || undefined,
                  },
                });
              }}
              className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
            >
              {/* Locked / Read-only section */}
              <div className="bg-gray-100/80 rounded-2xl p-4 border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between border-b border-gray-200/70 pb-2">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} className="text-gray-500" />
                    Lịch trình dùng bữa (Cố định)
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">Không thể đổi trực tiếp</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Ngày đến:</span>
                    <span className="font-bold text-gray-800">{new Date(editContactModal.booking.start_time).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Giờ nhận bàn:</span>
                    <span className="font-bold text-gray-800">{new Date(editContactModal.booking.start_time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-gray-500 block">Số lượng khách:</span>
                    <span className="font-bold text-gray-800">{editContactModal.booking.party_size} người</span>
                  </div>
                </div>

                <p className="text-[10px] text-gray-500 italic pt-1 leading-tight">
                  * Ngày, giờ và số khách được cố định để nhà hàng đảm bảo chỗ ngồi. Nếu cần thay đổi lịch, quý khách vui lòng liên hệ hotline <strong>028 3829 4000</strong>.
                </p>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3.5 pt-1">
                {/* Họ và tên */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                    Họ và tên người đặt bàn <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${editContactModal.errors.name ? "text-rose-500" : "text-gray-400"}`} />
                    <input
                      type="text"
                      value={editContactModal.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditContactModal((prev) => ({
                          ...prev,
                          name: val,
                          errors: { ...prev.errors, name: val.trim() ? undefined : "Họ và tên không được để trống" },
                        }));
                      }}
                      placeholder="Nguyễn Văn A"
                      className={`w-full rounded-2xl border pl-10 pr-4 py-2.5 text-xs text-client-text outline-none transition-all bg-white ${editContactModal.errors.name
                          ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 text-rose-950"
                          : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                        }`}
                    />
                  </div>
                  {editContactModal.errors.name && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {editContactModal.errors.name}
                    </p>
                  )}
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${editContactModal.errors.phone ? "text-rose-500" : "text-gray-400"}`} />
                    <input
                      type="tel"
                      value={editContactModal.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setEditContactModal((prev) => ({
                          ...prev,
                          phone: val,
                          errors: {
                            ...prev.errors,
                            phone: val.length === 10 ? undefined : "Số điện thoại phải gồm 10 chữ số",
                          },
                        }));
                      }}
                      placeholder="0912345678"
                      className={`w-full rounded-2xl border pl-10 pr-4 py-2.5 text-xs text-client-text outline-none transition-all font-mono bg-white ${editContactModal.errors.phone
                          ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 text-rose-950"
                          : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                        }`}
                    />
                  </div>
                  {editContactModal.errors.phone && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {editContactModal.errors.phone}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                    Email nhận thông báo (Tùy chọn)
                  </label>
                  <div className="relative">
                    <Mail size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${editContactModal.errors.email ? "text-rose-500" : "text-gray-400"}`} />
                    <input
                      type="email"
                      value={editContactModal.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        setEditContactModal((prev) => ({
                          ...prev,
                          email: val,
                          errors: {
                            ...prev.errors,
                            email: !val || emailRegex.test(val.trim()) ? undefined : "Email không hợp lệ",
                          },
                        }));
                      }}
                      placeholder="nguyenvana@gmail.com"
                      className={`w-full rounded-2xl border pl-10 pr-4 py-2.5 text-xs text-client-text outline-none transition-all bg-white ${editContactModal.errors.email
                          ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 text-rose-950"
                          : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                        }`}
                    />
                  </div>
                  {editContactModal.errors.email && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {editContactModal.errors.email}
                    </p>
                  )}
                </div>

                {/* Ghi chú & Dịp đặc biệt */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                    Ghi chú / Lời dặn cho nhà hàng
                  </label>
                  <textarea
                    rows={2}
                    value={editContactModal.note}
                    onChange={(e) => setEditContactModal((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Ví dụ: Bàn gần cửa sổ, tiệc sinh nhật..."
                    className="w-full rounded-2xl border border-[#e8dfd5] p-3 text-xs outline-none focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20 resize-none bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#f0eae1]">
                <button
                  type="button"
                  onClick={() => setEditContactModal((prev) => ({ ...prev, isOpen: false, booking: null }))}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={updateContactMutation.isPending}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {updateContactMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
