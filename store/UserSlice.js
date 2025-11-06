import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { showLoader, hideLoader } from "./LoadingSlice";

const initialState = {
  id: null,
  userName: null,
  email: null,
  avatar_url: null,
  status: "idle",
  error: null,
};
// Fetch user info
export const fetchUserInfo = createAsyncThunk(
  "user/fetchUserInfo",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Loading user info"));
      const res = await fetch(`/api/user`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch user info");
      }
      const data = await res.json();
      return data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
    }
  }
);

const UserSlice = createSlice({
  name: "user",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserInfo.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserInfo.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.id = action.payload.id;
        state.userName = action.payload.username;
        state.email = action.payload.email;
        state.avatar_url = action.payload.avatar_url;
        state.error = null;
      })
      .addCase(fetchUserInfo.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default UserSlice.reducer;