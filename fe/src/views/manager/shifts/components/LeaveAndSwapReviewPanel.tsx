import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Repeat2, Umbrella } from "lucide-react";
import { toast } from "react-hot-toast";
import type { LeaveRequest, ShiftSwapRequest } from "../../../../services/scheduleService";
import * as scheduleService from "../../../../services/scheduleService";

/** Reads a safe, useful error message from a failed HTTP request. */
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
  return "Không thể thực hiện thao tác. Vui lòng thử lại.";
};

/** Converts request statuses into concise manager-facing Vietnamese labels. */
const getRequestStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Chờ duyệt",
    pending_target: "Chờ nhân viên nhận ca đồng ý",
    pending_manager: "Chờ quản lý duyệt",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
  };
  return labels[status] ?? status;
};

/** Renders manager approval queues for leave and staff-to-staff shift exchanges. */
export const LeaveAndSwapReviewPanel: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  /** Loads both manager review queues together to keep their states consistent. */
  const loadRequests = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [leaves, swaps] = await Promise.all([
        scheduleService.getLeaveRequests(),
        scheduleService.getShiftSwapRequests(),
      ]);
      setLeaveRequests(leaves);
      setSwapRequests(swaps);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  /** Approves one pending leave request and refreshes every dependent queue. */
  const handleApproveLeave = async (leaveId: number): Promise<void> => {
    try {
      setActionId(`leave-${leaveId}`);
      await scheduleService.approveLeaveRequest(leaveId);
      toast.success("Đã duyệt nghỉ phép và giải phóng các ca trong ngày.");
      await loadRequests();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  /** Approves a target-accepted exchange using the transactional backend flow. */
  const handleApproveSwap = async (swapId: number): Promise<void> => {
    try {
      setActionId(`swap-${swapId}`);
      await scheduleService.approveShiftSwapRequest(swapId);
      toast.success("Đã duyệt đổi ca an toàn.");
      await loadRequests();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-black text-slate-800">Đổi ca & xin nghỉ</h2>
          <p className="mt-1 text-xs text-slate-500">Đổi ca cần nhân viên nhận ca đồng ý trước khi quản lý phê duyệt.</p>
        </div>
        <button type="button" onClick={() => void loadRequests()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700"><Umbrella size={16} className="text-sky-600" /> Đơn xin nghỉ</div>
          <div className="space-y-2">
            {leaveRequests.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">Chưa có đơn xin nghỉ.</p> : leaveRequests.map((request) => (
              <article key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3">
                <div><p className="text-xs font-bold text-slate-700">{request.employee_name}</p><p className="mt-0.5 text-[11px] text-slate-500">Ngày nghỉ: {request.leave_date}</p></div>
                {request.status === "pending" ? <button type="button" onClick={() => void handleApproveLeave(request.id)} disabled={actionId === `leave-${request.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"><CheckCircle2 size={13} /> Duyệt</button> : <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{getRequestStatusLabel(request.status)}</span>}
              </article>
            ))}
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700"><Repeat2 size={16} className="text-violet-600" /> Yêu cầu đổi ca</div>
          <div className="space-y-2">
            {swapRequests.length === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">Chưa có yêu cầu đổi ca.</p> : swapRequests.map((request) => (
              <article key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3">
                <div><p className="text-xs font-bold text-slate-700">{request.requester_name} <span className="text-slate-400">→</span> {request.target_employee_name}</p><p className="mt-0.5 text-[11px] text-slate-500">Ngày làm: {request.work_date}</p></div>
                {request.status === "pending_manager" ? <button type="button" onClick={() => void handleApproveSwap(request.id)} disabled={actionId === `swap-${request.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"><CheckCircle2 size={13} /> Duyệt</button> : <span className="max-w-36 shrink-0 text-right text-[10px] font-bold text-slate-500">{getRequestStatusLabel(request.status)}</span>}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
