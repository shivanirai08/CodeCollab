"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useSelector, useDispatch } from "react-redux";
import { updateLocalContent, updateFileContent, updateRemoteCursor, removeRemoteCursor, clearRemoteCursorsForFile, lockLine, unlockLine, unlockUserLines, clearLockedLinesForFile } from "@/store/NodesSlice";
import { debounce } from "lodash";
import { toast } from "sonner";
import useCollaborativeEditing from "@/hooks/useCollaborativeEditing";
import useRemoteCursors from "@/hooks/useRemoteCursors";
import useLineLocks from "@/hooks/useLineLocks";
import { useParams } from "next/navigation";

/**
 * parseConflictBlocks(text)
 * Scans raw file content for git conflict markers and returns an array of
 * block descriptors with 1-based line numbers and the "ours"/"theirs" lines
 * needed to resolve each conflict.
 */
function parseConflictBlocks(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const no = i + 1;
    if (line.startsWith("<<<<<<<")) {
      cur = { startLine: no, oursLines: [], separatorLine: 0, theirsLines: [], endLine: 0, oursLabel: line.slice(8).trim(), theirsLabel: "" };
    } else if (line.startsWith("=======") && cur && cur.separatorLine === 0) {
      cur.separatorLine = no;
    } else if (line.startsWith(">>>>>>>") && cur && cur.separatorLine > 0) {
      cur.endLine = no;
      cur.theirsLabel = line.slice(8).trim();
      blocks.push({ ...cur });
      cur = null;
    } else if (cur) {
      if (cur.separatorLine === 0) cur.oursLines.push(line);
      else cur.theirsLines.push(line);
    }
  }
  return blocks;
}

/**
 * applyConflictDecorationsToEditor
 * Applies Monaco whole-line background decorations for conflict regions.
 * "Current Change" (ours) gets a blue left-border; "Incoming Change" (theirs)
 * gets a green left-border — matching VS Code's merge editor colours.
 */
function applyConflictDecorationsToEditor(editor, blocks, decorationsRef) {
  const newDecorations = [];
  for (const b of blocks) {
    // <<<<<<< header line
    newDecorations.push({ range: { startLineNumber: b.startLine, startColumn: 1, endLineNumber: b.startLine, endColumn: 1 }, options: { isWholeLine: true, className: "conflict-marker-header conflict-current-border" } });
    // "Current Change" body
    const oursStart = b.startLine + 1;
    const oursEnd = b.separatorLine - 1;
    if (oursEnd >= oursStart) {
      newDecorations.push({ range: { startLineNumber: oursStart, startColumn: 1, endLineNumber: oursEnd, endColumn: 1 }, options: { isWholeLine: true, className: "conflict-current-bg conflict-current-border" } });
    }
    // ======= separator
    newDecorations.push({ range: { startLineNumber: b.separatorLine, startColumn: 1, endLineNumber: b.separatorLine, endColumn: 1 }, options: { isWholeLine: true, className: "conflict-marker-header" } });
    // "Incoming Change" body
    const theirsStart = b.separatorLine + 1;
    const theirsEnd = b.endLine - 1;
    if (theirsEnd >= theirsStart) {
      newDecorations.push({ range: { startLineNumber: theirsStart, startColumn: 1, endLineNumber: theirsEnd, endColumn: 1 }, options: { isWholeLine: true, className: "conflict-incoming-bg conflict-incoming-border" } });
    }
    // >>>>>>> footer line
    newDecorations.push({ range: { startLineNumber: b.endLine, startColumn: 1, endLineNumber: b.endLine, endColumn: 1 }, options: { isWholeLine: true, className: "conflict-marker-header conflict-incoming-border" } });
  }
  if (decorationsRef.current) {
    decorationsRef.current.set(newDecorations);
  } else if (newDecorations.length > 0 && editor.createDecorationsCollection) {
    decorationsRef.current = editor.createDecorationsCollection(newDecorations);
  }
}

