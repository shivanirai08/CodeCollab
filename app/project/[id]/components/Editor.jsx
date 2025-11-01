"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useSelector, useDispatch } from "react-redux";
import { updateLocalContent, updateFileContent, updateRemoteCursor, clearRemoteCursorsForFile } from "@/store/NodesSlice";
import { debounce } from "lodash";
import { toast } from "sonner";
import useCollaborativeEditing from "@/hooks/useCollaborativeEditing";
import useRemoteCursors from "@/hooks/useRemoteCursors";
import { useParams } from "next/navigation";

const MonacoEditor = () => {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const editorRef = useRef(null);
  const params = useParams();
  const projectId = params.id;
  const [versionCounter, setVersionCounter] = useState(0);

  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const nodes = useSelector((state) => state.nodes.nodes);
  const fileContents = useSelector((state) => state.nodes.fileContents);
  const permissions = useSelector((state) => state.project.permissions);
  const remoteCursors = useSelector((state) => state.nodes.remoteCursors[activeFileId] || {});
  const isReadOnly = !permissions.canEdit;

  // Get active file details
  const activeFile = nodes.find((n) => n.id === activeFileId);
  const content = activeFileId ? fileContents[activeFileId] || "" : "";

  // Collaborative editing callbacks
  const handleRemoteContentChange = useCallback((data) => {
    if (!editorRef.current || !activeFileId) return;

    const editor = editorRef.current;
    const currentPosition = editor.getPosition();

    // Apply remote content change
    dispatch(updateLocalContent({ nodeId: activeFileId, content: data.content }));

    // Try to preserve cursor position after content update
    setTimeout(() => {
      if (currentPosition) {
        editor.setPosition(currentPosition);
      }
    }, 0);
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

  // Get current user info to ensure it's loaded
  const currentUserId = useSelector((state) => state.user.id);
  const currentUsername = useSelector((state) => state.user.userName);

  // Collaborative editing hook
  const collaborativeEditing = useCollaborativeEditing(projectId, activeFileId, {
    onRemoteChange: handleRemoteContentChange,
    onRemoteCursor: handleRemoteCursorChange,
    enabled: permissions.canEdit && !!activeFileId && !!currentUserId,
  });

  const { broadcastContentChange, broadcastCursorPosition, isApplyingRemoteChange } = collaborativeEditing;


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
    if (isApplyingRemoteChange()) return;

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

  // Clear remote cursors when switching files
  useEffect(() => {
    if (activeFileId) {
      // Clear old cursors when switching files
      return () => {
        dispatch(clearRemoteCursorsForFile(activeFileId));
      };
    }
  }, [activeFileId, dispatch]);

  // Render remote cursors using custom hook
  useRemoteCursors(editorRef, monaco, remoteCursors);

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

    console.log('[Editor] Editor mounted, setting up cursor tracking...');

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

    // Set up cursor tracking immediately on mount
    if (permissions.canEdit && broadcastCursorPosition) {

      cursorDisposableRef.current = editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        // console.log('[Editor] Cursor moved to:', position.lineNumber, position.column);

        // Broadcast cursor position
        broadcastCursorPosition({
          lineNumber: position.lineNumber,
          column: position.column,
        });
      });
    } else {
      console.warn('[Editor] Cannot set up cursor tracking:', {
        canEdit: permissions.canEdit,
        hasBroadcast: !!broadcastCursorPosition,
      });
    }
  };

  // Clean up cursor tracking on unmount
  useEffect(() => {
    return () => {
      if (cursorDisposableRef.current) {
        console.log('[Editor] Cleaning up cursor tracking');
        cursorDisposableRef.current.dispose();
        cursorDisposableRef.current = null;
      }
    };
  }, []);

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
        height="100%"
        language={language}
        value={content}
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
