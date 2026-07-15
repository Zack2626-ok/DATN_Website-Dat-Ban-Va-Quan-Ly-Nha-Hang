import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Star, MapPin, Phone, Clock } from "lucide-react";
import { FeaturedDishCard } from "../../components/client/FeaturedDishCard";
import { PromotionCard } from "../../components/client/PromotionCard";
import { FEATURED_DISHES, ACTIVE_PROMOTIONS } from "../../data/mockLandingData";

/**
 * HomeView — W1 Landing Page (Module 0, Actor: Khách hàng)
 * UI Spec: Hero → Món nổi bật → Ưu đãi → Thông tin + Maps
 */
export const HomeView: React.FC = () => {
  return (
    <>
      {/* Hero Banner */}
      <section className="relative h-[500px] w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80"
          alt="Không gian nhà hàng ResManager"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/50 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Star size={14} className="fill-amber-400 text-sky-700" />
            Nhà hàng đa mô hình — Dine-in & Sự kiện
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Trải nghiệm ẩm thực
            <span className="block text-blue-300">đặt bàn chỉ vài bước</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-200 sm:text-lg">
            Khám phá thực đơn đa dạng, ưu đãi hấp dẫn và đặt bàn trực tuyến nhanh chóng. Tích điểm thành
            viên mỗi lần thưởng thức tại ResManager.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              to="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              Đặt bàn ngay
              <ChevronRight size={18} />
            </Link>
            <Link
              to="/menu"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/80 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Xem thực đơn
            </Link>
          </div>
        </div>
      </section>

      {/* Món nổi bật */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Thực đơn</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-600 sm:text-3xl">Món nổi bật</h2>
            <p className="mt-1 text-sm text-slate-400">Được yêu thích nhất tại nhà hàng</p>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Xem toàn bộ thực đơn
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_DISHES.map((dish) => (
            <FeaturedDishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </section>

      {/* Ưu đãi đang active */}
      <section className="border-y border-sky-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Khuyến mãi</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-600 sm:text-3xl">Ưu đãi đang diễn ra</h2>
            </div>
            <Link
              to="/promotions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Xem tất cả ưu đãi
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
            {ACTIVE_PROMOTIONS.map((promo) => (
              <PromotionCard key={promo.id} promotion={promo} />
            ))}
          </div>
        </div>
      </section>

      {/* Thông tin + Google Maps */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Liên hệ</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-600 sm:text-3xl">Ghé thăm ResManager</h2>
            <p className="mt-3 text-slate-400">
              Nằm tại trung tâm Quận 1, chúng tôi mang đến không gian ẩm thực ấm cúng phù hợp cho bữa
              ăn gia đình, hẹn hò và tiệc sự kiện.
            </p>

            <ul className="mt-8 space-y-5">
              <li className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <MapPin size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-600">Địa chỉ</p>
                  <p className="text-sm text-slate-400">123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Phone size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-600">Hotline đặt bàn</p>
                  <p className="text-sm text-slate-400">028 3829 4000 — Hỗ trợ 10:00–22:00 hàng ngày</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Clock size={20} />
                </span>
                <div>
                  <p className="font-semibold text-slate-600">Giờ mở cửa</p>
                  <p className="text-sm text-slate-400">Thứ 2 – Chủ nhật: 10:00 – 22:00</p>
                </div>
              </li>
            </ul>

            <Link
              to="/booking"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              Đặt bàn trực tuyến
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-sky-100 shadow-sm">
            <iframe
              title="Vị trí ResManager trên Google Maps"
              src="https://maps.google.com/maps?q=Nguy%E1%BB%85n+Hu%E1%BB%87,+Qu%E1%BA%ADn+1,+Ho+Chi+Minh+City&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="h-[400px] w-full lg:h-full lg:min-h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
};