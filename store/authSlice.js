import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null, // { email, id, token }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(action.payload));
      }
    },
    clearUser: (state) => {
      state.user = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
    },
    hydrateUser: (state) => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("user");
        if (stored) {
          state.user = JSON.parse(stored);
        }
      }
    },
  },
});

export const { setUser, clearUser, hydrateUser } = authSlice.actions;
export default authSlice.reducer;