const MonacoEditor = () => {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const params = useParams();
  const projectId = params.id;
  const [versionCounter, setVersionCounter] = useState(0);
  const currentLockedLineRef = useRef(null);
  const lockTimeoutRef = useRef(null);
  const contentChangeDisposableRef = useRef(null);
  const lockedLinesRef = useRef({});
  const isApplyingRemoteChangeCheckRef = useRef(null);
  const lastToastTimeRef = useRef({}); // Track last toast time per line
  const isLocalChangeRef = useRef(false); // Track if change is from local user
  const currentContentRef = useRef(""); // Track current content

  // Conflict-resolution refs
  const conflictBlocksRef = useRef([]);   // current parsed blocks for the open file
  const conflictCommandsRef = useRef({ current: null, incoming: null, both: null }); // Monaco command IDs
  const conflictDecorationsRef = useRef(null); // IEditorDecorationsCollection

  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const nodes = useSelector((state) => state.nodes.nodes);
  const fileContents = useSelector((state) => state.nodes.fileContents);
  const permissions = useSelector((state) => state.project.permissions);
  const remoteCursors = useSelector((state) => state.nodes.remoteCursors[activeFileId] || {});
  const lockedLines = useSelector((state) => state.nodes.lockedLines[activeFileId] || {});
  const isReadOnly = !permissions.canEdit;

  // Get active file details
  const activeFile = nodes.find((n) => n.id === activeFileId);
  const content = activeFileId ? fileContents[activeFileId] || "" : "";

  // Collaborative editing callbacks
  const handleRemoteContentChange = useCallback((data) => {
    if (!editorRef.current || !activeFileId) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // Get current cursor position and selection
    const currentPosition = editor.getPosition();
    const currentSelection = editor.getSelection();

    // Update content using Monaco's API to preserve cursor position
    const currentValue = model.getValue();

    // Only update if content actually changed
    if (currentValue !== data.content) {
      // Mark as remote change to prevent broadcasting back
      isLocalChangeRef.current = false;

      // Use pushEditOperations to update content while preserving undo stack
      model.pushEditOperations(
        [],
        [{
          range: model.getFullModelRange(),
          text: data.content
        }],
        () => null
      );

      // Restore cursor position
      if (currentPosition && currentSelection) {
        editor.setPosition(currentPosition);
        editor.setSelection(currentSelection);
      }

      // Update ref
      currentContentRef.current = data.content;
    }

    // Update Redux state (without triggering re-render of value prop)
    dispatch(updateLocalContent({ nodeId: activeFileId, content: data.content }));
  }, [dispatch, activeFileId]);

  /**
   * Handle remote cursor position updates from other collaborators
   * Updates Redux to show colored cursors with usernames in the editor
   */
  const handleRemoteCursorChange = useCallback((data) => {
    if (!activeFileId) return;

    dispatch(updateRemoteCursor({
      fileId: activeFileId,
      userId: data.userId,
      username: data.username,
      position: data.position,
      avatar_url: data.avatar_url,
    }));
  }, [dispatch, activeFileId]);

  /**
   * Handle remote line lock events
   * Shows lock icon in gutter when another user is editing a line
   */
  const handleLineLock = useCallback((data) => {
    if (!activeFileId) return;

    dispatch(lockLine({
      fileId: activeFileId,
      lineNumber: data.lineNumber,
      userId: data.userId,
      username: data.username,
    }));
  }, [dispatch, activeFileId]);

  /**
   * Handle remote line unlock events
   * Removes lock icon when user moves away from the line
   */
  const handleLineUnlock = useCallback((data) => {
    if (!activeFileId) return;

    dispatch(unlockLine({
      fileId: activeFileId,
      lineNumber: data.lineNumber,
      userId: data.userId,
    }));

    // Clear the toast cooldown for this line when it's unlocked
    if (lastToastTimeRef.current[data.lineNumber]) {
      delete lastToastTimeRef.current[data.lineNumber];
    }
  }, [dispatch, activeFileId]);

  /**
   * Handle user leaving file event
   * Cleans up their cursor and releases all their line locks
   */
  const handleUserLeaveFile = useCallback((data) => {
    if (!activeFileId) return;

    // Remove cursor for this user
    dispatch(removeRemoteCursor({
      fileId: activeFileId,
      userId: data.userId,
    }));

    // Unlock all lines locked by this user
    dispatch(unlockUserLines({
      fileId: activeFileId,
      userId: data.userId,
    }));
  }, [dispatch, activeFileId]);

  // Get current user info to ensure it's loaded
  const currentUserId = useSelector((state) => state.user.id);
  const currentUsername = useSelector((state) => state.user.userName);

  // Collaborative editing hook - enabled for both view and edit users
  // View-only users can receive updates but cannot broadcast
  const collaborativeEditing = useCollaborativeEditing(projectId, activeFileId, {
    onRemoteChange: handleRemoteContentChange,
    onRemoteCursor: handleRemoteCursorChange,
    onLineLock: handleLineLock,
    onLineUnlock: handleLineUnlock,
    onUserLeaveFile: handleUserLeaveFile,
    enabled: (permissions.canView || permissions.canEdit) && !!activeFileId && !!currentUserId,
    canBroadcast: permissions.canEdit, // Only users with edit permission can broadcast
  });

  const { broadcastContentChange, broadcastCursorPosition, broadcastLineLock, broadcastLineUnlock, isApplyingRemoteChange } = collaborativeEditing;


  // Debounced save to database
  const debouncedSave = useCallback(
    debounce((nodeId, content) => {
      if (!permissions.canEdit) return;
      dispatch(updateFileContent({ nodeId, content, projectId }));
    }, 2000),
    [dispatch, permissions.canEdit, projectId]
  );

  // Handle editor content change
  const handleEditorChange = (value) => {
    if (!activeFileId || !permissions.canEdit) return;

    // Don't broadcast if we're applying a remote change
    if (isApplyingRemoteChange() || isLocalChangeRef.current === false) {
      isLocalChangeRef.current = true; // Reset flag
      return;
    }

    // Mark as local change
    isLocalChangeRef.current = true;
    currentContentRef.current = value;

    const newVersion = versionCounter + 1;
    setVersionCounter(newVersion);

    dispatch(updateLocalContent({ nodeId: activeFileId, content: value }));
    debouncedSave(activeFileId, value);

    // Broadcast content change to collaborators
    if (broadcastContentChange) {
      broadcastContentChange(value, newVersion);
    }
  };

  const handleReadOnlyAttempt = () => {
    if (isReadOnly) {
      toast.error("You don't have permission to edit this file");
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Clear remote cursors and locked lines when switching files
  useEffect(() => {
    if (activeFileId) {
      // Clear old cursors and locked lines when switching files
      return () => {
        dispatch(clearRemoteCursorsForFile(activeFileId));
        dispatch(clearLockedLinesForFile(activeFileId));

        // Unlock current user's line when switching files
        if (currentLockedLineRef.current && broadcastLineUnlock) {
          broadcastLineUnlock(currentLockedLineRef.current);
          dispatch(unlockLine({
            fileId: activeFileId,
            lineNumber: currentLockedLineRef.current,
            userId: currentUserId,
          }));
        }
        currentLockedLineRef.current = null;

        // Clear timeout
        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
          lockTimeoutRef.current = null;
        }

        // Clear toast tracking when switching files
        lastToastTimeRef.current = {};
      };
    }
  }, [activeFileId, dispatch, broadcastLineUnlock, currentUserId]);

  // Keep lockedLinesRef updated
  useEffect(() => {
    lockedLinesRef.current = lockedLines;
  }, [lockedLines]);

  // Keep isApplyingRemoteChangeCheck updated
  useEffect(() => {
    isApplyingRemoteChangeCheckRef.current = isApplyingRemoteChange;
  }, [isApplyingRemoteChange]);

  // Render remote cursors using custom hook
  useRemoteCursors(editorRef, monaco, remoteCursors);

  // Render line locks using custom hook (only show OTHER users' locks, not your own)
  useLineLocks(editorRef, monaco, lockedLines, currentUserId);

  // Setup Monaco theme + conflict decoration CSS + CodeLens provider
  useEffect(() => {
    if (!monaco) return;

    monaco.editor.defineTheme("my-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#18181e",
      },
    });
    monaco.editor.setTheme("my-dark");

    // Inject conflict decoration CSS once per page
    const styleId = "monaco-conflict-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = [
        ".conflict-current-bg     { background: rgba(40,90,200,0.18)  !important; }",
        ".conflict-incoming-bg    { background: rgba(22,163,74,0.18)   !important; }",
        ".conflict-marker-header  { background: rgba(80,80,80,0.22)    !important; }",
        ".conflict-current-border  { border-left: 3px solid rgba(64,128,255,0.8)  !important; }",
        ".conflict-incoming-border { border-left: 3px solid rgba(22,163,74,0.8)   !important; }",
      ].join("\n");
      document.head.appendChild(style);
    }

    // Register a CodeLens provider that surfaces "Accept …" buttons above each
    // conflict block.  The provider reads from refs so it always reflects the
    // current file's blocks and the current editor instance's command IDs.
    const codeLensDisposable = monaco.languages.registerCodeLensProvider("*", {
      provideCodeLenses(_model) {
        const blocks = conflictBlocksRef.current;
        const cmds = conflictCommandsRef.current;
        if (!blocks.length || !cmds.current) return { lenses: [], dispose: () => {} };

        const lenses = [];
        blocks.forEach((block, i) => {
          const range = { startLineNumber: block.startLine, startColumn: 1, endLineNumber: block.startLine, endColumn: 1 };
          lenses.push({ range, command: { id: cmds.current,  title: "✓ Accept Current Change",  arguments: [i] } });
          lenses.push({ range, command: { id: cmds.incoming, title: "✓ Accept Incoming Change", arguments: [i] } });
          lenses.push({ range, command: { id: cmds.both,     title: "↕ Accept Both Changes",    arguments: [i] } });
        });
        return { lenses, dispose: () => {} };
      },
      resolveCodeLens(_model, codeLens) {
        return codeLens;
      },
    });

    return () => {
      codeLensDisposable.dispose();
    };
  }, [monaco]);

  // Store cursor tracking disposable
  const cursorDisposableRef = useRef(null);

  /**
   * Handle editor mount event
   * Sets up cursor tracking, line locking, and read-only mode restrictions
   */
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    // Initialize refs
    isLocalChangeRef.current = true;
    currentContentRef.current = editor.getValue();

    // Add event listener for read-only attempts
    if (isReadOnly) {
      editor.onKeyDown((e) => {
        const allowedKeys = [
          monaco.KeyCode.UpArrow,
          monaco.KeyCode.DownArrow,
          monaco.KeyCode.LeftArrow,
          monaco.KeyCode.RightArrow,
          monaco.KeyCode.PageUp,
          monaco.KeyCode.PageDown,
          monaco.KeyCode.Home,
          monaco.KeyCode.End,
        ];

        if (!allowedKeys.includes(e.keyCode) && !e.ctrlKey && !e.metaKey) {
          handleReadOnlyAttempt();
        }
      });
    }

    // Set up cursor tracking and line locking
    if (permissions.canEdit && broadcastCursorPosition) {

      cursorDisposableRef.current = editor.onDidChangeCursorPosition((e) => {
        const position = e.position;

        // Broadcast cursor position
        broadcastCursorPosition({
          lineNumber: position.lineNumber,
          column: position.column,
        });
      });

      // Set up line locking on content changes
      contentChangeDisposableRef.current = editor.onDidChangeModelContent((e) => {
        if (!permissions.canEdit) return;

        const model = editor.getModel();
        if (!model) return;

        // Skip lock check if we're applying a remote change (prevents feedback loop)
        if (isApplyingRemoteChangeCheckRef.current && isApplyingRemoteChangeCheckRef.current()) {
          return;
        }

        // Get current locked lines
        const currentLockedLines = lockedLinesRef.current;

        // Check if any changes were made to locked lines (locked by OTHER users)
        for (const change of e.changes) {
          const startLine = change.range.startLineNumber;
          const endLine = change.range.endLineNumber;

          // Check all affected lines
          for (let line = startLine; line <= endLine; line++) {
            if (currentLockedLines[line] && currentLockedLines[line].userId !== currentUserId) {
              // Show toast only if we haven't shown one for this line in the last 3 seconds
              const now = Date.now();
              const lastToastTime = lastToastTimeRef.current[line] || 0;
              const cooldownPeriod = 3000; // 3 seconds cooldown

              if (now - lastToastTime > cooldownPeriod) {
                toast.error(`Line ${line} is locked by ${currentLockedLines[line].username}`, {
                  duration: 2000,
                });
                lastToastTimeRef.current[line] = now;
              }

              // Undo the change
              model.undo();
              return;
            }
          }
        }

        const position = editor.getPosition();
        if (!position) return;

        const lineNumber = position.lineNumber;
        const currentLocked = currentLockedLineRef.current;

        // Lock the current line if not already locked by this user
        if (currentLocked !== lineNumber) {
          // Unlock previous line
          if (currentLocked && broadcastLineUnlock) {
            broadcastLineUnlock(currentLocked);
            dispatch(unlockLine({
              fileId: activeFileId,
              lineNumber: currentLocked,
              userId: currentUserId,
            }));
          }

          // Lock new line
          if (broadcastLineLock) {
            broadcastLineLock(lineNumber);
            dispatch(lockLine({
              fileId: activeFileId,
              lineNumber,
              userId: currentUserId,
              username: currentUsername,
            }));
          }

          currentLockedLineRef.current = lineNumber;
        }

        // Reset auto-unlock timer
        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
        }

        // Auto-unlock after 3 seconds of inactivity
        lockTimeoutRef.current = setTimeout(() => {
          const lockedLine = currentLockedLineRef.current;
          if (lockedLine && broadcastLineUnlock) {
            broadcastLineUnlock(lockedLine);
            dispatch(unlockLine({
              fileId: activeFileId,
              lineNumber: lockedLine,
              userId: currentUserId,
            }));
            currentLockedLineRef.current = null;
          }
        }, 3000);
      });
    }
    // Note: Cursor tracking requires edit permissions and collaborative editing enabled

    // ── Conflict-resolution commands ────────────────────────────────────────
    // Reset the decoration collection so we create a fresh one for this mount.
    conflictDecorationsRef.current = null;

    // resolveBlock: replaces the conflict block at blockIndex with the chosen
    // lines, saves to Redux, and debounce-saves to the database.
    const resolveBlock = (blockIndex, mode) => {
      const block = conflictBlocksRef.current[blockIndex];
      if (!block) return;
      const model = editor.getModel();
      if (!model) return;

      let lines;
      if (mode === "current")       lines = block.oursLines;
      else if (mode === "incoming") lines = block.theirsLines;
      else                          lines = [...block.oursLines, ...block.theirsLines]; // both

      editor.executeEdits("conflict-resolution", [{
        range: {
          startLineNumber: block.startLine,
          startColumn: 1,
          endLineNumber: block.endLine,
          endColumn: model.getLineMaxColumn(block.endLine),
        },
        text: lines.join("\n"),
      }]);
      editor.focus();

      const newContent = model.getValue();
      dispatch(updateLocalContent({ nodeId: activeFileId, content: newContent }));
      debouncedSave(activeFileId, newContent);
    };

    // editor.addCommand(0, handler) registers a command without a keybinding
    // and returns a unique command ID usable by the CodeLens provider.
    const cmdCurrent  = editor.addCommand(0, (_, i) => resolveBlock(i, "current"));
    const cmdIncoming = editor.addCommand(0, (_, i) => resolveBlock(i, "incoming"));
    const cmdBoth     = editor.addCommand(0, (_, i) => resolveBlock(i, "both"));
    conflictCommandsRef.current = { current: cmdCurrent, incoming: cmdIncoming, both: cmdBoth };

    // Apply initial decorations for conflict markers already present in the file.
    const initialBlocks = parseConflictBlocks(content);
    conflictBlocksRef.current = initialBlocks;
    applyConflictDecorationsToEditor(editor, initialBlocks, conflictDecorationsRef);
    // ────────────────────────────────────────────────────────────────────────
  };

  // Clean up cursor tracking and line locks on unmount
  useEffect(() => {
    return () => {
      if (cursorDisposableRef.current) {
        cursorDisposableRef.current.dispose();
        cursorDisposableRef.current = null;
      }

      if (contentChangeDisposableRef.current) {
        contentChangeDisposableRef.current.dispose();
        contentChangeDisposableRef.current = null;
      }

      // Clear lock timeout
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }

      // Unlock current line on unmount
      if (currentLockedLineRef.current && broadcastLineUnlock && activeFileId) {
        broadcastLineUnlock(currentLockedLineRef.current);
        dispatch(unlockLine({
          fileId: activeFileId,
          lineNumber: currentLockedLineRef.current,
          userId: currentUserId,
        }));
        currentLockedLineRef.current = null;
      }
    };
  }, [broadcastLineUnlock, activeFileId, currentUserId, dispatch]);

  // Re-parse conflict blocks and refresh decorations whenever the file content
  // changes (includes resolutions made by the user and remote content updates).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !activeFileId) return;
    const blocks = parseConflictBlocks(content);
    conflictBlocksRef.current = blocks;
    applyConflictDecorationsToEditor(editor, blocks, conflictDecorationsRef);
  }, [content, activeFileId]);

  // Get language from file extension
  const getLanguageFromFileName = (fileName) => {
    if (!fileName) return "plaintext";

    const ext = fileName.split(".").pop()?.toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      md: "markdown",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      sh: "shell",
      yml: "yaml",
      yaml: "yaml",
      xml: "xml",
      sql: "sql",
    };

    return languageMap[ext] || "plaintext";
  };

  const language = activeFile ? getLanguageFromFileName(activeFile.name) : "plaintext";

  // Show placeholder when no file is open
  if (!activeFileId || !activeFile) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[#8D8D98]">
        <div className="text-center">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">
            {permissions.canView
              ? "Open a file from the sidebar to start viewing"
              : "Select a file to view its contents"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <Editor
        key={activeFileId} // Force remount when switching files
        height="100%"
        language={language}
        defaultValue={content} // Use defaultValue instead of value for uncontrolled component
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="my-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          formatOnPaste: !isReadOnly,
          formatOnType: !isReadOnly,
          readOnly: isReadOnly,
          domReadOnly: isReadOnly,
          cursorStyle: isReadOnly ? "line-thin" : "line",
          renderValidationDecorations: isReadOnly ? "off" : "on",
          quickSuggestions: !isReadOnly,
          parameterHints: { enabled: !isReadOnly },
          suggestOnTriggerCharacters: !isReadOnly,
          acceptSuggestionOnEnter: isReadOnly ? "off" : "on",
          tabCompletion: isReadOnly ? "off" : "on",
          wordBasedSuggestions: !isReadOnly,
          selectionHighlight: true,
          occurrencesHighlight: true,
          contextmenu: !isReadOnly,
          glyphMargin: true, // Enable glyph margin for lock icons
        }}
      />

      {/* Save indicator */}
      {permissions.canEdit && (
        <div
          className="absolute top-2 right-2 text-xs text-[#8D8D98] bg-[#1A1A20] px-2 py-1 rounded opacity-0 transition-opacity"
          id="save-indicator"
        >
          Saving...
        </div>
      )}

      {/* Remote cursors indicator */}
      {Object.keys(remoteCursors).length > 0 && (
        <div className="absolute bottom-2 left-2 text-xs text-[#8D8D98] bg-[#1A1A20] px-2 py-1 rounded">
          {Object.keys(remoteCursors).length} collaborator(s) editing
          <div className="text-[10px] mt-1">
            {Object.entries(remoteCursors).map(([userId, data]) => (
              <div key={userId} style={{ color: data.color }}>
                {data.username}: Line {data.position?.lineNumber}, Col {data.position?.column}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonacoEditor;
