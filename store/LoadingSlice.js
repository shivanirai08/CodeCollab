import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false,
  loadingMessage: "",
};

const loadingSlice = createSlice({
  name: "loading",
  initialState,
  reducers: {
    showLoader: (state, action) => {
      state.isLoading = true;
      state.loadingMessage = action.payload || "";
    },
    hideLoader: (state) => {
      state.isLoading = false;
      state.loadingMessage = "";
    },
  },
});

export const { showLoader, hideLoader } = loadingSlice.actions;
export default loadingSlice.reducer;