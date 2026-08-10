import React, { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock3, UsersRound } from "lucide-react";
import { toast } from "react-hot-toast";
import type { ShiftEmployee } from "../../../../interfaces/shift.interface";
import type { AssignedSchedule, CreateSchedulePayload, ShiftTemplate } from "../../../../services/scheduleService";
import * as scheduleService from "../../../../services/scheduleService";

interface ScheduleAssignmentPanelProps {
  employees: ShiftEmployee[];
}

/** Returns today's calendar date in the restaurant's Vietnam time zone. */
const getVietnamToday = (): string => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date());

/** Reads a useful API error without relying on an unsafe error shape. */
const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return "Không thể thực hiện thao tác phân ca.";
};

/** Builds an employee-and-date key used to identify broken shift assignments. */
const getScheduleGroupKey = (schedule: AssignedSchedule): string => `${schedule.employee_id}-${schedule.work_date}`;

/** Renders and submits manager-controlled employee schedule assignments. */
export const ScheduleAssignmentPanel: React.FC<ScheduleAssignmentPanelProps> = ({ employees }) => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [schedules, setSchedules] = useState<AssignedSchedule[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [workDate, setWorkDate] = useState(getVietnamToday);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /** Fetches templates and existing assignments so the manager can plan safely. */
  const loadScheduleData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [templateData, scheduleData] = await Promise.all([
        scheduleService.getShiftTemplates(),
        scheduleService.getSchedules(),
      ]);
      setTemplates(templateData);
      setSchedules(scheduleData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScheduleData();
  }, []);

  /** Presents only the closest assignments first to support daily operating decisions. */
  const sortedSchedules = useMemo(
    () => [...schedules].sort((left, right) => `${left.work_date}${left.start_time ?? ""}`.localeCompare(`${right.work_date}${right.start_time ?? ""}`)),
    [schedules],
  );

  /** Flags dates where the same employee has two non-overlapping assigned shifts. */
  const brokenShiftKeys = useMemo(() => {
    const counts = new Map<string, number>();
    schedules.filter((schedule) => schedule.status !== "cancelled").forEach((schedule) => {
      const key = getScheduleGroupKey(schedule);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [schedules]);

  /** Validates and sends one shift assignment to the protected schedule API. */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const payload: CreateSchedulePayload = {
      employee_id: Number(employeeId),
      shift_id: Number(shiftId),
      work_date: workDate,
    };
    if (!payload.employee_id || !payload.shift_id || !payload.work_date) {
      toast.error("Vui lòng chọn nhân viên, mẫu ca và ngày làm việc.");
      return;
    }

    try {
      setSubmitting(true);
      await scheduleService.createSchedule(payload);
      toast.success("Đã phân ca. Hệ thống đã kiểm tra chồng giờ ở Backend.");
      setEmployeeId("");
      setShiftId("");
      await loadScheduleData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2 text-slate-800">
          <CalendarPlus size={18} className="text-sky-600" />
          <h2 className="text-sm font-black">Phân ca nhân viên</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">Ca trưa và ca tối cùng ngày được phép; các khung giờ bị chồng sẽ bị chặn.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 border-b border-slate-100 bg-slate-50/60 p-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
        <label className="block text-xs font-bold text-slate-600">
          Nhân viên
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-sky-500">
            <option value="">Chọn nhân viên</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.role_name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Mẫu ca
          <select value={shiftId} onChange={(event) => setShiftId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-sky-500">
            <option value="">Chọn ca</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.start_time.slice(0, 5)}–{template.end_time.slice(0, 5)}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Ngày làm việc
          <input type="date" value={workDate} min={getVietnamToday()} onChange={(event) => setWorkDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-sky-500" />
        </label>
        <button type="submit" disabled={submitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3E2016] px-4 text-xs font-black text-white transition hover:bg-[#5C2E17] disabled:cursor-not-allowed disabled:opacity-60">
          <CalendarPlus size={15} />
          {submitting ? "Đang lưu..." : "Phân ca"}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-sky-50/60 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-3">Ngày</th>
              <th className="px-5 py-3">Nhân viên</th>
              <th className="px-5 py-3">Ca trực</th>
              <th className="px-5 py-3">Khung giờ</th>
              <th className="px-5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Đang tải phân ca...</td></tr>
            ) : sortedSchedules.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Chưa có phân ca nào.</td></tr>
            ) : sortedSchedules.map((schedule) => (
              <tr key={schedule.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-3 font-mono text-slate-600">{schedule.work_date}</td>
                <td className="px-5 py-3"><div className="font-bold text-slate-700">{schedule.employee_name ?? `Nhân viên #${schedule.employee_id}`}</div><div className="mt-0.5 text-[10px] text-slate-400">{schedule.role_name ?? "Nhân viên"}</div></td>
                <td className="px-5 py-3"><div className="font-semibold text-slate-700">{schedule.shift_name ?? "Ca làm việc"}</div>{brokenShiftKeys.has(getScheduleGroupKey(schedule)) && schedule.status !== "cancelled" ? <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Ca gãy</span> : null}</td>
                <td className="whitespace-nowrap px-5 py-3 text-slate-600"><span className="inline-flex items-center gap-1"><Clock3 size={13} className="text-sky-600" />{schedule.start_time?.slice(0, 5)}–{schedule.end_time?.slice(0, 5)}</span></td>
                <td className="px-5 py-3"><span className={schedule.status === "cancelled" ? "rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"}>{schedule.status === "cancelled" ? "Đã hủy" : "Đã phân"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-500"><UsersRound size={14} className="text-sky-600" /> Phân 2 ca không chồng giờ cho cùng nhân viên, cùng ngày để tạo ca gãy. Yêu cầu đổi ca và xin nghỉ được duyệt ở khối bên dưới.</div>
    </section>
  );
};
