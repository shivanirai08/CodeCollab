"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { DiffEditor, useMonaco } from "@monaco-editor/react";

const DIFF_STYLE_ID = "git-inline-diff-styles";

function getLanguageFromFileName(fileName) {
  if (!fileName) return "plaintext";

  const ext = fileName.split(".").pop()?.toLowerCase();
  const languageMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    md: "markdown",
    py: "python",
    java: "java",
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
}

function ensureDiffEditorStyles() {
  if (typeof document === "undefined" || document.getElementById(DIFF_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = DIFF_STYLE_ID;
  style.textContent = `
    .monaco-diff-editor .arrow-revert-change {
      opacity: 1 !important;
      cursor: pointer;
    }

    .monaco-diff-editor .gutterItem,
    .monaco-diff-editor .gutterItemShow {
      opacity: 1 !important;
    }

    .monaco-diff-editor .codicon {
      color: #c9d1d9 !important;
    }

    .monaco-diff-editor .codicon:hover {
      color: #ffffff !important;
    }

    .monaco-diff-editor .codelens-decoration,
    .monaco-diff-editor .codicon-code-lens {
      color: #8b949e !important;
    }

    .monaco-diff-editor .codelens-decoration a,
    .monaco-diff-editor .codicon-code-lens a {
      color: #58a6ff !important;
      text-decoration: none;
    }

    .monaco-diff-editor .codelens-decoration a:hover,
    .monaco-diff-editor .codicon-code-lens a:hover {
      color: #79c0ff !important;
      text-decoration: underline;
    }

    .monaco-diff-editor .line-delete,
    .monaco-diff-editor .char-delete {
      background-color: rgba(248, 81, 73, 0.22) !important;
    }

    .monaco-diff-editor .line-insert,
    .monaco-diff-editor .char-insert {
      background-color: rgba(63, 185, 80, 0.22) !important;
    }

    .monaco-diff-editor .diagonal-fill {
      background-image: linear-gradient(
        -45deg,
        rgba(139, 148, 158, 0.14) 12.5%,
        transparent 12.5%,
        transparent 50%,
        rgba(139, 148, 158, 0.14) 50%,
        rgba(139, 148, 158, 0.14) 62.5%,
        transparent 62.5%,
        transparent 100%
      ) !important;
      background-size: 8px 8px !important;
    }
  `;
  document.head.appendChild(style);
}

export default function GitDiffEditor({
  filePath,
  original,
  modified,
  readOnly = false,
  onModifiedChange,
}) {
  const monaco = useMonaco();
  const onModifiedChangeRef = useRef(onModifiedChange);
  const [editorModified, setEditorModified] = useState(modified);
  const fileName = filePath?.split("/").pop() || "";
  const language = getLanguageFromFileName(fileName);

  useEffect(() => {
    onModifiedChangeRef.current = onModifiedChange;
  }, [onModifiedChange]);

  useEffect(() => {
    setEditorModified(modified);
  }, [filePath, original]);

  useEffect(() => {
    ensureDiffEditorStyles();
  }, []);

  useEffect(() => {
    if (!monaco) return;

    monaco.editor.defineTheme("git-inline-diff", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#18181e",
        "editorGutter.background": "#14141a",
        "editorLineNumber.foreground": "#6e7681",
        "editorLineNumber.activeForeground": "#e6edf3",
        "editorCodeLens.foreground": "#8b949e",
        "diffEditor.insertedTextBackground": "#3fb95033",
        "diffEditor.removedTextBackground": "#f8514933",
        "diffEditor.insertedLineBackground": "#3fb95028",
        "diffEditor.removedLineBackground": "#f8514928",
        "diffEditor.diagonalFill": "#2a2a30",
        "diffEditor.unchangedRegionBackground": "#18181e",
        "diffEditor.unchangedRegionForeground": "#8b949e",
        "diffEditor.unchangedCodeBackground": "#1c1c22",
      },
    });
    monaco.editor.setTheme("git-inline-diff");
  }, [monaco]);

  const handleMount = useCallback((diffEditor) => {
    const modifiedEditor = diffEditor.getModifiedEditor();
    const originalEditor = diffEditor.getOriginalEditor();

    originalEditor.updateOptions({
      readOnly: true,
      glyphMargin: true,
      lineNumbers: "on",
      renderValidationDecorations: "off",
    });

    modifiedEditor.updateOptions({
      readOnly,
      glyphMargin: true,
      lineNumbers: "on",
      folding: true,
    });

    modifiedEditor.onDidChangeModelContent(() => {
      const value = modifiedEditor.getValue();
      onModifiedChangeRef.current?.(value);
    });

    diffEditor.updateOptions({
      renderMarginRevertIcon: true,
      renderGutterMenu: true,
      diffCodeLens: true,
      renderIndicators: true,
    });
  }, [readOnly]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#24242A] bg-[#121218] px-4 py-2">
        <p className="truncate text-sm font-medium text-white">{filePath}</p>
        <p className="text-xs text-[#8B909A]">
          Inline diff vs HEAD — use gutter arrows or code lens to revert a hunk
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DiffEditor
          key={filePath}
          height="100%"
          language={language}
          original={original}
          modified={editorModified}
          theme="git-inline-diff"
          onMount={handleMount}
          options={{
            renderSideBySide: false,
            readOnly,
            originalEditable: false,
            renderOverviewRuler: true,
            renderMarginRevertIcon: true,
            renderGutterMenu: true,
            diffCodeLens: true,
            renderIndicators: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 22,
            lineNumbers: "on",
            glyphMargin: true,
            wordWrap: "off",
            diffWordWrap: "off",
            ignoreTrimWhitespace: false,
            folding: true,
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}
