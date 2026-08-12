import React, { useState, useEffect, useMemo, startTransition } from "react";
import {
  Users,
  Ticket,
  Search,
  Plus,
  Edit2,
  Trash2,
  History,
  Award,
  X,
  User,
  Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../../utils/formatCurrency";
import {
  crmService,
  Customer,
  LoyaltyTransaction,
  Voucher,
} from "../../../services/crmService";

/** Derives the visible membership tier from the customer's accumulated points. */
const getMemberLevelFromPoints = (points: number): Customer["member_level"] => {
  if (points >= 20000) return "vip";
  if (points >= 8000) return "gold";
  if (points >= 2000) return "silver";
  return "bronze";
};

export const CRMManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"customers" | "vouchers" | "promotions">("customers");
  const [loading, setLoading] = useState<boolean>(true);

  // States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const [reactivateModal, setReactivateModal] = useState<{
    isOpen: boolean;
    voucher: Voucher | null;
    expiredAt: string;
  }>({ isOpen: false, voucher: null, expiredAt: "" });

  // Modals
  const [customerModal, setCustomerModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data?: Customer;
  }>({ isOpen: false, mode: "create" });

  const [voucherModal, setVoucherModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    data?: Voucher;
  }>({ isOpen: false, mode: "create" });

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    customer?: Customer;
    logs: LoyaltyTransaction[];
    loadingLogs: boolean;
  }>({ isOpen: false, logs: [], loadingLogs: false });

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    loyalty_points: 0,
  });

  const [voucherForm, setVoucherForm] = useState({
    code: "",
    type: "percent" as "percent" | "fixed",
    value: 0,
    min_order: 0,
    max_uses: "" as string | number,
    expired_at: "",
    is_active: 1,
  });

  // Fetch all datasets
  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, vRes] = await Promise.all([
        crmService.getCustomers(),
        crmService.getVouchers(),
      ]);
      setCustomers(cRes);
      setVouchers(vRes);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải thông tin CRM");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Không thời hạn";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  // ============================================================================
  // CUSTOMER HANDLERS
  // ============================================================================

  const handleOpenCustomerModal = (mode: "create" | "edit", data?: Customer) => {
    setCustomerModal({ isOpen: true, mode, data });
    if (mode === "edit" && data) {
      setCustomerForm({
        name: data.name,
        email: data.email || "",
        phone: data.phone || "",
        loyalty_points: data.loyalty_points,
      });
    } else {
      setCustomerForm({ name: "", email: "", phone: "", loyalty_points: 0 });
    }
  };

  const submitCustomerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      toast.error("Tên khách hàng bắt buộc");
      return;
    }
    try {
      if (customerModal.mode === "create") {
        await crmService.createCustomer(customerForm);
        toast.success("Thêm khách hàng thành công");
      } else if (customerModal.mode === "edit" && customerModal.data) {
        await crmService.updateCustomer(customerModal.data.id, customerForm);
        toast.success("Cập nhật thông tin khách hàng thành công");
      }
      setCustomerModal({ isOpen: false, mode: "create" });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi xử lý khách hàng");
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) return;
    try {
      await crmService.deleteCustomer(id);
      toast.success("Xóa khách hàng thành công");
      loadData();
    } catch (err: any) {
      toast.error("Không thể xóa khách hàng");
    }
  };

  const showLoyaltyHistory = async (customer: Customer) => {
    setHistoryModal({ isOpen: true, customer, logs: [], loadingLogs: true });
    try {
      const history = await crmService.getCustomerLoyalty(customer.id);
      setHistoryModal((prev) => ({ ...prev, logs: history, loadingLogs: false }));
    } catch (err: any) {
      toast.error("Không thể tải lịch sử điểm loyalty");
      setHistoryModal((prev) => ({ ...prev, loadingLogs: false }));
    }
  };

  // ============================================================================
  // VOUCHER HANDLERS
  // ============================================================================

  const handleOpenVoucherModal = (mode: "create" | "edit", data?: Voucher) => {
    setVoucherModal({ isOpen: true, mode, data });
    if (mode === "edit" && data) {
      setVoucherForm({
        code: data.code,
        type: data.type,
        value: data.value,
        min_order: data.min_order,
        max_uses: data.max_uses ?? "",
        expired_at: data.expired_at ? new Date(data.expired_at).toISOString().slice(0, 16) : "",
        is_active: data.is_active,
      });
    } else {
      setVoucherForm({
        code: "",
        type: "percent",
        value: 0,
        min_order: 0,
        max_uses: "",
        expired_at: "",
        is_active: 1,
      });
    }
  };

  const submitVoucherForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.code.trim()) {
      toast.error("Mã voucher bắt buộc");
      return;
    }
    if (voucherForm.type === "percent" && (voucherForm.value < 0 || voucherForm.value > 100)) {
      toast.error("Giá trị % giảm phải từ 0 đến 100%");
      return;
    }
    try {
      const payload = {
        ...voucherForm,
        code: voucherForm.code.toUpperCase(),
        max_uses: voucherForm.max_uses !== "" ? Number(voucherForm.max_uses) : null,
        expired_at: voucherForm.expired_at ? new Date(voucherForm.expired_at).toISOString() : null,
      };

      if (voucherModal.mode === "create") {
        await crmService.createVoucher(payload);
        toast.success("Tạo voucher mới thành công");
      } else if (voucherModal.mode === "edit" && voucherModal.data) {
        await crmService.updateVoucher(voucherModal.data.id, payload);
        toast.success("Cập nhật voucher thành công");
      }
      setVoucherModal({ isOpen: false, mode: "create" });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi xử lý voucher");
    }
  };

  const toggleVoucherActive = async (voucher: Voucher) => {
    try {
      if (voucher.is_active === 1) {
        // Tắt kích hoạt - Dùng toggle PATCH api để không ảnh hưởng đến hạn dùng & đơn tối thiểu trong db
        await crmService.toggleVoucher(voucher.id, 0);
        toast.success("Đã tắt kích hoạt voucher");
        loadData();
      } else {
        // Bật kích hoạt - Hiển thị popup nhỏ đặt lại hạn dùng
        setReactivateModal({
          isOpen: true,
          voucher,
          expiredAt: voucher.expired_at ? new Date(voucher.expired_at).toISOString().slice(0, 16) : "",
        });
      }
    } catch (err: any) {
      toast.error("Lỗi thay đổi trạng thái");
    }
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateModal.voucher) return;
    try {
      const v = reactivateModal.voucher;
      await crmService.updateVoucher(v.id, {
        code: v.code,
        type: v.type,
        value: v.value,
        min_order: v.min_order,
        max_uses: v.max_uses,
        expired_at: reactivateModal.expiredAt || null,
        is_active: 1,
      });
      toast.success("Kích hoạt lại voucher thành công");
      setReactivateModal({ isOpen: false, voucher: null, expiredAt: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi kích hoạt voucher");
    }
  };

  const deleteVoucher = async (id: number) => {
    if (!window.confirm("Hủy kích hoạt voucher này?")) return;
    try {
      await crmService.deleteVoucher(id);
      toast.success("Hủy kích hoạt thành công");
      loadData();
    } catch (err: any) {
      toast.error("Không thể hủy");
    }
  };

  // ============================================================================
  // PROMOTION HANDLERS
  // ============================================================================

  // Filter lists based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  const filteredVouchers = useMemo(() => {
    if (!searchTerm) return vouchers;
    const term = searchTerm.toLowerCase();
    return vouchers.filter((v) => v.code.toLowerCase().includes(term));
  }, [vouchers, searchTerm]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const paginatedVouchers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVouchers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVouchers, currentPage]);

  // Stylized tier badges helper
  const renderTierBadge = (tier: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      vip: { label: "VIP", className: "bg-purple-100 text-purple-700 border border-purple-300 font-black uppercase text-xs" },
      gold: { label: "Vàng", className: "bg-amber-100 text-amber-700 border border-amber-300 font-extrabold uppercase text-xs" },
      silver: { label: "Bạc", className: "bg-blue-100 text-blue-700 border border-blue-300 font-bold uppercase text-xs" },
      bronze: { label: "Đồng", className: "bg-gray-100 text-gray-700 border border-gray-300 text-xs" },
    };
    const c = configs[tier] || configs.bronze;
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] select-none tracking-wider ${c.className}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Chăm sóc khách hàng & CRM
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Quản lý quan hệ khách hàng (CRM), thẻ điểm thành viên (Loyalty), vouchers và các ưu đãi sự kiện
          </p>
        </div>

        {/* Action Button */}
        {activeTab === "customers" && (
          <button
            type="button"
            onClick={() => handleOpenCustomerModal("create")}
            className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={18} /> Thêm khách hàng
          </button>
        )}
        {activeTab === "vouchers" && (
          <button
            type="button"
            onClick={() => handleOpenVoucherModal("create")}
            className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={18} /> Thêm Voucher
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="bg-[#FFFFFF] p-3 rounded-3xl border border-slate-200/70 shadow-xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setActiveTab("customers");
              setSearchTerm("");
            });
          }}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "customers"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <Users size={15} />
          Thành viên & CRM
        </button>

        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setActiveTab("vouchers");
              setSearchTerm("");
            });
          }}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "vouchers"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <Ticket size={15} />
          Mã ưu đãi (Vouchers)
        </button>
      </div>



      {/* Search Toolbar */}
      <div className="bg-[#FFFFFF] p-3.5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A8A]" size={17} />
          <input
            placeholder={
              activeTab === "customers"
                ? "Tìm kiếm tên, số điện thoại, email..."
                : "Tìm kiếm theo mã voucher..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#3E2016]/30 transition-all border-0"
          />
        </div>
      </div>

      {/* Main Tab Panels */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center gap-2">
          <div className="w-8 h-8 border-2 border-admin-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-admin-text-sub">Đang tải dữ liệu tiếp thị...</span>
        </div>
      ) : (
        <>
          {activeTab === "customers" && (
            <div className="bg-admin-card rounded-2xl border border-admin-border shadow-xs overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 font-bold text-admin-text-sub border-b border-admin-border text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Tên khách</th>
                    <th className="px-6 py-4">Số điện thoại</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Hạng</th>
                    <th className="px-6 py-4">Điểm tích lũy</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {paginatedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-admin-text-sub">
                        Không tìm thấy khách hàng nào.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-admin-primary-light/10 transition-colors">
                        <td className="px-6 py-4 font-bold text-admin-text-main">{c.name}</td>
                        <td className="px-6 py-4 text-admin-text-sub font-mono">{c.phone || "—"}</td>
                        <td className="px-6 py-4 text-admin-text-sub">{c.email || "—"}</td>
                        <td className="px-6 py-4">{renderTierBadge(getMemberLevelFromPoints(c.loyalty_points))}</td>
                        <td className="px-6 py-4 font-bold text-admin-primary font-mono">
                          {c.loyalty_points.toLocaleString("vi-VN")} pts
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => showLoyaltyHistory(c)}
                              className="p-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer"
                              title="Lịch sử tích điểm"
                            >
                              <History size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenCustomerModal("edit", c)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => deleteCustomer(c.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredCustomers.length > 0 && Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)}
                      className="relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        Hiển thị từ <span className="font-semibold text-slate-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> đến{" "}
                        <span className="font-semibold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}</span> trong tổng số{" "}
                        <span className="font-semibold text-slate-700">{filteredCustomers.length}</span> khách hàng
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md gap-1" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                          Trước
                        </button>
                        {Array.from({ length: Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? "z-10 bg-blue-600 text-white"
                                : "text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:outline-none"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={currentPage === Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE)}
                          className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                          Sau
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "vouchers" && (
            <div className="bg-admin-card rounded-2xl border border-admin-border shadow-xs overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 font-bold text-admin-text-sub border-b border-admin-border text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Mã Voucher</th>
                    <th className="px-6 py-4">Kiểu giảm</th>
                    <th className="px-6 py-4">Mức giảm</th>
                    <th className="px-6 py-4">Đơn tối thiểu</th>
                    <th className="px-6 py-4">Đã dùng / Giới hạn</th>
                    <th className="px-6 py-4">Hạn sử dụng</th>
                    <th className="px-6 py-4">Kích hoạt</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {paginatedVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-admin-text-sub">
                        Không có voucher nào.
                      </td>
                    </tr>
                  ) : (
                    paginatedVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-admin-primary-light/10 transition-colors">
                        <td className="px-6 py-4 font-black font-mono text-emerald-700">{v.code}</td>
                        <td className="px-6 py-4">
                          {v.type === "percent" ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                              Phần trăm (%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                              Tiền mặt (đ)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold">
                          {v.type === "percent" ? `${v.value}%` : formatCurrency(v.value)}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">
                          {formatCurrency(v.min_order)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          {v.used_count} / {v.max_uses ?? "Không giới hạn"}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                          {formatDate(v.expired_at)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleVoucherActive(v)}
                            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                              v.is_active === 1 ? "bg-emerald-500" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                                v.is_active === 1 ? "translate-x-4.5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenVoucherModal("edit", v)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => deleteVoucher(v.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Hủy kích hoạt"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredVouchers.length > 0 && Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE)}
                      className="relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        Hiển thị từ <span className="font-semibold text-slate-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> đến{" "}
                        <span className="font-semibold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, filteredVouchers.length)}</span> trong tổng số{" "}
                        <span className="font-semibold text-slate-700">{filteredVouchers.length}</span> voucher
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md gap-1" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                          Trước
                        </button>
                        {Array.from({ length: Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? "z-10 bg-blue-600 text-white"
                                : "text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:outline-none"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE), p + 1))}
                          disabled={currentPage === Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE)}
                          className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                          Sau
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================================================
          REACTIVATE VOUCHER MODAL
          ============================================================================ */}
      {reactivateModal.isOpen && reactivateModal.voucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            <div className="p-5 border-b border-admin-border flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Ticket className="text-emerald-600" size={18} />
                Kích hoạt lại Voucher
              </h3>
              <button
                onClick={() => setReactivateModal({ isOpen: false, voucher: null, expiredAt: "" })}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Voucher <span className="font-bold text-emerald-700 font-mono">#{reactivateModal.voucher.code}</span> đang được kích hoạt lại. Vui lòng thiết lập hạn sử dụng mới cho voucher này:
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hạn sử dụng</label>
                <input
                  type="datetime-local"
                  value={reactivateModal.expiredAt}
                  onChange={(e) => setReactivateModal({ ...reactivateModal, expiredAt: e.target.value })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="text-[10px] text-gray-400 block mt-1">Để trống nếu muốn áp dụng không thời hạn.</span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReactivateModal({ isOpen: false, voucher: null, expiredAt: "" })}
                  className="px-4 py-2 border border-admin-border rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReactivate}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Kích hoạt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          CUSTOMER MODAL
          ============================================================================ */}
      {customerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User className="text-admin-primary" size={20} />
                {customerModal.mode === "create" ? "Thêm khách hàng thành viên" : "Cập nhật khách hàng"}
              </h3>
              <button
                onClick={() => setCustomerModal({ isOpen: false, mode: "create" })}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitCustomerForm} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên khách hàng..."
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0912345678"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="Ví dụ: khachhang@gmail.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Điểm Loyalty ban đầu</label>
                <input
                  type="number"
                  min="0"
                  value={customerForm.loyalty_points}
                  onChange={(e) => setCustomerForm({ ...customerForm, loyalty_points: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20 font-mono"
                />
                <p className="text-[10px] text-gray-400">Tự động phân hạng: Đồng (&lt;100), Bạc (&ge;100), Vàng (&ge;300), VIP (&ge;500).</p>
              </div>

              <div className="pt-4 border-t border-admin-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerModal({ isOpen: false, mode: "create" })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-admin-primary hover:bg-admin-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          VOUCHER MODAL
          ============================================================================ */}
      {voucherModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Ticket className="text-admin-primary" size={20} />
                {voucherModal.mode === "create" ? "Tạo Voucher Giảm Giá mới" : "Chỉnh sửa Voucher"}
              </h3>
              <button
                onClick={() => setVoucherModal({ isOpen: false, mode: "create" })}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitVoucherForm} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mã Voucher (In hoa, duy nhất) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: NHATHANG50"
                  value={voucherForm.code}
                  onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20 font-black font-mono text-emerald-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kiểu Voucher *</label>
                  <select
                    value={voucherForm.type}
                    onChange={(e) => setVoucherForm({ ...voucherForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-admin-primary/20 font-bold"
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Tiền mặt (đ)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {voucherForm.type === "percent" ? "Mức giảm (%) *" : "Số tiền giảm (đ) *"}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={voucherForm.type === "percent" ? "100" : undefined}
                    value={voucherForm.value}
                    onChange={(e) => setVoucherForm({ ...voucherForm, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Đơn tối thiểu (đ)</label>
                  <input
                    type="number"
                    min="0"
                    value={voucherForm.min_order}
                    onChange={(e) => setVoucherForm({ ...voucherForm, min_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lượt dùng tối đa</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Không giới hạn"
                    value={voucherForm.max_uses}
                    onChange={(e) => setVoucherForm({ ...voucherForm, max_uses: e.target.value })}
                    className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hạn sử dụng</label>
                <input
                  type="datetime-local"
                  value={voucherForm.expired_at}
                  onChange={(e) => setVoucherForm({ ...voucherForm, expired_at: e.target.value })}
                  className="w-full px-3 py-2 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-admin-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVoucherModal({ isOpen: false, mode: "create" })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-admin-primary hover:bg-admin-primary-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================
          PROMOTION MODAL
          ============================================================================ */}


      {/* ============================================================================
          LOYALTY TRANSACTION HISTORY MODAL
          ============================================================================ */}
      {historyModal.isOpen && historyModal.customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-scale-up">
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Award className="text-admin-primary" size={20} />
                  Lịch sử tích/tiêu điểm Loyalty
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Thành viên: <strong className="text-gray-700">{historyModal.customer.name}</strong> |
                  SĐT: <strong className="text-gray-700">{historyModal.customer.phone || "—"}</strong> |
                  Tích lũy: <strong className="text-admin-primary">{historyModal.customer.loyalty_points} pts</strong>
                </p>
              </div>
              <button
                onClick={() => setHistoryModal({ isOpen: false, logs: [], loadingLogs: false })}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {historyModal.loadingLogs ? (
                <div className="py-12 flex flex-col justify-center items-center gap-2">
                  <div className="w-6 h-6 border-2 border-admin-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-admin-text-sub">Đang tải lịch sử giao dịch...</span>
                </div>
              ) : historyModal.logs.length === 0 ? (
                <div className="py-12 text-center text-admin-text-sub flex flex-col items-center gap-2">
                  <Info size={32} className="opacity-30" />
                  <span>Khách hàng chưa có lịch sử tích lũy hay tiêu điểm.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyModal.logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700">{log.note || "Tích điểm tự động"}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{formatDate(log.created_at)}</p>
                        {log.invoice_total && (
                          <p className="text-xs text-gray-500 font-medium">
                            Giá trị hóa đơn: <strong className="text-gray-700">{formatCurrency(log.invoice_total)}</strong>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-xs ${
                            log.type === "earn"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {log.type === "earn" ? `+${log.points}` : `-${log.points}`} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-admin-border flex justify-end">
              <button
                onClick={() => setHistoryModal({ isOpen: false, logs: [], loadingLogs: false })}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
