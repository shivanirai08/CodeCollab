import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { showLoader, hideLoader } from "./LoadingSlice";

const initialState = {
  nodes: [],
  activeFileId: null,
  openFiles: [],
  fileContents: {},
  status: "idle",
  error: null,
};

// Fetch all nodes for a project
export const fetchNodes = createAsyncThunk(
  "nodes/fetchNodes",
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project/${projectId}/nodes`, {
        credentials: "same-origin",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Fetch nodes failed:", errorData);
        throw new Error(errorData.error || "Failed to fetch nodes");
      }
      
      const data = await res.json();
      return data.nodes;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch single file content
export const fetchFileContent = createAsyncThunk(
  "nodes/fetchFileContent",
  async (nodeId, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Loading file content"));
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        credentials: "same-origin",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch file content");
      }
      
      const data = await res.json();
      return { nodeId, content: data.node.content, language: data.node.language };
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
    }
  }
);

// Create a new node (file or folder)
export const createNode = createAsyncThunk(
  "nodes/createNode",
  async ({ projectId, name, type, parent_id, content, language }, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Creating node"));
      const res = await fetch(`/api/project/${projectId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, type, parent_id, content, language }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create node");
      }
      
      const data = await res.json();
      return data.node;
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
    }
  }
);

// Update node (for content changes)
export const updateNode = createAsyncThunk(
  "nodes/updateNode",
  async ({ nodeId, updates }, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Updating node"));
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update node");
      }
      
      const data = await res.json();
      return data.node;
    } catch (error) {
      return rejectWithValue(error.message);
    }finally {
      dispatch(hideLoader());
    }
  }
);

// Update file content (debounced save)
export const updateFileContent = createAsyncThunk(
  "nodes/updateFileContent",
  async ({ nodeId, content }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update file content");
      }
      
      const data = await res.json();
      return { nodeId, content: data.node.content };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete node
export const deleteNode = createAsyncThunk(
  "nodes/deleteNode",
  async (nodeId, { rejectWithValue, dispatch }) => {
    try {
      dispatch(showLoader("Deleting node"));
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete node");
      }
      
      return nodeId;
    } catch (error) {
      return rejectWithValue(error.message);
    } finally {
      dispatch(hideLoader());
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
      // Remove from cache
      delete state.fileContents[fileId];
      if (state.activeFileId === fileId) {
        state.activeFileId = state.openFiles[0] || null;
      }
    },
    closeAllFiles: (state) => {
      state.openFiles = [];
      state.fileContents = {};
      state.activeFileId = null;
    },
    updateLocalContent: (state, action) => {
      const { nodeId, content } = action.payload;
      state.fileContents[nodeId] = content;
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
        // Pre-cache content for all files
        action.payload.forEach((node) => {
          if (node.type === "file") {
            state.fileContents[node.id] = node.content || "";
          }
        });
        state.error = null;
      })
      .addCase(fetchNodes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Fetch file content
      .addCase(fetchFileContent.fulfilled, (state, action) => {
        const { nodeId, content } = action.payload;
        state.fileContents[nodeId] = content;
      })
      // Create node
      .addCase(createNode.pending, (state) => {
        state.error = null;
      })
      .addCase(createNode.fulfilled, (state, action) => {
        state.nodes.push(action.payload);
        if (action.payload.type === "file") {
          state.fileContents[action.payload.id] = action.payload.content || "";
        }
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
          if (action.payload.type === "file") {
            state.fileContents[action.payload.id] = action.payload.content;
          }
        }
        state.error = null;
      })
      .addCase(updateNode.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Update file content
      .addCase(updateFileContent.fulfilled, (state, action) => {
        const { nodeId, content } = action.payload;
        state.fileContents[nodeId] = content;
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.content = content;
        }
      })
      // Delete node
      .addCase(deleteNode.fulfilled, (state, action) => {
        const nodeId = action.payload;
        const removeNodeAndChildren = (id) => {
          const children = state.nodes.filter((n) => n.parent_id === id);
          children.forEach((child) => removeNodeAndChildren(child.id));
          state.nodes = state.nodes.filter((n) => n.id !== id);
          delete state.fileContents[id];
        };
        
        removeNodeAndChildren(nodeId);
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

export const { setActiveFile, closeFile, closeAllFiles, updateLocalContent } = nodesSlice.actions;
export default nodesSlice.reducer;