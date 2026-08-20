import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { logoutAction } from "../../store/authSlice";
import { clockInApi, clockOutApi, getAttendanceStatus } from "../../services/attendanceService";
import { CheckCircle2, Clock, LogOut, Timer } from "lucide-react";

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  manager: "/manager",
  waiter: "/waiter",
  cashier: "/cashier",
  chef: "/chef",
  sales_event: "/sales",
};

const roleLabels: Record<string, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  waiter: "Phục vụ",
  cashier: "Thu ngân",
  chef: "Đầu bếp",
  sales_event: "Kinh doanh",
};

export default function CheckInPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedIn, setCheckedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [showLateReasonPrompt, setShowLateReasonPrompt] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const redirectToWork = (delay = 800) => {
    if (!user) return;

    setRedirecting(true);
    const fallbackPath = roleRoutes[user.role] || "/";
    window.setTimeout(() => {
      navigate(fallbackPath, { replace: true });
    }, delay);
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await getAttendanceStatus();
        if (status.checkedIn && status.attendance) {
          setCheckedIn(true);
          setClockInTime(status.attendance.clock_in);
          setClockOutTime(status.attendance.clock_out);
          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem("checkedInToday", today);
        }
      } catch {
        // not checked in yet
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [user, navigate]);

  /** Reads a backend attendance failure without depending on an unsafe Axios type. */
  const getAttendanceError = (error: unknown): { code: string; message: string } => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = error.response;
      if (typeof response === "object" && response !== null && "data" in response) {
        const data = response.data;
        if (typeof data === "object" && data !== null) {
          const code = "code" in data && typeof data.code === "string" ? data.code : "ATTENDANCE_FAILED";
          const message = "message" in data && typeof data.message === "string" ? data.message : "Không thể chấm công vào.";
          return { code, message };
        }
      }
    }
    return { code: "ATTENDANCE_FAILED", message: "Không thể chấm công vào. Vui lòng thử lại." };
  };

  /** Sends clock-in and opens the required explanation form when staff arrive late. */
  const handleClockIn = async (reason?: string): Promise<void> => {
    setLoading(true);
    setAttendanceError("");
    try {
      const record = await clockInApi(reason ? { late_reason: reason } : undefined);
      setCheckedIn(true);
      setClockInTime(record.clock_in);
      setShowLateReasonPrompt(false);
      setLateReason("");
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("checkedInToday", today);
    } catch (error) {
      const failure = getAttendanceError(error);
      if (failure.code === "LATE_REASON_REQUIRED") {
        setShowLateReasonPrompt(true);
      } else {
        setAttendanceError(failure.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /** Validates and resubmits the late-arrival reason requested by the backend policy. */
  const submitLateReason = (): void => {
    const normalizedReason = lateReason.trim();
    if (!normalizedReason) {
      setAttendanceError("Vui lòng nhập lý do đi muộn trước khi chấm công.");
      return;
    }
    void handleClockIn(normalizedReason);
  };

  const handleGoToWork = () => {
    redirectToWork(0);
  };

  /** Records the current staff member's end of work time. */
  const handleClockOut = async () => {
    setLoading(true);
    try {
      const record = await clockOutApi();
      setClockOutTime(record.clock_out);
      setCheckedIn(false);
      localStorage.removeItem("checkedInToday");
    } catch {
      // The status request will show the current state again if checkout fails.
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("checkedInToday");
    dispatch(logoutAction());
    navigate("/auth/login", { replace: true });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (!user) {
    navigate("/auth/login", { replace: true });
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070')",
      }}
    >
      <div className="absolute inset-0 bg-sky-900/20" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-6xl mb-2">🍽️</h1>
          <h1 className="text-5xl font-bold text-sky-300 drop-shadow-sm">ResManager</h1>
          <p className="text-gray-300 mt-4">Hệ thống quản lý nhà hàng hiện đại</p>
        </div>

        {/* Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-center text-sky-300 mb-2">Chấm công</h2>

          {/* User Info */}
          <div className="text-center mb-6">
            <p className="text-white text-lg font-semibold">{user.full_name}</p>
            <p className="text-sky-200 text-sm mt-1">
              {roleLabels[user.role] || user.role}
            </p>
          </div>

          {/* Current Time */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Timer className="w-6 h-6 text-sky-300" />
            <span className="text-4xl font-mono font-bold text-white tracking-wider">
              {currentTime.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {checking || redirecting ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-300 text-sm">
                {redirecting ? "Đã chấm công, đang chuyển sang trang làm việc..." : "Đang kiểm tra trạng thái..."}
              </span>
            </div>
          ) : (
            <>
              {/* Not checked in */}
              {!checkedIn && (
                <div className="space-y-3">
                  {showLateReasonPrompt ? (
                    <div className="rounded-xl border border-amber-300/60 bg-amber-200/15 p-4 text-left">
                      <p className="font-bold text-amber-100">Bạn đi muộn quá thời gian ân hạn</p>
                      <p className="mt-1 text-xs text-amber-50">Vui lòng ghi lý do để quản lý xem xét trước khi chấm công.</p>
                      <textarea value={lateReason} onChange={(event) => setLateReason(event.target.value)} placeholder="Ví dụ: kẹt xe do mưa lớn..." className="mt-3 min-h-20 w-full rounded-lg border border-white/25 bg-black/20 p-2 text-sm text-white outline-none placeholder:text-slate-300 focus:border-amber-300" />
                      <div className="mt-3 flex gap-2"><button type="button" onClick={submitLateReason} disabled={loading} className="flex-1 rounded-lg bg-amber-500 px-3 py-2 font-bold text-white disabled:opacity-60">{loading ? "Đang gửi..." : "Xác nhận chấm công"}</button><button type="button" onClick={() => { setShowLateReasonPrompt(false); setLateReason(""); setAttendanceError(""); }} className="rounded-lg border border-white/25 px-3 py-2 font-bold text-white">Hủy</button></div>
                    </div>
                  ) : (
                    <button
                      onClick={() => void handleClockIn()}
                      disabled={loading}
                      className="w-full py-4 rounded-xl bg-sky-500 text-white text-xl font-bold hover:bg-sky-400 hover:scale-[1.02] transition shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-center gap-3"
                    >
                      <Clock className="w-6 h-6" />
                      {loading ? "Đang chấm công..." : "Chấm công vào"}
                    </button>
                  )}
                  {attendanceError ? <p className="rounded-lg border border-rose-300/50 bg-rose-500/20 px-3 py-2 text-center text-sm font-semibold text-rose-100">{attendanceError}</p> : null}
                </div>
              )}

              {/* Checked in */}
              {checkedIn && (
                <div className="space-y-4">
                  <div className="bg-green-500/20 border border-green-400 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-200 font-semibold">
                        Đã chấm công lúc {clockInTime ? formatTime(clockInTime) : ""}
                      </p>
                      {clockOutTime && (
                        <p className="text-green-300 text-sm mt-1">
                          Ra về lúc {formatTime(clockOutTime)}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleGoToWork}
                    className="w-full py-4 rounded-xl bg-sky-500 text-white text-xl font-bold hover:bg-sky-400 hover:scale-[1.02] transition shadow-[0_0_20px_rgba(14,165,233,0.5)]"
                  >
                    Vào làm việc
                  </button>
                  {!clockOutTime && (
                    <button
                      onClick={handleClockOut}
                      disabled={loading}
                      className="w-full py-3 rounded-xl border border-rose-300 bg-rose-500/20 text-rose-100 font-bold hover:bg-rose-500/35 transition disabled:opacity-50"
                    >
                      {loading ? "Đang chấm công ra..." : "Chấm công ra"}
                    </button>
                  )}

                </div>
              )}
            </>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full mt-6 py-3 rounded-xl bg-white/10 border border-white/20 text-gray-300 font-semibold hover:bg-white/20 hover:text-white transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
