import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  projectid: "",
  projectname: "Project",
  description: "",
  visibility: "",
  template: "",
  language: "",
  join_code: "",
  owner_id: "",
  owner: "",
  collaborators: [],
  permissions: {
    canEdit: false,
    canView: false,
    isOwner: false,
    isCollaborator: false,
  },
  status: "idle",
  error: null,
};

// Async Thunk to fetch project with permissions
export const fetchProject = createAsyncThunk(
  "project/fetchProject",
  async (projectid, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project/${projectid}`, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch project");
      }

      const data = await res.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async Thunk to fetch project members
export const memberProject = createAsyncThunk(
  "project/memberProject",
  async (projectid, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project/members/${projectid}`, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch members");
      }

      const data = await res.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async Thunk to update project visibility
export const updateProjectVisibility = createAsyncThunk(
  "project/updateVisibility",
  async ({ projectid, visibility }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project/${projectid}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ visibility }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update visibility");
      }

      const data = await res.json();
      return { visibility: data.project.visibility };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    clearProject: (state) => {
      state.projectid = "";
      state.projectname = "Project";
      state.description = "";
      state.visibility = "";
      state.template = "";
      state.language = "";
      state.join_code = "";
      state.owner_id = "";
      state.owner = "";
      state.collaborators = [];
      state.permissions = {
        canEdit: false,
        canView: false,
        isOwner: false,
        isCollaborator: false,
      };
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetching project details with permissions
      .addCase(fetchProject.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        const project = action.payload.project;
        const permissions = action.payload.permissions;

        if (project) {
          state.projectid = project.projectid;
          state.projectname = project.projectname;
          state.description = project.description;
          state.visibility = project.visibility;
          state.template = project.template;
          state.language = project.language;
          state.join_code = project.join_code;
          state.owner_id = project.owner_id;
        }

        if (permissions) {
          state.permissions = permissions;
        }

        state.error = null;
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetching project members
      .addCase(memberProject.pending, (state) => {
        state.status = "loading";
      })
      .addCase(memberProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.owner = action.payload.owner;
        state.collaborators = action.payload.collaborators;
      })
      .addCase(memberProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update project visibility
      .addCase(updateProjectVisibility.pending, (state) => {
        state.status = "loading";
      })
      .addCase(updateProjectVisibility.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.visibility = action.payload.visibility;
        state.error = null;
      })
      .addCase(updateProjectVisibility.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearProject } = projectSlice.actions;
export default projectSlice.reducer;
