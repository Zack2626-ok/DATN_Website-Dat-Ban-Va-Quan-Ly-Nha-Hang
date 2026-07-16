import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80";
  if (imagePath.startsWith("http")) return imagePath;
  const serverUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
  return `${serverUrl}/${imagePath}`;
};

interface PromotionCardProps {
  promotion: any;
}

function formatEndDate(dateStr: string): string {
  if (!dateStr) return "";
  // Xử lý cả chuỗi ngày dạng ISO (2026-07-31T00:00:00.000Z) hoặc YYYY-MM-DD
  const cleanDate = dateStr.split("T")[0].split(" ")[0];
  const parts = cleanDate.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export const PromotionCard: React.FC<PromotionCardProps> = ({ promotion }) => {
  const discountType = promotion.discountType || promotion.discount_type;
  const discountValue = promotion.discountValue !== undefined ? promotion.discountValue : promotion.discount_value;
  const rawImage = promotion.imageUrl || promotion.image_url;
  const endDate = promotion.endDate || promotion.end_date;

  const discountLabel =
    discountType === "percent"
      ? `-${discountValue}%`
      : `-${formatCurrency(Number(discountValue))}`;

  return (
    <article className="relative w-[280px] shrink-0 snap-start overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm sm:w-[320px]">
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
        <img src={getImageUrl(rawImage)} alt={promotion.title} className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white">
          {discountLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-600">{promotion.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{promotion.description}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <CalendarDays size={14} />
          Đến {formatEndDate(endDate)}
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
