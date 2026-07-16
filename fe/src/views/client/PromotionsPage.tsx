import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Tag, Clock, ChevronRight, Percent, Gift, Sparkles, Loader2 } from "lucide-react";
import { getPublicPromotions } from "../../services/customerService";

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http")) return imagePath;
  const serverUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
  return `${serverUrl}/${imagePath}`;
};

export const PromotionsPage: React.FC = () => {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["public-promotions"],
    queryFn: getPublicPromotions,
  });

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-r from-amber-600 to-orange-500 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
              <Percent size={28} />
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Ưu đãi & Combo</h1>
          <p className="mt-3 text-orange-100 text-lg max-w-xl mx-auto">
            Những ưu đãi hấp dẫn nhất đang chờ bạn tại ResManager
          </p>
        </div>
      </section>

      {/* Promotions list */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-600 flex items-center gap-2">
            <Sparkles size={24} className="text-sky-600" />
            Đang diễn ra
          </h2>
          <p className="mt-1 text-sm text-slate-400">Áp dụng cho tất cả khách hàng</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={36} className="animate-spin text-sky-600" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-16 text-center bg-sky-50/50 rounded-2xl border border-dashed border-sky-100">
            <Gift size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-500">Hiện tại chưa có ưu đãi mới</h3>
            <p className="text-sm text-gray-400 mt-1">Vui lòng quay lại sau để cập nhật các ưu đãi mới nhất</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promo: any) => (
              <div
                key={promo.id}
                className="group overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
                  {promo.image_url ? (
                    <img
                      src={getImageUrl(promo.image_url)}
                      alt={promo.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <Gift size={40} className="text-blue-600 mb-3" />
                      <h3 className="text-lg font-bold text-slate-600">{promo.title}</h3>
                    </div>
                  )}
                  <span className="absolute top-3 right-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                    HOT
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-600 mb-1">{promo.title}</h3>
                  <p className="text-sm text-slate-400 mb-4">{promo.description || "Ưu đãi hấp dẫn mùa này."}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={14} />
                      <span>Đến {new Date(promo.end_date).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                      <Tag size={14} />
                      <span>
                        {promo.discount_type === "percent"
                          ? `-${Number(promo.discount_value)}%`
                          : `-${Number(promo.discount_value).toLocaleString("vi-VN")}đ`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 p-8 sm:p-12 text-center text-white">
          <h3 className="text-2xl font-bold sm:text-3xl">Đặt bàn ngay để nhận ưu đãi!</h3>
          <p className="mt-2 text-blue-100 max-w-lg mx-auto">
            Đặt bàn trực tuyến qua ResManager để tích lũy điểm thưởng và nhận thêm nhiều ưu đãi hấp dẫn.
          </p>
          <Link
            to="/booking"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Đặt bàn ngay
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
};
