"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useSelector, useDispatch } from "react-redux";
import { updateLocalContent, updateFileContent } from "@/store/NodesSlice";
import { debounce } from "lodash";

const MonacoEditor = () => {
  const dispatch = useDispatch();
  const monaco = useMonaco();
  const editorRef = useRef(null);

  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const nodes = useSelector((state) => state.nodes.nodes);
  const fileContents = useSelector((state) => state.nodes.fileContents);

  // Get active file details
  const activeFile = nodes.find((n) => n.id === activeFileId);
  const content = activeFileId ? fileContents[activeFileId] || "" : "";

  // Debounced save to database
  const debouncedSave = useCallback(
    debounce((nodeId, content) => {
      dispatch(updateFileContent({ nodeId, content }));
    }, 2000), // Save 2 seconds after user stops typing
    [dispatch]
  );

  // Handle editor content change
  const handleEditorChange = (value) => {
    if (!activeFileId) return;

    // Update local state immediately for responsive UI
    dispatch(updateLocalContent({ nodeId: activeFileId, content: value }));

    // Debounce save to database
    debouncedSave(activeFileId, value);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

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

  // Handle editor mount
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

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
          <p className="text-sm">Open a file from the sidebar to start editing</p>
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
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
      {/* Save indicator */}
      <div className="absolute top-2 right-2 text-xs text-[#8D8D98] bg-[#1A1A20] px-2 py-1 rounded opacity-0 transition-opacity" id="save-indicator">
        Saving...
      </div>
    </div>
  );
};

export default MonacoEditor;
