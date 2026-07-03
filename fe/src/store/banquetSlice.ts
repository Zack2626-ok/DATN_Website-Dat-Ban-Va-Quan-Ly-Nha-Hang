import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Hall {
  id: number;
  name: string;
  capacity: number;
  description: string;
  is_active: boolean;
}

interface EventPackage {
  id: number;
  name: string;
  price_per_person: number;
  description: string;
  is_active: boolean;
  items?: any[];
}

interface BanquetState {
  halls: Hall[];
  packages: EventPackage[];
}

// Mock data
const initialHalls: Hall[] = [
  { id: 1, name: "Sảnh Hoa Mai", capacity: 80, description: "Sảnh nhỏ cho tiệc công ty/sinh nhật", is_active: true },
  { id: 2, name: "Sảnh Đào", capacity: 150, description: "Sảnh trung bình, phù hợp tiệc cưới", is_active: true },
  { id: 3, name: "Sảnh Phượng Hoàng", capacity: 300, description: "Sảnh lớn, trang bị âm thanh chuyên nghiệp", is_active: true },
];

const initialPackages: EventPackage[] = [
  { id: 1, name: "Gói Tiệc Cưới VIP", price_per_person: 500000, description: "Gói cao cấp với hải sản và bia ngon", is_active: true },
  { id: 2, name: "Gói Tiệc Cơ Bản", price_per_person: 300000, description: "Gói đầy đủ các món ăn truyền thống", is_active: true },
  { id: 3, name: "Gói Tiệc Công Ty", price_per_person: 200000, description: "Gói tiết kiệm cho sự kiện doanh nghiệp", is_active: false },
];

// Load from localStorage
const loadFromLocalStorage = (): BanquetState => {
  try {
    const savedHalls = localStorage.getItem('banquetHalls');
    const savedPackages = localStorage.getItem('banquetPackages');
    return {
      halls: savedHalls ? JSON.parse(savedHalls) : initialHalls,
      packages: savedPackages ? JSON.parse(savedPackages) : initialPackages,
    };
  } catch {
    return { halls: initialHalls, packages: initialPackages };
  }
};

const initialState: BanquetState = loadFromLocalStorage();

const banquetSlice = createSlice({
  name: 'banquet',
  initialState,
  reducers: {
    addHall: (state, action: PayloadAction<Omit<Hall, 'id'>>) => {
      const newId = state.halls.length > 0 ? Math.max(...state.halls.map(h => h.id)) + 1 : 1;
      state.halls.push({ ...action.payload, id: newId });
      localStorage.setItem('banquetHalls', JSON.stringify(state.halls));
    },
    updateHall: (state, action: PayloadAction<{ id: number; data: Omit<Hall, 'id' > }>) => {
      const index = state.halls.findIndex(h => h.id === action.payload.id);
      if (index !== -1) {
        state.halls[index] = { ...state.halls[index], ...action.payload.data };
        localStorage.setItem('banquetHalls', JSON.stringify(state.halls));
      }
    },
    deleteHall: (state, action: PayloadAction<number>) => {
      state.halls = state.halls.filter(h => h.id !== action.payload);
      localStorage.setItem('banquetHalls', JSON.stringify(state.halls));
    },
    addPackage: (state, action: PayloadAction<Omit<EventPackage, 'id'>>) => {
      const newId = state.packages.length > 0 ? Math.max(...state.packages.map(p => p.id)) + 1 : 1;
      state.packages.push({ ...action.payload, id: newId });
      localStorage.setItem('banquetPackages', JSON.stringify(state.packages));
    },
    updatePackage: (state, action: PayloadAction<{ id: number; data: Omit<EventPackage, 'id' > }>) => {
      const index = state.packages.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.packages[index] = { ...state.packages[index], ...action.payload.data };
        localStorage.setItem('banquetPackages', JSON.stringify(state.packages));
      }
    },
    deletePackage: (state, action: PayloadAction<number>) => {
      state.packages = state.packages.filter(p => p.id !== action.payload);
      localStorage.setItem('banquetPackages', JSON.stringify(state.packages));
    },
  },
});

export const { addHall, updateHall, deleteHall, addPackage, updatePackage, deletePackage } = banquetSlice.actions;
export default banquetSlice.reducer;
