import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { MenuItem } from "../interfaces";

interface MenuState {
  items: MenuItem[];
}

const INITIAL_MENU: MenuItem[] = [
  {
    id: "m1",
    name: "Gỏi hải sản",
    price: 185,
    description: "Gỏi hải sản tươi sống trộn thính gia truyền thơm giòn chua cay.",
    category: "Khai vị",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80",
    isSpicy: true,
    isBestSeller: true,
    inStock: true,
  },
  {
    id: "m2",
    name: "Khoai tây chiên bơ tỏi",
    price: 45,
    description: "Khoai tây chiên giòn rụm xóc bơ tỏi thơm lừng.",
    category: "Khai vị",
    image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    id: "m3",
    name: "Bò lúc lắc",
    price: 265,
    description: "Bò Mỹ thái khối vuông xào lửa lớn với ớt chuông và hành tây.",
    category: "Món chính",
    image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: true,
    inStock: true,
  },
  {
    id: "m4",
    name: "Cá hồi sốt chanh leo",
    price: 285,
    description: "Filet cá hồi áp chảo sốt chanh leo chua ngọt dịu mát.",
    category: "Món chính",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: true,
    inStock: true,
  },
  {
    id: "m5",
    name: "Sườn sụn nướng BBQ",
    price: 245,
    description: "Sườn sụn giòn mềm nướng sốt BBQ đậm đà chuẩn vị.",
    category: "Món chính",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    id: "m6",
    name: "Lẩu Thái chua cay",
    price: 380,
    description: "Nước lẩu Thái chua cay đậm vị phục vụ kèm tôm mực và bò Mỹ.",
    category: "Lẩu",
    image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500&auto=format&fit=crop&q=80",
    isSpicy: true,
    isBestSeller: true,
    inStock: true,
  },
  {
    id: "m7",
    name: "Lẩu nấm thực dưỡng",
    price: 350,
    description: "Lẩu nấm thanh đạm từ 5 loại nấm tươi bổ dưỡng.",
    category: "Lẩu",
    image: "https://images.unsplash.com/photo-1547592165-e1d17f573555?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    id: "m8",
    name: "Bánh tiramisu",
    price: 60,
    description: "Bánh tiramisu truyền thống thơm hương cafe và rượu nhẹ.",
    category: "Tráng miệng",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    id: "m9",
    name: "Trà đào cam sả",
    price: 45,
    description: "Trà đào mát lạnh thơm sả và nước cam tươi nguyên chất.",
    category: "Đồ uống",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: true,
    inStock: true,
  },
  {
    id: "m10",
    name: "Nước ép dưa hấu",
    price: 40,
    description: "Nước dưa hấu nguyên chất ép lạnh giải nhiệt mùa hè.",
    category: "Đồ uống",
    image: "https://images.unsplash.com/photo-1589733901241-5e51476857f6?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: false,
    inStock: true,
  },
  {
    id: "m11",
    name: "Sinh tố bơ",
    price: 55,
    description: "Bơ sáp Daklak xay cốt dừa béo ngậy thơm ngon.",
    category: "Đồ uống",
    image: "https://images.unsplash.com/photo-1546173152-318e7b25572c?w=500&auto=format&fit=crop&q=80",
    isSpicy: false,
    isBestSeller: false,
    inStock: true,
  },
];

const menuSlice = createSlice({
  name: "menu",
  initialState: {
    items: INITIAL_MENU,
  } as MenuState,
  reducers: {
    setMenuStock: (state, action: PayloadAction<{ id: string; inStock: boolean }>) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.inStock = action.payload.inStock;
      }
    },
    syncMenuWithIngredients: (state, action: PayloadAction<{ [ingredientName: string]: number }>) => {
      const stocks = action.payload;
      state.items.forEach((item) => {
        if (item.id === "m4") { // Cá hồi sốt chanh leo
          item.inStock = (stocks["Cá hồi"] ?? 10) > 0;
        } else if (item.id === "m3") { // Bò lúc lắc
          item.inStock = (stocks["Thịt bò Mỹ"] ?? 10) > 0;
        } else if (item.id === "m1") { // Gỏi hải sản
          item.inStock = (stocks["Trứng cá tầm"] ?? 10) > 0;
        } else if (item.id === "m5") { // Sườn sụn nướng BBQ
          item.inStock = (stocks["Sườn sụn heo"] ?? 10) > 0;
        } else if (item.id === "m6") { // Lẩu Thái chua cay
          item.inStock = (stocks["Tôm sú"] ?? 10) > 0;
        } else if (item.id === "m7") { // Lẩu nấm thực dưỡng
          item.inStock = (stocks["Nấm tươi"] ?? 10) > 0;
        }
      });
    },
  },
});

export const { setMenuStock, syncMenuWithIngredients } = menuSlice.actions;
export default menuSlice.reducer;
