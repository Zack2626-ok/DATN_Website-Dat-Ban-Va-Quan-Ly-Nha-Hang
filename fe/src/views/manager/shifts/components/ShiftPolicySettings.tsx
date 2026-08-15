import React, { useEffect, useState } from "react";
import { Clock3, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import type { ShiftPolicy, ShiftTemplate } from "../../../../services/scheduleService";
import * as scheduleService from "../../../../services/scheduleService";

/** Extracts a safe API message from an Axios-like error value. */
const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") return data.message;
    }
  }
  return "Không thể cập nhật cấu hình ca làm.";
};

/** Manages reusable templates and grace-period rules used by the whole restaurant. */
export const ShiftPolicySettings: React.FC = () => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [policy, setPolicy] = useState<ShiftPolicy>({ grace_minutes: 15, require_late_reason: true, require_early_reason: true });
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("15:00");
  const [saving, setSaving] = useState(false);

  /** Loads centralized shift settings for the manager screen. */
  const load = async (): Promise<void> => {
    try {
      const [templateData, policyData] = await Promise.all([scheduleService.getShiftTemplates(), scheduleService.getShiftPolicy()]);
      setTemplates(templateData);
      setPolicy(policyData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => { void load(); }, []);

  /** Adds a new reusable time window after basic client-side validation. */
  const handleCreate = async (): Promise<void> => {
    if (!name.trim() || startTime >= endTime) {
      toast.error("Nhập tên ca và giờ bắt đầu phải sớm hơn giờ kết thúc.");
      return;
    }
    try {
      setSaving(true);
      await scheduleService.createShiftTemplate({ name: name.trim(), start_time: startTime, end_time: endTime });
      setName("");
      await load();
      toast.success("Đã thêm mẫu ca.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally { setSaving(false); }
  };

  /** Deletes a template after backend confirms that no schedule references it. */
  const handleDelete = async (templateId: number): Promise<void> => {
    try {
      await scheduleService.deleteShiftTemplate(templateId);
      await load();
      toast.success("Đã xóa mẫu ca.");
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  /** Persists grace period and mandatory-reason settings. */
  const handleSavePolicy = async (): Promise<void> => {
    try {
      setSaving(true);
      const saved = await scheduleService.updateShiftPolicy(policy);
      setPolicy(saved);
      toast.success("Đã lưu quy định chấm công.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally { setSaving(false); }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800"><Clock3 size={17} className="text-sky-600" /> Mẫu ca làm việc</h2>
        <div className="mt-3 space-y-2">
          {templates.map((template) => <div key={template.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-bold text-slate-700">{template.name}</span><span className="text-slate-500">{template.start_time.slice(0, 5)} – {template.end_time.slice(0, 5)}</span><button type="button" onClick={() => void handleDelete(template.id)} className="text-rose-600" aria-label={`Xóa ${template.name}`}><Trash2 size={14} /></button></div>)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên ca" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
          <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        </div>
        <button type="button" disabled={saving} onClick={() => void handleCreate()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Plus size={14} /> Thêm mẫu ca</button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800"><Settings2 size={17} className="text-amber-600" /> Kỷ luật chấm công</h2>
        <label className="mt-3 block text-xs font-bold text-slate-600">Ân hạn (phút)<input type="number" min={0} max={120} value={policy.grace_minutes} onChange={(event) => setPolicy((current) => ({ ...current, grace_minutes: Number(event.target.value) }))} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700"><span>Bắt buộc lý do đi muộn</span><input type="checkbox" checked={policy.require_late_reason} onChange={(event) => setPolicy((current) => ({ ...current, require_late_reason: event.target.checked }))} /></label>
        <label className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-700"><span>Bắt buộc lý do về sớm</span><input type="checkbox" checked={policy.require_early_reason} onChange={(event) => setPolicy((current) => ({ ...current, require_early_reason: event.target.checked }))} /></label>
        <button type="button" disabled={saving} onClick={() => void handleSavePolicy()} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Lưu quy định</button>
      </div>
    </section>
  );
};
