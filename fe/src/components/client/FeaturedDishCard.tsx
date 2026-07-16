import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatCurrency";

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
  if (imagePath.startsWith("http")) return imagePath;
  const serverUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
  return `${serverUrl}/uploads/${imagePath}`;
};

interface FeaturedDishCardProps {
  dish: any;
}

export const FeaturedDishCard: React.FC<FeaturedDishCardProps> = ({ dish }) => (
  <article className="group overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm transition-shadow hover:shadow-md">
    <div className="aspect-[4/3] overflow-hidden">
      <img
        src={getImageUrl(dish.image_url || dish.image || dish.imageUrl)}
        alt={dish.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-slate-600">{dish.name}</h3>
      <p className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(Number(dish.price))}</p>
      <Link
        to="/menu"
        className="mt-3 inline-block text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
      >
        Xem chi tiết →
      </Link>
    </div>
  </article>
);
