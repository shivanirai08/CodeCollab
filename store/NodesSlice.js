import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { showLoader, hideLoader } from "./LoadingSlice";
import { fetchGitStatus } from "./ProjectSlice";
import {
  getGitDiffTabId,
  getNextEditorTabId,
  getNodeIdFromTabId,
  isGitDiffTabId,
} from "@/lib/editorTabs";
import { normalizeGitNodePath } from "@/lib/gitStatus";

function resolveNodeRelativePath(nodes, nodeId) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const segments = [];
  let current = nodeMap.get(nodeId);
  while (current) {
    segments.unshift(current.name);
    current = current.parent_id ? nodeMap.get(current.parent_id) : null;
  }
  return normalizeGitNodePath(segments.join("/"));
}

function syncOpenFiles(state) {
  state.openFiles = state.editorTabOrder.filter((tabId) => !isGitDiffTabId(tabId));
}

function closeTabsForNode(state, nodeId) {
  const diffTabId = getGitDiffTabId(nodeId);
  state.editorTabOrder = state.editorTabOrder.filter(
    (id) => id !== nodeId && id !== diffTabId
  );
  delete state.fileContents[nodeId];
  delete state.gitDiffTabsById[diffTabId];

  if (state.activeEditorTabId === nodeId || state.activeEditorTabId === diffTabId) {
    setActiveTab(state, getNextEditorTabId(state.editorTabOrder, nodeId));
  }

  syncOpenFiles(state);
}

function setActiveTab(state, tabId) {
  state.activeEditorTabId = tabId;
  state.activeFileId = tabId ? getNodeIdFromTabId(tabId) : null;
}

function notifyProjectAccessLost(projectId, errorMessage) {
  if (typeof window === "undefined" || !projectId) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("project-access-lost", {
      detail: {
        projectId,
        error: errorMessage || "You no longer have access to this project.",
      },
    })
  );
}

