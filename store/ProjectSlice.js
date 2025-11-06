import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { showLoader, hideLoader } from "./LoadingSlice";

const initialState = {
  projectid: "",
  projectname: "Project",
  description: "",
  visibility: "",
  join_code: "",
  owner_id: "",
  owner: "",
  collaborators: [],
  onlineUsers: [],
  permissions: {
    canEdit: false,
    canView: false,
    isOwner: false,
    isCollaborator: false,
  },
  status: "idle",
  error: null,
};

// Fetch project with permissions
export const fetchProject = createAsyncThunk(
  "project/fetchProject",
  async (projectid, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Loading project"));

      const res = await fetch(`/api/project/${projectid}`, {
        credentials: "same-origin",
      });

      const data = await res.json();

      if (res.status === 403) {
        return rejectWithValue(
          data.error || "You don't have permission to view this project"
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch project");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
    }
  }
);

// Create new project
export const createProject = createAsyncThunk(
  "project/createProject",
  async (projectData, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Creating project"));

      const res = await fetch("/api/project/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(projectData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      return data.project;
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
    }
  }
);

// Fetch project members
export const memberProject = createAsyncThunk(
  "project/memberProject",
  async (projectid, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project/${projectid}/members`, {
        credentials: "same-origin",
      });

      const data = await res.json();

      // Handle 403 Forbidden
      if (res.status === 403) {
        return rejectWithValue(
          data.error || "You don't have permission to view members"
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch members");
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update project visibility
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
      state.join_code = "";
      state.owner_id = "";
      state.owner = "";
      state.collaborators = [];
      state.onlineUsers = [];
      state.permissions = {
        canEdit: false,
        canView: false,
        isOwner: false,
        isCollaborator: false,
      };
      state.status = "idle";
      state.error = null;
    },
    // Update online users from presence tracking
    updateOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },
    // Real-time member changes
    handleRemoteMemberInsert: (state, action) => {
      const newMember = action.payload;
      console.log('[ProjectSlice] Adding new member:', newMember);

      if (newMember.role === 'owner') {
        // Update owner if needed (shouldn't happen normally)
        state.owner = newMember;
      } else if (newMember.role === 'collaborator') {
        // Check if collaborator already exists
        const exists = state.collaborators.some(
          (collab) => collab.user_id === newMember.user_id
        );
        if (!exists) {
          state.collaborators.push(newMember);
        }
      }
    },
    handleRemoteMemberDelete: (state, action) => {
      const deletedMember = action.payload;
      state.collaborators = state.collaborators.filter(
        (collab) => collab.user_id !== deletedMember.user_id
      );
    },
    handleRemoteMemberUpdate: (state, action) => {
      const updatedMember = action.payload;

      if (updatedMember.role === 'owner') {
        state.owner = updatedMember;
      } else if (updatedMember.role === 'collaborator') {
        const index = state.collaborators.findIndex(
          (collab) => collab.user_id === updatedMember.user_id
        );
        if (index !== -1) {
          state.collaborators[index] = updatedMember;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Create project
      .addCase(createProject.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.projectid = action.payload.id;
        state.projectname = action.payload.title;
        state.description = action.payload.description;
        state.visibility = action.payload.visibility;
        state.owner_id = action.payload.owner_id;
        state.permissions = {
          canEdit: true,
          canView: true,
          isOwner: true,
          isCollaborator: false,
        };
        state.error = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch project with permissions
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
        state.error = action.payload || "Failed to fetch project";
        // Keep permissions as false when access is denied
        state.permissions = {
          canEdit: false,
          canView: false,
          isOwner: false,
          isCollaborator: false,
        };
      })

      // Fetch project members
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

export const {
  clearProject,
  updateOnlineUsers,
  handleRemoteMemberInsert,
  handleRemoteMemberDelete,
  handleRemoteMemberUpdate
} = projectSlice.actions;
export default projectSlice.reducer;
