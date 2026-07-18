/** Mock data cho Landing Page — thay bằng API khi backend sẵn sàng */

export interface FeaturedDish {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
}

export interface ActivePromotion {
  id: number;
  title: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  endDate: string;
  imageUrl: string;
}

export const FEATURED_DISHES: FeaturedDish[] = [
  {
    id: 1,
    name: "Bò lúc lắc",
    price: 265000,
    imageUrl:
      "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "Lẩu Thái chua cay",
    price: 380000,
    imageUrl:
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Gỏi hải sản",
    price: 185000,
    imageUrl:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Cá hồi sốt chanh leo",
    price: 285000,
    imageUrl:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80",
  },
];

export const ACTIVE_PROMOTIONS: ActivePromotion[] = [
  {
    id: 1,
    title: "Combo Gia Đình Cuối Tuần",
    description: "4 món khai vị + 2 món chính + 2 nước uống cho 4 người",
    discountType: "percent",
    discountValue: 15,
    endDate: "2026-07-31",
    imageUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    title: "Happy Hour Đồ Uống",
    description: "Giảm giá tất cả cocktail & mocktail từ 17h–19h hàng ngày",
    discountType: "percent",
    discountValue: 20,
    endDate: "2026-08-15",
    imageUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7b66?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    title: "Ưu đãi sinh nhật",
    description: "Giảm trực tiếp khi đặt bàn kèm bánh sinh nhật",
    discountType: "fixed",
    discountValue: 100000,
    endDate: "2026-12-31",
    imageUrl:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    title: "Set Lẩu 2 Người",
    description: "Lẩu Thái + rau + hải sản tươi cho 2 khách",
    discountType: "percent",
    discountValue: 10,
    endDate: "2026-09-30",
    imageUrl:
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80",
  },
];
