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

  const handleRemoteCursorChange = useCallback((data) => {
    if (!activeFileId) return;

    console.log('[Editor] Remote cursor update:', data.username, data.position);

    dispatch(updateRemoteCursor({
      fileId: activeFileId,
      userId: data.userId,
      username: data.username,
      position: data.position,
      avatar_url: data.avatar_url,
    }));
  }, [dispatch, activeFileId]);

  const handleLineLock = useCallback((data) => {
    if (!activeFileId) return;

    console.log('[Editor] Remote line lock:', data.username, data.lineNumber);

    dispatch(lockLine({
      fileId: activeFileId,
      lineNumber: data.lineNumber,
      userId: data.userId,
      username: data.username,
    }));
  }, [dispatch, activeFileId]);

  const handleLineUnlock = useCallback((data) => {
    if (!activeFileId) return;

    console.log('[Editor] Remote line unlock:', data.lineNumber);

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

  const handleUserLeaveFile = useCallback((data) => {
    if (!activeFileId) return;

    console.log('[Editor] User left file:', data.username, data.userId);

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
      dispatch(updateFileContent({ nodeId, content }));
    }, 2000),
    [dispatch, permissions.canEdit]
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

  // Setup Monaco theme
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("my-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#18181e",
        },
      });
      monaco.editor.setTheme("my-dark");
    }
  }, [monaco]);

  // Store cursor tracking disposable
  const cursorDisposableRef = useRef(null);

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    // Initialize refs
    isLocalChangeRef.current = true;
    currentContentRef.current = editor.getValue();

    console.log('[Editor] Editor mounted, setting up cursor tracking and line locking...');

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

        // Skip lock check if we're applying a remote change
        if (isApplyingRemoteChangeCheckRef.current && isApplyingRemoteChangeCheckRef.current()) {
          console.log('[Editor] Skipping lock check - applying remote change');
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
    } else {
      console.warn('[Editor] Cannot set up cursor tracking:', {
        canEdit: permissions.canEdit,
        hasBroadcast: !!broadcastCursorPosition,
      });
    }
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
