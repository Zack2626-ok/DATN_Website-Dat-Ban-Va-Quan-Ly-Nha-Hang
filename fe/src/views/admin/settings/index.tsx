import React, { useState, useEffect } from "react";
import { Save, Settings, Loader2 } from "lucide-react";
import {
  getRestaurantInfo,
  updateRestaurantInfo,
  type RestaurantInfo,
} from "../../../services/restaurantInfoService";

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"general" | "tax">("general");
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
      <div className="flex flex-col justify-between gap-4 border-b border-sky-100 pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Cấu hình hệ thống</h1>
          <p className="mt-1 text-sm text-slate-500">Thiết lập thông tin nhà hàng, thuế và phí dịch vụ</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 border border-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl p-2">
        {[
          { key: "general" as const, label: "Thông tin chung" },
          { key: "tax" as const, label: "Thuế & Phí DV" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium cursor-pointer ${
              activeTab === tab.key ? "bg-sky-100 border-sky-200 text-white" : "text-slate-600 hover:bg-white/80 backdrop-blur-xl"
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

      <div className="rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {activeTab === "general" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Tên nhà hàng</span>
              <input
                type="text"
                value={info?.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Địa chỉ</span>
              <input
                type="text"
                value={info?.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Hotline</span>
              <input
                type="text"
                value={info?.hotline || ""}
                onChange={(e) => handleChange("hotline", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Giờ hỗ trợ hotline</span>
              <input
                type="text"
                value={info?.hotline_hours || ""}
                onChange={(e) => handleChange("hotline_hours", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Email</span>
              <input
                type="email"
                value={info?.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Giờ mở cửa</span>
              <input
                type="text"
                value={info?.opening_hours || ""}
                onChange={(e) => handleChange("opening_hours", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Múi giờ</span>
              <select
                value={info?.timezone || "GMT+07:00"}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              >
                <option value="GMT+07:00">GMT+07:00 (Hà Nội, TP.HCM)</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">VAT (%)</span>
              <input
                type="number"
                value={info?.tax_rate ?? 10}
                onChange={(e) => handleChange("tax_rate", Number(e.target.value))}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Phí dịch vụ (%)</span>
              <input
                type="number"
                value={info?.service_fee_rate ?? 5}
                onChange={(e) => handleChange("service_fee_rate", Number(e.target.value))}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
              <span className="font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Phương thức thanh toán mặc định</span>
              <select
                value={info?.default_payment_method || "cash"}
                onChange={(e) => handleChange("default_payment_method", e.target.value)}
                className="rounded-lg border border-sky-100 px-3 py-2 focus:border-blue-700 focus:outline-none"
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank_transfer">Chuyển khoản</option>
                <option value="card">Thẻ / Ví điện tử</option>
              </select>
            </label>
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
