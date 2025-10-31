"use client";

import { useState, useRef, useEffect } from "react";
import { X, Play, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { toast } from "sonner";

export default function TerminalPanel({ isOpen, onClose }) {
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const outputRef = useRef(null);

  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const nodes = useSelector((state) => state.nodes.nodes);
  const fileContents = useSelector((state) => state.nodes.fileContents);

  const activeFile = nodes.find((n) => n.id === activeFileId);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const getLanguageFromFileName = (fileName) => {
    if (!fileName) return "javascript";

    const ext = fileName.split(".").pop()?.toLowerCase();
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      go: "go",
      rs: "rust",
      php: "php",
      rb: "ruby",
      kt: "kotlin",
      swift: "swift",
      sql: "sql",
      sh: "bash",
      r: "r",
    };

    return languageMap[ext] || "javascript";
  };

  const handleRunCode = async () => {
    if (!activeFileId || !activeFile) {
      toast.error("No file selected");
      return;
    }

    const sourceCode = fileContents[activeFileId];
    if (!sourceCode || sourceCode.trim() === "") {
      toast.error("No code to execute");
      return;
    }

    const language = getLanguageFromFileName(activeFile.name);
    setIsExecuting(true);

    // Add execution start message
    setOutput((prev) => [
      ...prev,
      {
        type: "info",
        content: `Executing ${activeFile.name}...`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceCode,
          language,
          stdin: input,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOutput((prev) => [
          ...prev,
          {
            type: "success",
            content: result.output,
            timestamp: new Date().toLocaleTimeString(),
            time: result.time,
            memory: result.memory,
          },
        ]);
        toast.success("Code executed successfully");
      } else {
        setOutput((prev) => [
          ...prev,
          {
            type: "error",
            content: result.error || result.output,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        toast.error("Execution failed");
      }
    } catch (error) {
      setOutput((prev) => [
        ...prev,
        {
          type: "error",
          content: `Error: ${error.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      toast.error("Failed to execute code");
    } finally {
      setIsExecuting(false);
      setInput("");
    }
  };

  const handleClear = () => {
    setOutput([]);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-80 bg-[#0F0F14] border border-[#36363E]/50 z-10 flex flex-col rounded-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#36363E]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Terminal</span>
          {activeFile && (
            <span className="text-xs text-[#8D8D98]">{activeFile.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunCode}
            disabled={isExecuting || !activeFileId}
            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-[#1A1A20]"
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-1 text-xs">Run</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-[#C9C9D6] hover:text-white hover:bg-[#1A1A20]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-2 text-[#C9C9D6] hover:text-white hover:bg-[#1A1A20]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2"
      >
        {output.length === 0 ? (
          <div className="text-[#8D8D98] text-center py-8">
            Terminal output will appear here. Click "Run" to execute your code.
          </div>
        ) : (
          output.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#8D8D98]">
                <span>{item.timestamp}</span>
                {item.time && <span>• Time: {item.time}s</span>}
                {item.memory && <span>• Memory: {item.memory}KB</span>}
              </div>
              <pre
                className={`whitespace-pre-wrap ${
                  item.type === "error"
                    ? "text-red-400"
                    : item.type === "info"
                    ? "text-blue-400"
                    : "text-green-400"
                }`}
              >
                {item.content}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[#36363E] p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8D8D98]">Input (stdin):</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isExecuting) {
                handleRunCode();
              }
            }}
            placeholder="Enter input for your program (optional)"
            className="flex-1 bg-white/4 text-white text-sm px-3 py-1.5 rounded focus:outline-none focus:border-[#4A4A52]"
            disabled={isExecuting}
          />
        </div>
      </div>
    </div>
  );
}
