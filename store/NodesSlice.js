import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { showLoader, hideLoader } from "./LoadingSlice";

const initialState = {
  nodes: [],
  activeFileId: null,
  openFiles: [],
  fileContents: {},
  remoteCursors: {}, // { fileId: { userId: { username, position, color, timestamp } } }
  lockedLines: {}, // { fileId: { lineNumber: { userId, username, timestamp } } }
  fileProblems: {}, // { fileId: [{ line, column, message, severity }] }
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
    // Update remote cursor position
    updateRemoteCursor: (state, action) => {
      const { fileId, userId, username, position, avatar_url } = action.payload;

      if (!state.remoteCursors[fileId]) {
        state.remoteCursors[fileId] = {};
      }

      // Generate a consistent color for this user
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
      const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const color = colors[userHash % colors.length];

      state.remoteCursors[fileId][userId] = {
        username,
        position,
        color,
        avatar_url,
        timestamp: Date.now(),
      };
    },
    // Remove remote cursor (when user leaves or stops editing)
    removeRemoteCursor: (state, action) => {
      const { fileId, userId } = action.payload;

      if (state.remoteCursors[fileId]) {
        delete state.remoteCursors[fileId][userId];

        // Clean up empty file entries
        if (Object.keys(state.remoteCursors[fileId]).length === 0) {
          delete state.remoteCursors[fileId];
        }
      }
    },
    // Clear all remote cursors for a file
    clearRemoteCursorsForFile: (state, action) => {
      const fileId = action.payload;
      delete state.remoteCursors[fileId];
    },
    // Lock a line for editing
    lockLine: (state, action) => {
      const { fileId, lineNumber, userId, username } = action.payload;

      if (!state.lockedLines[fileId]) {
        state.lockedLines[fileId] = {};
      }

      state.lockedLines[fileId][lineNumber] = {
        userId,
        username,
        timestamp: Date.now(),
      };
    },
    // Unlock a line
    unlockLine: (state, action) => {
      const { fileId, lineNumber, userId } = action.payload;

      if (state.lockedLines[fileId]?.[lineNumber]?.userId === userId) {
        delete state.lockedLines[fileId][lineNumber];

        // Clean up empty file entries
        if (Object.keys(state.lockedLines[fileId]).length === 0) {
          delete state.lockedLines[fileId];
        }
      }
    },
    // Unlock all lines for a specific user
    unlockUserLines: (state, action) => {
      const { fileId, userId } = action.payload;

      if (state.lockedLines[fileId]) {
        Object.keys(state.lockedLines[fileId]).forEach((lineNumber) => {
          if (state.lockedLines[fileId][lineNumber].userId === userId) {
            delete state.lockedLines[fileId][lineNumber];
          }
        });

        // Clean up empty file entries
        if (Object.keys(state.lockedLines[fileId]).length === 0) {
          delete state.lockedLines[fileId];
        }
      }
    },
    // Clear all locked lines for a file
    clearLockedLinesForFile: (state, action) => {
      const fileId = action.payload;
      delete state.lockedLines[fileId];
    },
    // Update file problems (linting/syntax errors)
    setFileProblems: (state, action) => {
      const { fileId, problems } = action.payload;
      state.fileProblems[fileId] = problems;
    },
    // Clear problems for a file
    clearFileProblems: (state, action) => {
      const fileId = action.payload;
      delete state.fileProblems[fileId];
    },
    // Real-time actions for handling changes from other users
    handleRemoteNodeInsert: (state, action) => {
      const newNode = action.payload;
      // Check if node already exists (avoid duplicates)
      const exists = state.nodes.some((n) => n.id === newNode.id);
      if (!exists) {
        state.nodes.push(newNode);
        if (newNode.type === "file") {
          state.fileContents[newNode.id] = newNode.content || "";
        }
      }
    },
    handleRemoteNodeUpdate: (state, action) => {
      const updatedNode = action.payload;
      const index = state.nodes.findIndex((n) => n.id === updatedNode.id);
      if (index !== -1) {
        const oldNode = state.nodes[index];
        state.nodes[index] = updatedNode;

        // Update file content cache if it's a file and content changed
        if (updatedNode.type === "file") {
          // Only update if the file is not currently being edited by the user
          // or if it's not the active file (to prevent overwriting user's changes)
          const isActiveFile = state.activeFileId === updatedNode.id;
          const hasLocalChanges = state.fileContents[updatedNode.id] !== oldNode.content;

          // Update content cache, but mark conflict if user has unsaved changes
          if (!isActiveFile || !hasLocalChanges) {
            state.fileContents[updatedNode.id] = updatedNode.content;
          }
        }
      }
    },
    handleRemoteNodeDelete: (state, action) => {
      const deletedNode = action.payload;

      // Handle both cases: full node object or just ID
      const nodeId = deletedNode?.id || deletedNode;

      if (!nodeId) {
        console.error('[NodesSlice] handleRemoteNodeDelete: No node ID provided');
        return;
      }

      console.log('[NodesSlice] Deleting node:', nodeId);

      const removeNodeAndChildren = (id) => {
        const children = state.nodes.filter((n) => n.parent_id === id);
        children.forEach((child) => removeNodeAndChildren(child.id));
        state.nodes = state.nodes.filter((n) => n.id !== id);
        delete state.fileContents[id];
      };

      removeNodeAndChildren(nodeId);

      // Close the file if it was open
      state.openFiles = state.openFiles.filter((id) => id !== nodeId);
      if (state.activeFileId === nodeId) {
        state.activeFileId = state.openFiles[0] || null;
      }
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

export const {
  setActiveFile,
  closeFile,
  closeAllFiles,
  updateLocalContent,
  updateRemoteCursor,
  removeRemoteCursor,
  clearRemoteCursorsForFile,
  lockLine,
  unlockLine,
  unlockUserLines,
  clearLockedLinesForFile,
  setFileProblems,
  clearFileProblems,
  handleRemoteNodeInsert,
  handleRemoteNodeUpdate,
  handleRemoteNodeDelete
} = nodesSlice.actions;
export default nodesSlice.reducer;