import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  projects: [],
  joined: [],
  created: [],
  status: "idle",
  error: null,
};

export const FetchAllProjects = createAsyncThunk(
  "projects/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch projects");
      return data.projects;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const FetchProjectsSlice = createSlice({
  name: "fetchprojects",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(FetchAllProjects.pending, (state) => {
        state.status = "loading";
      })
      .addCase(FetchAllProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.projects = action.payload;
        state.joined = action.payload.filter((p) => p.role === "collaborator");
        state.created = action.payload.filter((p) => p.role === "owner");
      })
      .addCase(FetchAllProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default FetchProjectsSlice.reducer;
