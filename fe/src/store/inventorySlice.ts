import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Ingredient } from "../interfaces";

interface InventoryState {
  ingredients: Ingredient[];
}

const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: "i1", name: "Trứng cá tầm", stock: 300, unit: "g", threshold: 100 },
  { id: "i2", name: "Thịt bò Mỹ", stock: 8.5, unit: "kg", threshold: 2.0 },
  { id: "i3", name: "Cá hồi", stock: 6.0, unit: "kg", threshold: 1.5 },
  { id: "i4", name: "Sườn sụn heo", stock: 12.0, unit: "kg", threshold: 3.0 },
  { id: "i5", name: "Nấm tươi", stock: 250, unit: "g", threshold: 50 },
  { id: "i6", name: "Tôm sú", stock: 7.0, unit: "kg", threshold: 2.0 },
];

const inventorySlice = createSlice({
  name: "inventory",
  initialState: {
    ingredients: INITIAL_INGREDIENTS,
  } as InventoryState,
  reducers: {
    useIngredients: (state, action: PayloadAction<{ [name: string]: number }>) => {
      Object.entries(action.payload).forEach(([name, amount]) => {
        const ing = state.ingredients.find((i) => i.name.toLowerCase() === name.toLowerCase());
        if (ing) {
          ing.stock = Math.max(0, ing.stock - amount);
        }
      });
    },
    restockIngredient: (state, action: PayloadAction<{ id: string; amount: number }>) => {
      const ing = state.ingredients.find((i) => i.id === action.payload.id);
      if (ing) {
        ing.stock += action.payload.amount;
      }
    },
    setIngredientStockDirect: (state, action: PayloadAction<{ id: string; stock: number }>) => {
      const ing = state.ingredients.find((i) => i.id === action.payload.id);
      if (ing) {
        ing.stock = Math.max(0, action.payload.stock);
      }
    },
  },
});

export const { useIngredients, restockIngredient, setIngredientStockDirect } = inventorySlice.actions;
export default inventorySlice.reducer;