const initialState = {
  nodes: [],
  activeFileId: null,
  activeEditorTabId: null,
  editorTabOrder: [],
  openFiles: [],
  fileContents: {},
  gitDiffTabsById: {},
  remoteCursors: {}, // { fileId: { userId: { username, position, color, timestamp } } }
  lockedLines: {}, // { fileId: { lineNumber: { userId, username, timestamp } } }
  fileProblems: {}, // { fileId: [{ line, column, message, severity }] }
  editorSaveCancelToken: 0,
  editorSaveFlushToken: 0,
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
        if (res.status === 401 || res.status === 403) {
          notifyProjectAccessLost(projectId, errorData.error);
        }
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
      if (projectId) {
        dispatch(fetchGitStatus(projectId));
      }
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
  async ({ nodeId, updates, projectId }, { rejectWithValue, dispatch }) => {
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
      if (projectId) {
        dispatch(fetchGitStatus(projectId));
      }
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
  async ({ nodeId, content, projectId }, { rejectWithValue, dispatch }) => {
    try {
      const res = await fetch(`/api/project/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401 || res.status === 403) {
          notifyProjectAccessLost(projectId, errorData.error);
        }
        throw new Error(errorData.error || "Failed to update file content");
      }
      
      const data = await res.json();
      if (projectId) {
        dispatch(fetchGitStatus(projectId));
      }
      return { nodeId, content: data.node.content };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete node
export const deleteNode = createAsyncThunk(
  "nodes/deleteNode",
  async ({ nodeId, projectId }, { rejectWithValue, dispatch }) => {
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
      
      if (projectId) {
        dispatch(fetchGitStatus(projectId));
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
      if (!fileId) {
        setActiveTab(state, null);
        return;
      }

      if (!state.editorTabOrder.includes(fileId)) {
        state.editorTabOrder.push(fileId);
      }

      setActiveTab(state, fileId);
      syncOpenFiles(state);
    },
    setActiveEditorTab: (state, action) => {
      const tabId = action.payload;
      if (!tabId) {
        setActiveTab(state, null);
        return;
      }

      if (!state.editorTabOrder.includes(tabId)) {
        state.editorTabOrder.push(tabId);
      }

      setActiveTab(state, tabId);
      syncOpenFiles(state);
    },
    openGitDiffTab: (state, action) => {
      const { nodeId, filePath, original, modified } = action.payload;
      const tabId = getGitDiffTabId(nodeId);
      const previousRevision = state.gitDiffTabsById[tabId]?.contentRevision ?? 0;

      state.gitDiffTabsById[tabId] = {
        nodeId,
        filePath,
        original: original ?? "",
        modified: modified ?? "",
        contentRevision: previousRevision + 1,
      };

      if (!state.editorTabOrder.includes(tabId)) {
        state.editorTabOrder.push(tabId);
      }

      setActiveTab(state, tabId);
      syncOpenFiles(state);
    },
    updateGitDiffTabModified: (state, action) => {
      const { tabId, modified } = action.payload;
      if (state.gitDiffTabsById[tabId]) {
        state.gitDiffTabsById[tabId].modified = modified;
      }
    },
    closeEditorTab: (state, action) => {
      const tabId = action.payload;
      state.editorTabOrder = state.editorTabOrder.filter((id) => id !== tabId);

      if (isGitDiffTabId(tabId)) {
        delete state.gitDiffTabsById[tabId];
      } else {
        delete state.fileContents[tabId];
      }

      if (state.activeEditorTabId === tabId) {
        setActiveTab(state, getNextEditorTabId(state.editorTabOrder, tabId));
      }

      syncOpenFiles(state);
    },
    closeFile: (state, action) => {
      const fileId = action.payload;
      const diffTabId = getGitDiffTabId(fileId);

      state.editorTabOrder = state.editorTabOrder.filter(
        (id) => id !== fileId && id !== diffTabId
      );
      delete state.gitDiffTabsById[diffTabId];

      if (state.activeEditorTabId === fileId || state.activeEditorTabId === diffTabId) {
        setActiveTab(state, getNextEditorTabId(state.editorTabOrder, fileId));
      }

      syncOpenFiles(state);
    },
    closeAllFiles: (state) => {
      state.editorTabOrder = [];
      state.openFiles = [];
      state.fileContents = {};
      state.gitDiffTabsById = {};
      setActiveTab(state, null);
    },
    resetWorkspace: (state) => {
      state.nodes = [];
      setActiveTab(state, null);
      state.editorTabOrder = [];
      state.openFiles = [];
      state.fileContents = {};
      state.gitDiffTabsById = {};
      state.remoteCursors = {};
      state.lockedLines = {};
      state.fileProblems = {};
      state.status = "idle";
      state.error = null;
    },
    updateLocalContent: (state, action) => {
      const { nodeId, content } = action.payload;
      state.fileContents[nodeId] = content;
    },
    requestEditorSaveCancel: (state) => {
      state.editorSaveCancelToken += 1;
    },
    requestEditorSaveFlush: (state) => {
      state.editorSaveFlushToken += 1;
    },
    invalidateLocalFileContents: (state, action) => {
      const { paths = [], all = false } = action.payload || {};
      const normalizedPaths = new Set(paths.map((path) => normalizeGitNodePath(path)));

      state.nodes.forEach((node) => {
        if (node.type !== "file") return;
        const nodePath = resolveNodeRelativePath(state.nodes, node.id);
        if (all || normalizedPaths.has(nodePath)) {
          delete state.fileContents[node.id];
        }
      });
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
          const hasLocalChanges = state.fileContents[updatedNode.id] !== oldNode.content;

          if (!hasLocalChanges) {
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

      const removeNodeAndChildren = (id) => {
        const children = state.nodes.filter((n) => n.parent_id === id);
        children.forEach((child) => removeNodeAndChildren(child.id));
        state.nodes = state.nodes.filter((n) => n.id !== id);
        delete state.fileContents[id];
      };

      removeNodeAndChildren(nodeId);

      closeTabsForNode(state, nodeId);
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
        const dirtyFileIds = new Set();
        state.nodes.forEach((node) => {
          if (node.type !== "file") return;
          const cached = state.fileContents[node.id];
          if (cached !== undefined && cached !== node.content) {
            dirtyFileIds.add(node.id);
          }
        });

        state.status = "succeeded";
        state.nodes = action.payload;
        const nodeIds = new Set(action.payload.map((node) => node.id));
        state.editorTabOrder = state.editorTabOrder.filter((tabId) => {
          const nodeId = getNodeIdFromTabId(tabId);
          return nodeIds.has(nodeId);
        });
        Object.keys(state.gitDiffTabsById).forEach((tabId) => {
          const nodeId = state.gitDiffTabsById[tabId]?.nodeId;
          if (!nodeIds.has(nodeId)) {
            delete state.gitDiffTabsById[tabId];
          }
        });
        if (
          state.activeEditorTabId &&
          !state.editorTabOrder.includes(state.activeEditorTabId)
        ) {
          setActiveTab(state, state.editorTabOrder[0] || null);
        }
        syncOpenFiles(state);
        // Pre-cache content for all files, preserving unsaved local edits
        action.payload.forEach((node) => {
          if (node.type === "file") {
            if (!dirtyFileIds.has(node.id)) {
              state.fileContents[node.id] = node.content || "";
            }
          }
        });
        Object.keys(state.fileContents).forEach((fileId) => {
          if (!nodeIds.has(fileId)) {
            delete state.fileContents[fileId];
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
        // Node will be added via real-time subscription (handleRemoteNodeInsert)
        // This prevents duplicate nodes from being created
        state.error = null;
      })
      .addCase(createNode.rejected, (state, action) => {
        state.error = action.payload;
      })
      // Update node
      .addCase(updateNode.fulfilled, (state, action) => {
        const index = state.nodes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          const oldNode = state.nodes[index];
          const cachedContent = state.fileContents[action.payload.id];
          const hasLocalChanges =
            cachedContent !== undefined && cachedContent !== oldNode.content;

          state.nodes[index] = action.payload;
          if (action.payload.type === "file" && !hasLocalChanges) {
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
        closeTabsForNode(state, nodeId);
        state.error = null;
      })
      .addCase(deleteNode.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  setActiveFile,
  setActiveEditorTab,
  openGitDiffTab,
  updateGitDiffTabModified,
  closeEditorTab,
  closeFile,
  closeAllFiles,
  resetWorkspace,
  updateLocalContent,
  requestEditorSaveCancel,
  requestEditorSaveFlush,
  invalidateLocalFileContents,
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
