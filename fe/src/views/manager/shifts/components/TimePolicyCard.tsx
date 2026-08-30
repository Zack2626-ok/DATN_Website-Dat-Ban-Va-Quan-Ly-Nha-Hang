import React, { useEffect, useState } from "react";
import { CalendarClock, Clock3, ShieldCheck } from "lucide-react";
import { io } from "socket.io-client";
import { TIME_POLICY } from "../../../../constants/timePolicy";
import { getRestaurantInfo, type RestaurantInfo } from "../../../../services/restaurantInfoService";

/** Displays the central operating-time rules that the API enforces for restaurant staff. */
export const TimePolicyCard: React.FC = () => {
  const [info, setInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    getRestaurantInfo()
      .then((data) => setInfo(data))
      .catch((err) => console.error("Error fetching restaurant info in TimePolicyCard:", err));

    const socketUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(socketUrl);

    socket.on("restaurant_info_updated", (updated: RestaurantInfo) => {
      if (updated) setInfo(updated);
    });
    socket.on("settings_updated", (updated: RestaurantInfo) => {
      if (updated) setInfo(updated);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const onlineBookingHours = info?.online_booking_hours || TIME_POLICY.ONLINE_BOOKING;
  const walkInHours = info?.walk_in_hours || TIME_POLICY.WALK_IN;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <CalendarClock size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-slate-800">Trung tâm quản lý thời gian</h2>
          <p className="mt-0.5 text-xs text-slate-600">Quy định này đang được kiểm tra trực tiếp tại Backend.</p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-3 text-slate-700">
              <Clock3 className="mb-1 text-amber-600" size={14} />
              <b>Ca trưa:</b> {TIME_POLICY.LUNCH_SHIFT}
              <br />
              <b>Ca tối:</b> {TIME_POLICY.DINNER_SHIFT}
            </div>
            <div className="rounded-xl bg-white p-3 text-slate-700">
              <b>Khách online:</b> {onlineBookingHours}
              <br />
              <b>Khách trực tiếp:</b> {walkInHours}
            </div>
            <div className="rounded-xl bg-white p-3 text-slate-700">
              <ShieldCheck className="mb-1 text-emerald-600" size={14} />
              <b>Chấm công:</b> ân hạn {TIME_POLICY.ATTENDANCE_GRACE}
              <br />
              <b>Nghỉ giữa ca:</b> {TIME_POLICY.BREAK}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
