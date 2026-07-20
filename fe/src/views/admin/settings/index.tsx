import React, { useState, useEffect } from "react";
import { Save, Settings, Loader2 } from "lucide-react";
import {
  getRestaurantInfo,
  updateRestaurantInfo,
  type RestaurantInfo,
} from "../../../services/restaurantInfoService";

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "tax" | "bank">("general");
  const [savedMessage, setSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    getRestaurantInfo()
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof RestaurantInfo, value: string | number) => {
    if (!info) return;
    setInfo({ ...info, [field]: value });
  };

  const handleSave = async () => {
    if (!info) return;
    setSaving(true);
    try {
      const updated = await updateRestaurantInfo(info);
      setInfo(updated);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
    } catch (err) {
      console.error("Failed to save restaurant info:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 border-b border-amber-500/20 pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Cấu hình hệ thống</h1>
          <p className="mt-1 text-sm text-slate-400">Thiết lập thông tin nhà hàng, thuế và phí dịch vụ</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 border-amber-500/30 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-amber-500/20 bg-[#1C2541]/40 backdrop-blur-xl p-2">
        {[
          { key: "general" as const, label: "Thông tin chung" },
          { key: "tax" as const, label: "Thuế & Phí DV" },
          { key: "bank" as const, label: "Ngân hàng (VietQR)" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium cursor-pointer ${
              activeTab === tab.key ? "bg-amber-500/20 border-amber-500/30 text-white" : "text-slate-300 hover:bg-[#1C2541]/80 backdrop-blur-md"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {savedMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Cập nhật cấu hình thành công!
        </div>
      )}

      <div className="rounded-xl border border-amber-500/20 bg-[#1C2541]/40 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {activeTab === "general" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Tên nhà hàng</span>
              <input
                type="text"
                value={info?.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Địa chỉ</span>
              <input
                type="text"
                value={info?.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Hotline</span>
              <input
                type="text"
                value={info?.hotline || ""}
                onChange={(e) => handleChange("hotline", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Giờ hỗ trợ hotline</span>
              <input
                type="text"
                value={info?.hotline_hours || ""}
                onChange={(e) => handleChange("hotline_hours", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Email</span>
              <input
                type="email"
                value={info?.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Giờ mở cửa</span>
              <input
                type="text"
                value={info?.opening_hours || ""}
                onChange={(e) => handleChange("opening_hours", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Múi giờ</span>
              <select
                value={info?.timezone || "GMT+07:00"}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              >
                <option value="GMT+07:00">GMT+07:00 (Hà Nội, TP.HCM)</option>
              </select>
            </label>
           </div>
        ) : activeTab === "tax" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">VAT (%)</span>
              <input
                type="number"
                value={info?.tax_rate ?? 10}
                onChange={(e) => handleChange("tax_rate", Number(e.target.value))}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Phí dịch vụ (%)</span>
              <input
                type="number"
                value={info?.service_fee_rate ?? 5}
                onChange={(e) => handleChange("service_fee_rate", Number(e.target.value))}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Phương thức thanh toán mặc định</span>
              <select
                value={info?.default_payment_method || "cash"}
                onChange={(e) => handleChange("default_payment_method", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank_transfer">Chuyển khoản</option>
                <option value="card">Thẻ / Ví điện tử</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Mã ngân hàng (VietQR)</span>
              <select
                value={info?.bank_code || "VCB"}
                onChange={(e) => handleChange("bank_code", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              >
                <option value="VCB">Vietcombank (VCB)</option>
                <option value="TCB">Techcombank (TCB)</option>
                <option value="MB">MB Bank (MB)</option>
                <option value="ACB">ACB</option>
                <option value="BIDV">BIDV</option>
                <option value="VIB">VIB</option>
                <option value="TPB">TPBank (TPB)</option>
                <option value="CTG">VietinBank (CTG)</option>
                <option value="AGG">Agribank (AGG)</option>
                <option value="SACOMBANK">Sacombank</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Số tài khoản</span>
              <input
                type="text"
                value={info?.bank_account || ""}
                onChange={(e) => handleChange("bank_account", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Tên ngân hàng</span>
              <input
                type="text"
                value={info?.bank_name || ""}
                onChange={(e) => handleChange("bank_name", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-amber-400 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Tên chủ tài khoản</span>
              <input
                type="text"
                value={info?.bank_account_name || ""}
                onChange={(e) => handleChange("bank_account_name", e.target.value)}
                className="rounded-lg border border-amber-500/20 px-3 py-2 focus:border-blue-700 focus:outline-none bg-white/5 text-white"
              />
            </label>
            {info?.bank_code && info?.bank_account && (
              <div className="md:col-span-2 flex flex-col items-center gap-2 bg-white/5 rounded-xl p-4 border border-amber-500/20">
                <span className="text-xs text-amber-400 font-bold">Xem trước VietQR</span>
                <img
                  src={`https://img.vietqr.io/image/${info.bank_code}-${info.bank_account}-compact2.png?amount=100000&addInfo=Test`}
                  alt="VietQR Preview"
                  className="w-40 h-40 rounded-lg bg-white"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Settings size={14} />
        Chỉ Admin/Chủ nhà hàng có quyền thay đổi cấu hình hệ thống
      </div>
    </div>
  );
};
