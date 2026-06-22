import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { MenuItem } from "../interfaces";

interface MenuState {
  items: MenuItem[];
  categories: { id: number | string; name: string }[];
}

const INITIAL_CATEGORIES = [
  { id: 1, name: "Khai vị" },
  { id: 2, name: "Món chính" },
  { id: 3, name: "Lẩu" },
  { id: 4, name: "Đồ uống" },
  { id: 5, name: "Tráng miệng" },
];

const INITIAL_MENU: MenuItem[] = [
  {
    id: "1",
    name: "Gỏi hải sản",
    price: 120000,
    description: "Gỏi tôm, mực, ghẹ tươi ngon",
    category_id: 1,
    category_name: "Khai vị",
    kitchen_station: "cold_kitchen",
    is_active: true,
    is_featured: true,
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  },
  {
    id: "2",
    name: "Chả giò",
    price: 80000,
    description: "Chả giò giòn rụm",
    category_id: 1,
    category_name: "Khai vị",
    kitchen_station: "hot_kitchen",
    is_active: true,
    is_featured: false,
    image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
  },
  {
    id: "3",
    name: "Bò lúc lắc",
    price: 180000,
    description: "Bò Mỹ mềm ngọt",
    category_id: 2,
    category_name: "Món chính",
    kitchen_station: "hot_kitchen",
    is_active: true,
    is_featured: true,
    image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  },
  {
    id: "4",
    name: "Coca Cola",
    price: 20000,
    description: "Nước ngọt có ga",
    category_id: 4,
    category_name: "Đồ uống",
    kitchen_station: "bar",
    is_active: true,
    is_featured: false,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400",
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
    },
    updateMenuItem: (state, action: PayloadAction<MenuItem>) => {
      const index = state.items.findIndex((i) => i.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteMenuItem: (state, action: PayloadAction<string | number>) => {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    toggleMenuItemActive: (state, action: PayloadAction<string | number>) => {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.is_active = !item.is_active;
      }
    },
    // Keep for backward compatibility
    setMenuStock: (state, action: PayloadAction<{ id: string; inStock: boolean }>) => {
      // No-op for now
    },
    syncMenuWithIngredients: (state, action: PayloadAction<{ [name: string]: number }>) => {
      // No-op for now
    },
  },
});

export const { addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemActive, setMenuStock, syncMenuWithIngredients } = menuSlice.actions;
export default menuSlice.reducer;
