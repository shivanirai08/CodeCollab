import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  nodes: [],
  activeFileId: null,
  openFiles: [],
  status: "idle",
  error: null,
};

// Fetch all nodes for a project
export const fetchNodes = createAsyncThunk(
  "nodes/fetchNodes",
  async (projectId, { rejectWithValue }) => {
    try {
      console.log("Fetching nodes for project:", projectId);
      const res = await fetch(`/api/project/${projectId}/nodes`, {
        credentials: "same-origin",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Fetch nodes failed:", errorData);
        throw new Error(errorData.error || "Failed to fetch nodes");
      }
      
      const data = await res.json();
      console.log("Nodes fetched:", data.nodes);
      return data.nodes;
    } catch (error) {
      console.error("Fetch nodes error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Create a new node (file or folder)
export const createNode = createAsyncThunk(
  "nodes/createNode",
  async ({ projectId, name, type, parent_id, content, language }, { rejectWithValue }) => {
    try {
      console.log("Creating node:", { projectId, name, type, parent_id });
      
      const res = await fetch(`/api/project/${projectId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, type, parent_id, content, language }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Create node failed:", errorData);
        throw new Error(errorData.error || "Failed to create node");
      }
      
      const data = await res.json();
      console.log("Node created:", data.node);
      return data.node;
    } catch (error) {
      console.error("Create node error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Update node
export const updateNode = createAsyncThunk(
  "nodes/updateNode",
  async ({ nodeId, updates }, { rejectWithValue }) => {
    try {
      console.log("Updating node:", nodeId, updates);
      
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Update node failed:", errorData);
        throw new Error(errorData.error || "Failed to update node");
      }
      
      const data = await res.json();
      console.log("Node updated:", data.node);
      return data.node;
    } catch (error) {
      console.error("Update node error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Delete node
export const deleteNode = createAsyncThunk(
  "nodes/deleteNode",
  async (nodeId, { rejectWithValue }) => {
    try {
      console.log("Deleting node:", nodeId);
      
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Delete node failed:", errorData);
        throw new Error(errorData.error || "Failed to delete node");
      }
      
      console.log("Node deleted successfully");
      return nodeId;
    } catch (error) {
      console.error("Delete node error:", error);
      return rejectWithValue(error.message);
    }
  }
);

const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: {
    setActiveFile: (state, action) => {
      const fileId = action.payload;
      state.activeFileId = fileId;
      if (fileId && !state.openFiles.includes(fileId)) {
        state.openFiles.push(fileId);
      }
    },
    closeFile: (state, action) => {
      const fileId = action.payload;
      state.openFiles = state.openFiles.filter((id) => id !== fileId);
      if (state.activeFileId === fileId) {
        state.activeFileId = state.openFiles[0] || null;
      }
    },
    closeAllFiles: (state) => {
      state.openFiles = [];
      state.activeFileId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch nodes
      .addCase(fetchNodes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchNodes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.nodes = action.payload;
        state.error = null;
      })
      .addCase(fetchNodes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Create node
      .addCase(createNode.pending, (state) => {
        state.error = null;
      })
      .addCase(createNode.fulfilled, (state, action) => {
        state.nodes.push(action.payload);
        state.error = null;
      })
      .addCase(createNode.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Update node
      .addCase(updateNode.fulfilled, (state, action) => {
        const index = state.nodes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.nodes[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateNode.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Delete node
      .addCase(deleteNode.fulfilled, (state, action) => {
        const nodeId = action.payload;
        // Remove the node and all its children recursively
        const removeNodeAndChildren = (id) => {
          const children = state.nodes.filter((n) => n.parent_id === id);
          children.forEach((child) => removeNodeAndChildren(child.id));
          state.nodes = state.nodes.filter((n) => n.id !== id);
        };
        
        removeNodeAndChildren(nodeId);
        
        // Remove from open files if deleted
        state.openFiles = state.openFiles.filter((id) => id !== nodeId);
        if (state.activeFileId === nodeId) {
          state.activeFileId = state.openFiles[0] || null;
        }
        state.error = null;
      })
      .addCase(deleteNode.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { setActiveFile, closeFile, closeAllFiles } = nodesSlice.actions;
export default nodesSlice.reducer;