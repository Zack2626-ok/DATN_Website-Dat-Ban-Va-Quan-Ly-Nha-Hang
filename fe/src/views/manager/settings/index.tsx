import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "../../../services/axiosInstance";
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

const COMMON_TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (GMT+07:00)" },
  { value: "GMT+07:00", label: "GMT+07:00" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (GMT+07:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (GMT+08:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+09:00)" },
  { value: "Europe/London", label: "Europe/London (GMT+00:00 / BST)" },
  { value: "America/New_York", label: "America/New_York (GMT-05:00 / EDT)" },
];

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0");
  const m = ((i % 4) * 15).toString().padStart(2, "0");
  return `${h}:${m}`;
});

const parseOpeningHours = (str) => {
  const fallback = {
    startDay: "Thứ 2",
    endDay: "Chủ nhật",
    startTime: "10:00",
    endTime: "22:00",
  };
  if (!str) return fallback;

  const colonIndex = str.indexOf(":");
  if (colonIndex === -1) return fallback;

  const daysPart = str.substring(0, colonIndex).trim();
  const timesPart = str.substring(colonIndex + 1).trim();

  const dayMatch = daysPart.split(/\s*[-–]\s*/);
  const timeMatch = timesPart.split(/\s*[-–]\s*/);

  if (dayMatch.length === 2 && timeMatch.length === 2) {
    return {
      startDay: dayMatch[0].trim(),
      endDay: dayMatch[1].trim(),
      startTime: timeMatch[0].trim(),
      endTime: timeMatch[1].trim(),
    };
  }

  return fallback;
};


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

  const [banks, setBanks] = useState<Array<{ code: string; name: string; bin: string; shortName: string; logo: string }>>([]);

  useEffect(() => {
    fetch("https://api.vietqr.io/v2/banks")
      .then((r) => r.json())
      .then((res) => {
        if (res && res.data) {
          setBanks(res.data);
        }
      })
      .catch((e) => console.error("Error loading bank list:", e));
  }, []);

  const selectedBankLogo = React.useMemo(() => {
    if (!settings?.bank_code) return "";
    const bank = banks.find((b) => b.code === settings.bank_code);
    return bank ? bank.logo : "";
  }, [settings?.bank_code, banks]);


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

  const parsedHours = React.useMemo(() => {
    return parseOpeningHours(settings?.opening_hours || "");
  }, [settings?.opening_hours]);

  const handleOpeningHoursChange = (
    field: "startDay" | "endDay" | "startTime" | "endTime",
    val: string
  ) => {
    if (!settings) return;
    const current = parseOpeningHours(settings.opening_hours || "");
    const updated = { ...current, [field]: val };
    const formatted = `${updated.startDay} - ${updated.endDay}: ${updated.startTime} - ${updated.endTime}`;
    handleChange("opening_hours", formatted);
  };

  const [uploadingQr, setUploadingQr] = useState(false);

  const getQrImageUrl = (imagePath?: string) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    const serverUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const cleanPath = imagePath.startsWith("/uploads/")
      ? imagePath.substring(9)
      : imagePath.startsWith("uploads/")
      ? imagePath.substring(8)
      : imagePath;
    return `${serverUrl}/uploads/${cleanPath}`;
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationToastId = toast.loading("Đang kiểm tra tính hợp lệ của ảnh mã QR...");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.dismiss(validationToastId);
          toast.error("Không thể xử lý hình ảnh này.");
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const jsQRModule = (await import("jsqr")).default;
          const code = jsQRModule(imageData.data, imageData.width, imageData.height);

          toast.dismiss(validationToastId);

          if (code) {
            toast.success("Hình ảnh hợp lệ! Đã phát hiện mã QR.");
            
            const formDataUpload = new FormData();
            formDataUpload.append("image", file);
            
            setUploadingQr(true);
            const res = await api.post("/upload", formDataUpload, {
              headers: { "Content-Type": "multipart/form-data" }
            });
            const returnedUrl = res.data.data.imageUrl;
            const filename = returnedUrl.startsWith("/uploads/")
              ? returnedUrl.substring(9)
              : returnedUrl.startsWith("uploads/")
              ? returnedUrl.substring(8)
              : returnedUrl;
            handleChange("bank_qr_code", filename);
            toast.success("Tải ảnh mã QR mới lên thành công!");
          } else {
            toast.error("Hình ảnh tải lên không chứa mã QR. Vui lòng chọn ảnh mã QR ngân hàng!");
          }
        } catch (err: any) {
          toast.dismiss(validationToastId);
          console.error(err);
          toast.error("Có lỗi xảy ra trong quá trình quét mã QR.");
        } finally {
          setUploadingQr(false);
        }
      };
      img.onerror = () => {
        toast.dismiss(validationToastId);
        toast.error("Không tải được tệp hình ảnh.");
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
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
      <div className="border-b border-sky-100 pb-4">
        <h1 className="text-2xl font-bold text-slate-600">Cấu hình hệ thống</h1>
        <p className="mt-1 text-sm text-slate-400">
          Thông tin nhà hàng, giờ hoạt động, thuế VAT và thông tin thanh toán
        </p>
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
      <SectionCard icon={<Clock size={18} />} title="Giờ hoạt động" description="Khung giờ mở cửa và múi giờ hệ thống">
        <div className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Giờ mở cửa</span>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="flex flex-col gap-2 text-xs text-slate-500">
              <span>Thứ bắt đầu</span>
              <select
                value={parsedHours.startDay}
                onChange={(e) => handleOpeningHoursChange("startDay", e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-slate-400 focus:outline-none h-[38px] cursor-pointer"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                {parsedHours.startDay && !DAYS_OF_WEEK.includes(parsedHours.startDay) && (
                  <option value={parsedHours.startDay}>{parsedHours.startDay}</option>
                )}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs text-slate-500">
              <span>Thứ kết thúc</span>
              <select
                value={parsedHours.endDay}
                onChange={(e) => handleOpeningHoursChange("endDay", e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-slate-400 focus:outline-none h-[38px] cursor-pointer"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                {parsedHours.endDay && !DAYS_OF_WEEK.includes(parsedHours.endDay) && (
                  <option value={parsedHours.endDay}>{parsedHours.endDay}</option>
                )}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs text-slate-500">
              <span>Giờ mở cửa (Từ)</span>
              <select
                value={parsedHours.startTime}
                onChange={(e) => handleOpeningHoursChange("startTime", e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-slate-400 focus:outline-none h-[38px] cursor-pointer"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {parsedHours.startTime && !TIME_OPTIONS.includes(parsedHours.startTime) && (
                  <option value={parsedHours.startTime}>{parsedHours.startTime}</option>
                )}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs text-slate-500">
              <span>Giờ đóng cửa (Đến)</span>
              <select
                value={parsedHours.endTime}
                onChange={(e) => handleOpeningHoursChange("endTime", e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-slate-400 focus:outline-none h-[38px] cursor-pointer"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {parsedHours.endTime && !TIME_OPTIONS.includes(parsedHours.endTime) && (
                  <option value={parsedHours.endTime}>{parsedHours.endTime}</option>
                )}
              </select>
            </label>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold">Múi giờ</span>
          <select
            value={settings?.timezone ?? ""}
            onChange={(e) => handleChange("timezone", e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 bg-white focus:border-slate-400 focus:outline-none h-[38px] cursor-pointer"
          >
            <option value="" disabled>-- Chọn múi giờ --</option>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
            {settings?.timezone && !COMMON_TIMEZONES.some((tz) => tz.value === settings.timezone) && (
              <option value={settings.timezone}>{settings.timezone}</option>
            )}
          </select>
        </label>
      </SectionCard>

      {/* Thuế VAT */}
      <SectionCard icon={<Percent size={18} />} title="Thuế VAT" description="Thuế suất VAT (%) áp dụng cho các đơn hàng và hóa đơn thanh toán">
        <Field label="VAT (%)" value={settings?.tax_rate ?? 0} onChange={(v) => handleChange("tax_rate", Number(v))} type="number" />
      </SectionCard>

      {/* Thông tin ngân hàng nhận chuyển khoản */}
      <SectionCard icon={<Landmark size={18} />} title="Thông tin nhận chuyển khoản" description="Hiển thị khi khách chọn thanh toán bằng chuyển khoản / QR ngân hàng">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold">Ngân hàng</span>
          <div className="flex items-center gap-3">
            {selectedBankLogo && (
              <img
                src={selectedBankLogo}
                alt="Bank Logo"
                className="h-9 w-auto max-w-[80px] object-contain shrink-0 rounded-md border border-slate-150 bg-white p-1 shadow-2xs"
              />
            )}
            <select
              value={settings?.bank_code ?? ""}
              onChange={(e) => {
                const selectedCode = e.target.value;
                const bank = banks.find((b) => b.code === selectedCode);
                if (bank && settings) {
                  setSettings({
                    ...settings,
                    bank_code: bank.code,
                    bank_name: bank.name,
                  });
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-700 focus:border-slate-400 focus:outline-none h-[38px] cursor-pointer"
            >
              <option value="" disabled>-- Chọn ngân hàng --</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.shortName} - {b.name}
                </option>
              ))}
              {settings?.bank_code && !banks.some((b) => b.code === settings.bank_code) && (
                <option value={settings.bank_code}>
                  {settings.bank_code} - {settings.bank_name}
                </option>
              )}
            </select>
          </div>
        </label>
        <Field label="Mã ngân hàng (BIN)" value={settings?.bank_code ?? ""} onChange={(v) => handleChange("bank_code", v)} placeholder="VD: 970436" />
        <Field label="Số tài khoản" value={settings?.bank_account ?? ""} onChange={(v) => handleChange("bank_account", v)} />
        <Field label="Chủ tài khoản" value={settings?.bank_account_name ?? ""} onChange={(v) => handleChange("bank_account_name", v)} />
        
        <div className="flex flex-col gap-2 text-sm text-slate-700 md:col-span-2">
          <span className="font-semibold">Mã QR tài khoản ngân hàng</span>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {settings?.bank_qr_code ? (
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
                <img
                  src={getQrImageUrl(settings.bank_qr_code)}
                  alt="Bank QR Code"
                  className="h-full w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => handleChange("bank_qr_code", "")}
                  className="absolute top-1 right-1 rounded-full bg-rose-500 p-1 text-white hover:bg-rose-600 transition-colors shadow-xs cursor-pointer flex items-center justify-center"
                  title="Xóa QR"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="h-32 w-32 shrink-0 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[10px] font-medium">Chưa có mã QR</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-xs transition-colors self-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>{uploadingQr ? "Đang tải lên..." : "Tải lên mã QR mới"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  disabled={uploadingQr}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                Tải lên hình ảnh chứa mã QR ngân hàng của bạn. Hệ thống sẽ tự động quét và kiểm tra xem ảnh có chứa mã QR thanh toán hợp lệ hay không trước khi lưu.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end border-t border-sky-100 pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !settings}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer shadow-xs transition-all animate-fade-in"
        >
          <Save size={16} />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
};

export default SystemSettingsPage;