import React from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatCurrency";
import type { FeaturedDish } from "../../data/mockLandingData";

interface FeaturedDishCardProps {
  dish: FeaturedDish;
}

export const FeaturedDishCard: React.FC<FeaturedDishCardProps> = ({ dish }) => (
  <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
    <div className="aspect-[4/3] overflow-hidden">
      <img
        src={dish.imageUrl}
        alt={dish.name}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-gray-700">{dish.name}</h3>
      <p className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(dish.price)}</p>
      <Link
        to="/menu"
        className="mt-3 inline-block text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
      >
        Xem chi tiết →
      </Link>
    </div>
  </article>
);
