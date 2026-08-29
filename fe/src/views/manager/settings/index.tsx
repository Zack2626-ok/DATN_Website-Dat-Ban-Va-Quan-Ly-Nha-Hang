import React, { useEffect, useState } from "react";
import {
  Building2,
  Clock,
  Percent,
  Landmark,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { managerDashboardService } from "../../../services/managerDashboardService";
import type { RestaurantInfo } from "../../../services/restaurantInfoService";

type SectionCardProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ icon, title, description, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">{children}</div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  full?: boolean;
}> = ({ label, value, onChange, type = "text", placeholder, full }) => (
  <label className={`flex flex-col gap-2 text-sm text-slate-700 ${full ? "md:col-span-2" : ""}`}>
    <span className="font-semibold">{label}</span>
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
    />
  </label>
);

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await managerDashboardService.getSystemSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load system settings:", err);
        setError("Không tải được cấu hình hệ thống. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field: keyof RestaurantInfo, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await managerDashboardService.updateSystemSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save system settings:", err);
      setError("Lưu cấu hình thất bại. Vui lòng kiểm tra lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-slate-500">Đang tải cấu hình hệ thống...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-sky-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-600">Cấu hình hệ thống</h1>
          <p className="mt-1 text-sm text-slate-400">
            Thông tin nhà hàng, giờ hoạt động, thuế VAT và thông tin thanh toán
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !settings}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:self-auto cursor-pointer"
        >
          <Save size={16} />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>

      {(error || saved) && (
        <div className="space-y-2">
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              Cập nhật cấu hình hệ thống thành công.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Thông tin chung */}
      <SectionCard icon={<Building2 size={18} />} title="Thông tin nhà hàng" description="Tên, địa chỉ và kênh liên hệ hiển thị cho khách hàng">
        <Field label="Tên nhà hàng" value={settings?.name ?? ""} onChange={(v) => handleChange("name", v)} full />
        <Field label="Địa chỉ" value={settings?.address ?? ""} onChange={(v) => handleChange("address", v)} full />
        <Field label="Hotline" value={settings?.hotline ?? ""} onChange={(v) => handleChange("hotline", v)} />
        <Field label="Giờ trực hotline" value={settings?.hotline_hours ?? ""} onChange={(v) => handleChange("hotline_hours", v)} placeholder="VD: 8:00 - 22:00" />
        <Field label="Email" value={settings?.email ?? ""} onChange={(v) => handleChange("email", v)} type="email" />
        <Field label="Link bản đồ (Google Maps)" value={settings?.map_url ?? ""} onChange={(v) => handleChange("map_url", v)} />
      </SectionCard>

      {/* Giờ hoạt động */}
      <SectionCard icon={<Clock size={18} />} title="Giờ hoạt động" description="Khung giờ mở cửa, nhận khách và múi giờ hệ thống">
        <Field label="Giờ mở cửa" value={settings?.opening_hours ?? ""} onChange={(v) => handleChange("opening_hours", v)} placeholder="VD: Thứ 2 - Chủ nhật: 10:00 - 22:00" />
        <Field label="Múi giờ" value={settings?.timezone ?? ""} onChange={(v) => handleChange("timezone", v)} placeholder="VD: Asia/Ho_Chi_Minh" />
        <Field label="Khách online" value={settings?.online_booking_hours ?? ""} onChange={(v) => handleChange("online_booking_hours", v)} placeholder="VD: 10:00 – 13:45 và 17:00 – 20:30" />
        <Field label="Khách trực tiếp" value={settings?.walk_in_hours ?? ""} onChange={(v) => handleChange("walk_in_hours", v)} placeholder="VD: 10:00 – 14:00 và 17:00 – 21:00" />
      </SectionCard>

      {/* Thuế VAT */}
      <SectionCard icon={<Percent size={18} />} title="Thuế VAT" description="Thuế suất VAT (%) áp dụng cho các đơn hàng và hóa đơn thanh toán">
        <Field label="VAT (%)" value={settings?.tax_rate ?? 0} onChange={(v) => handleChange("tax_rate", Number(v))} type="number" />
      </SectionCard>

      {/* Thông tin ngân hàng nhận chuyển khoản */}
      <SectionCard icon={<Landmark size={18} />} title="Thông tin nhận chuyển khoản" description="Hiển thị khi khách chọn thanh toán bằng chuyển khoản / QR ngân hàng">
        <Field label="Ngân hàng" value={settings?.bank_name ?? ""} onChange={(v) => handleChange("bank_name", v)} placeholder="VD: Vietcombank" />
        <Field label="Mã ngân hàng (BIN)" value={settings?.bank_code ?? ""} onChange={(v) => handleChange("bank_code", v)} placeholder="VD: 970436" />
        <Field label="Số tài khoản" value={settings?.bank_account ?? ""} onChange={(v) => handleChange("bank_account", v)} />
        <Field label="Chủ tài khoản" value={settings?.bank_account_name ?? ""} onChange={(v) => handleChange("bank_account_name", v)} />
      </SectionCard>
    </div>
  );
};

export default SystemSettingsPage;