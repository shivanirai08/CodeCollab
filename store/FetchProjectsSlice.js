import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { showLoader, hideLoader } from "./LoadingSlice";

const initialState = {
  projects: [],
  joined: [],
  created: [],
  status: "idle",
  error: null,
};

export const FetchAllProjects = createAsyncThunk(
  "projects/fetchAll",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Loading projects"));
      const res = await fetch(`/api/project`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch projects");
      return data.projects;
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
    }
  }
);

export const deleteProject = createAsyncThunk(
  "projects/delete",
  async (projectId, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Deleting project"));
      const res = await fetch("/api/project", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete project");
      }

      // Refresh projects list after deletion
      dispatch(FetchAllProjects());

      return { projectId, message: data.message };
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
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
      })
      .addCase(deleteProject.pending, (state) => {
        state.status = "deleting";
      })
      .addCase(deleteProject.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default FetchProjectsSlice.reducer;
