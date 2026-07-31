import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { logoutAction } from "../../store/authSlice";
import { clockInApi, getAttendanceStatus } from "../../services/attendanceService";
import { Clock, CheckCircle2, LogOut, Timer } from "lucide-react";

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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(intervalRef.current);
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
          redirectToWork(700);
        }
      } catch {
        // not checked in yet
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [user, navigate]);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const record = await clockInApi();
      setCheckedIn(true);
      setClockInTime(record.clock_in);
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("checkedInToday", today);
      redirectToWork(1000);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleGoToWork = () => {
    redirectToWork(0);
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
                <button
                  onClick={handleClockIn}
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-sky-500 text-white text-xl font-bold hover:bg-sky-400 hover:scale-[1.02] transition shadow-[0_0_20px_rgba(14,165,233,0.5)] flex items-center justify-center gap-3"
                >
                  <Clock className="w-6 h-6" />
                  {loading ? "Đang chấm công..." : "Chấm công vào"}
                </button>
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
