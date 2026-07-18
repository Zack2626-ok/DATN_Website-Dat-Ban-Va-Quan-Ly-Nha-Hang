export type MenuCategory = "all" | "appetizer" | "main" | "hotpot" | "drink" | "dessert";

export interface WaiterMenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  image: string;
  inStock: boolean;
  hasModifiers?: boolean;
}

export const MENU_CATEGORIES: { key: MenuCategory; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "appetizer", label: "Khai vị" },
  { key: "main", label: "Món chính" },
  { key: "hotpot", label: "Lẩu" },
  { key: "drink", label: "Đồ uống" },
  { key: "dessert", label: "Tráng miệng" },
];

export const MOCK_MENU_ITEMS: WaiterMenuItem[] = [
  { id: "m1", name: "Gỏi hải sản", price: 185000, category: "appetizer", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200", inStock: true },
  { id: "m2", name: "Chả giò", price: 95000, category: "appetizer", image: "https://images.unsplash.com/photo-1625938145744-e380515399af?w=200", inStock: true },
  { id: "m3", name: "Bò lúc lắc", price: 265000, category: "main", image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=200", inStock: true, hasModifiers: true },
  { id: "m4", name: "Gà nướng mật ong", price: 195000, category: "main", image: "https://images.unsplash.com/photo-1598103442097-39bfe35a574a?w=200", inStock: true },
  { id: "m5", name: "Cá hồi sốt chanh leo", price: 285000, category: "main", image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200", inStock: false },
  { id: "m6", name: "Lẩu Thái chua cay", price: 380000, category: "hotpot", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=200", inStock: true, hasModifiers: true },
  { id: "m7", name: "Trà đá", price: 15000, category: "drink", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200", inStock: true },
  { id: "m8", name: "Cocktail dâu", price: 89000, category: "drink", image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7b66?w=200", inStock: true },
  { id: "m9", name: "Kem dừa", price: 55000, category: "dessert", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200", inStock: true },
];
