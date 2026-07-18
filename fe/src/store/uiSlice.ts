import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  searchQuery: string;
}

const initialState: UiState = {
  searchQuery: "",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearSearchQuery: (state) => {
      state.searchQuery = "";
    },
  },
});

export const { setSearchQuery, clearSearchQuery } = uiSlice.actions;
export default uiSlice.reducer;
