import React from "react";
import { Link } from "react-router-dom";
import { Tag, Clock, ChevronRight, Percent, Gift, Sparkles } from "lucide-react";
import { ACTIVE_PROMOTIONS } from "../../data/mockLandingData";

/**
 * PromotionsPage — Trang ưu đãi & combo (Module 0, Actor: Khách hàng)
 */
export const PromotionsPage: React.FC = () => {
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
          <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
            <Sparkles size={24} className="text-amber-500" />
            Đang diễn ra
          </h2>
          <p className="mt-1 text-sm text-gray-500">Áp dụng cho tất cả khách hàng</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVE_PROMOTIONS.map((promo) => (
            <div
              key={promo.id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Gift size={40} className="text-blue-600 mb-3" />
                  <h3 className="text-lg font-bold text-gray-700">{promo.title}</h3>
                </div>
                <span className="absolute top-3 right-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  HOT
                </span>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-4">{promo.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock size={14} />
                    <span>Đến {promo.endDate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                    <Tag size={14} />
                    <span>
                      {promo.discountType === "percent"
                        ? `-${promo.discountValue}%`
                        : `-${promo.discountValue.toLocaleString("vi-VN")}đ`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

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
