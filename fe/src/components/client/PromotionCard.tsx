import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import type { ActivePromotion } from "../../data/mockLandingData";

interface PromotionCardProps {
  promotion: ActivePromotion;
}

function formatEndDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export const PromotionCard: React.FC<PromotionCardProps> = ({ promotion }) => {
  const discountLabel =
    promotion.discountType === "percent"
      ? `-${promotion.discountValue}%`
      : `-${formatCurrency(promotion.discountValue)}`;

  return (
    <article className="relative w-[280px] shrink-0 snap-start overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm sm:w-[320px]">
      <div className="relative h-36 overflow-hidden">
        <img src={promotion.imageUrl} alt={promotion.title} className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white">
          {discountLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-600">{promotion.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{promotion.description}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <CalendarDays size={14} />
          Đến {formatEndDate(promotion.endDate)}
        </p>
        <Link
          to={`/booking?promo=${promotion.id}`}
          className="mt-3 inline-block w-full rounded-lg bg-blue-700 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Đặt bàn với ưu đãi này
        </Link>
      </div>
    </article>
  );
};
