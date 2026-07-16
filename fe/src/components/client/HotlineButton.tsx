import React, { useState, useEffect } from "react";
import { Phone, X } from "lucide-react";
import { getRestaurantInfo, type RestaurantInfo } from "../../services/restaurantInfoService";

export const HotlineButton: React.FC = () => {
  const [info, setInfo] = useState<RestaurantInfo | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getRestaurantInfo()
      .then(setInfo)
      .catch(() => {});
  }, []);

  if (!info) return null;

  const hotlineDigits = info.hotline.replace(/\s/g, "");

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {expanded && (
        <div className="w-72 rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900">Liên hệ nhà hàng</h4>
            <button
              onClick={() => setExpanded(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-slate-700">{info.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{info.address}</p>
            </div>
            <a
              href={`tel:${hotlineDigits}`}
              className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
            >
              <Phone size={16} />
              {info.hotline}
            </a>
            <p className="text-xs text-slate-400">{info.hotline_hours}</p>
            <div className="border-t border-slate-100 pt-2">
              <p className="text-xs text-slate-500">
                <span className="font-medium">Giờ mở cửa:</span> {info.opening_hours}
              </p>
              {info.happy_hour && (
                <p className="text-xs text-orange-500 font-medium mt-1">{info.happy_hour}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 cursor-pointer animate-bounce"
        title="Gọi hotline"
      >
        <Phone size={24} />
      </button>
    </div>
  );
};
