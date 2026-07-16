import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Star, ShoppingBag, Loader2 } from "lucide-react";
import { getPublicMenu } from "../../services/customerService";

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
  if (imagePath.startsWith("http")) return imagePath;
  const serverUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
  return `${serverUrl}/${imagePath}`;
};

export const MenuPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["public-menu"],
    queryFn: getPublicMenu,
  });

  const categories = data ? ["Tất cả", ...data.categories.map((c: any) => c.name)] : ["Tất cả"];
  const rawItems = data?.items || [];

  const filteredDishes = rawItems.filter((d: any) => {
    const matchCategory = activeCategory === "Tất cả" || d.category_name === activeCategory;
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <>
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-r from-blue-800 to-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Thực đơn</h1>
          <p className="mt-3 text-blue-100 text-lg">
            Khám phá hương vị đặc trưng của ResManager
          </p>

          {/* Search bar */}
          <div className="mt-8 mx-auto max-w-lg relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-gray-700 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-b border-gray-200 bg-white sticky top-[73px] z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-700 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Dishes Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{filteredDishes.length}</span> món ăn
          </p>
          <button className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            <Filter size={14} /> Sắp xếp
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={36} className="animate-spin text-blue-700" />
          </div>
        ) : filteredDishes.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Không tìm thấy món ăn</p>
            <p className="text-sm mt-1">Hãy thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredDishes.map((dish: any) => (
              <div
                key={dish.id}
                className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getImageUrl(dish.image)}
                    alt={dish.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 backdrop-blur-sm">
                    {dish.category_name || "Món ăn"}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-700">{dish.name}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{dish.description || "Hương vị thơm ngon khó cưỡng từ ResManager"}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-700">
                      {dish.price.toLocaleString("vi-VN")}đ
                    </span>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={14} className="fill-amber-400" />
                      <span className="text-sm font-medium text-gray-600">{(4.5 + (dish.price % 5) / 10).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

