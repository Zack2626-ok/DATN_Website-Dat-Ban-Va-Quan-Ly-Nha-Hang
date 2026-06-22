import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { MenuItem, Category } from "../interfaces";

interface MenuState {
  items: MenuItem[];
  categories: Category[];
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: "Khai vị", sort_order: 1, is_active: true },
  { id: 2, name: "Món chính", sort_order: 2, is_active: true },
  { id: 3, name: "Lẩu", sort_order: 3, is_active: true },
  { id: 4, name: "Đồ uống", sort_order: 4, is_active: true },
  { id: 5, name: "Tráng miệng", sort_order: 5, is_active: true },
];

const INITIAL_MENU: MenuItem[] = [
  {
    id: "1",
    name: "Gỏi hải sản",
    price: 120000,
    description: "Gỏi tôm, mực, ghẹ tươi ngon",
    category_id: 1,
    category_name: "Khai vị",
    category: "Khai vị",
    kitchen_station: "cold_kitchen",
    is_active: true,
    is_featured: true,
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    inStock: true,
    available: true,
  },
  {
    id: "2",
    name: "Chả giò",
    price: 80000,
    description: "Chả giò giòn rụm",
    category_id: 1,
    category_name: "Khai vị",
    category: "Khai vị",
    kitchen_station: "hot_kitchen",
    is_active: true,
    is_featured: false,
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
    inStock: true,
    available: true,
  },
  {
    id: "3",
    name: "Bò lúc lắc",
    price: 180000,
    description: "Bò Mỹ mềm ngọt",
    category_id: 2,
    category_name: "Món chính",
    category: "Món chính",
    kitchen_station: "hot_kitchen",
    is_active: true,
    is_featured: true,
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
    inStock: true,
    available: true,
  },
  {
    id: "4",
    name: "Coca Cola",
    price: 20000,
    description: "Nước ngọt có ga",
    category_id: 4,
    category_name: "Đồ uống",
    category: "Đồ uống",
    kitchen_station: "bar",
    is_active: true,
    is_featured: false,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400",
    inStock: true,
    available: true,
  },
];

const menuSlice = createSlice({
  name: "menu",
  initialState: {
    items: INITIAL_MENU,
    categories: INITIAL_CATEGORIES,
  } as MenuState,
  reducers: {
    addMenuItem: (state, action: PayloadAction<MenuItem>) => {
      state.items.push(action.payload);
      localStorage.setItem("menuItems", JSON.stringify(state.items));
    },
    updateMenuItem: (state, action: PayloadAction<MenuItem>) => {
      const index = state.items.findIndex((i) => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
        localStorage.setItem("menuItems", JSON.stringify(state.items));
      }
    },
    deleteMenuItem: (state, action: PayloadAction<string | number>) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
      localStorage.setItem("menuItems", JSON.stringify(state.items));
    },
    toggleMenuItemActive: (state, action: PayloadAction<string | number>) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.is_active = !item.is_active;
        localStorage.setItem("menuItems", JSON.stringify(state.items));
      }
    },
    // Keep for backward compatibility
    setMenuStock: (_state, _action: PayloadAction<{ id: string; inStock: boolean }>) => {
      // No-op for now
    },
    syncMenuWithIngredients: (_state, _action: PayloadAction<{ [name: string]: number }>) => {
      // No-op for now
    },
  },
});

export const { addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemActive, setMenuStock, syncMenuWithIngredients } = menuSlice.actions;
export default menuSlice.reducer;
