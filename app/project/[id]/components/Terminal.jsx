"use client";

import { useState, useRef, useEffect } from "react";
import { X, Play, Trash2, Loader2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { setFileProblems } from "@/store/NodesSlice";

export default function TerminalPanel({ isOpen, onClose, initialTab = "output" }) {
  const dispatch = useDispatch();
  const [output, setOutput] = useState([]);
  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [problems, setProblems] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFileId, setCurrentFileId] = useState(null);
  const outputRef = useRef(null);
  const socketRef = useRef(null);
  const analyzeTimeoutRef = useRef(null);

  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const nodes = useSelector((state) => state.nodes.nodes);
  const fileContents = useSelector((state) => state.nodes.fileContents);

  const activeFile = nodes.find((n) => n.id === activeFileId);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Native WebSocket connection for code analysis
  useEffect(() => {
    const retryCountRef = { current: 0 };
    const maxRetries = 5;
    let reconnectTimeoutId = null;

    const connectWebSocket = async () => {
      try {
        // Get Supabase session token
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          return;
        }

        const token = session.access_token;
        const WS_URL = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}?token=${token}`;

        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          socketRef.current = ws;
          retryCountRef.current = 0; // Reset retry counter on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "analysis_result") {
              const receivedProblems = data.errors || [];
              setProblems(receivedProblems);
              setIsAnalyzing(false);
            } else if (data.type === "error") {
              setIsAnalyzing(false);
            }
          } catch (err) {
            // Silently handle parsing errors
          }
        };

        ws.onerror = () => {
          // Silently handle connection errors
        };

        ws.onclose = () => {
          socketRef.current = null;

          // Auto-reconnect with max retry limit
          if (retryCountRef.current < maxRetries) {
            reconnectTimeoutId = setTimeout(() => {
              if (socketRef.current === null) {
                retryCountRef.current++;
                connectWebSocket();
              }
            }, 3000);
          }
        };

        socketRef.current = ws;
      } catch (err) {
        // Silently handle connection setup errors
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, []);

  // Update problems in Redux when they change
  useEffect(() => {
    if (currentFileId && problems.length >= 0) {
      dispatch(setFileProblems({
        fileId: currentFileId,
        problems: problems
      }));
    }
  }, [problems, currentFileId, dispatch]);

  // Auto-analyze code when it changes
  useEffect(() => {
    if (!activeFileId || !activeFile) return;

    const sourceCode = fileContents[activeFileId];
    if (!sourceCode) return;

    // Debounce analysis by 1 second
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }

    analyzeTimeoutRef.current = setTimeout(() => {
      setCurrentFileId(activeFileId);
      analyzeCode(sourceCode);
    }, 1000);

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, [fileContents, activeFileId, activeFile]);

  const analyzeCode = (code) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!activeFile?.name) {
      return;
    }

    const language = getLanguageFromFileName(activeFile.name);
    setIsAnalyzing(true);

    try {
      const message = JSON.stringify({
        action: "analyze",
        language: language,
        code: code,
      });

      socketRef.current.send(message);
    } catch (error) {
      setIsAnalyzing(false);
    }
  };

  const getLanguageFromFileName = (fileName) => {
    if (!fileName) return "javascript";

    const ext = fileName.split(".").pop()?.toLowerCase();
    // Language mapping according to CodeCollab API documentation
    // Supported: typescript, javascript, python, dart, go, cpp
    const languageMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      dart: "dart",
      go: "go",
      cpp: "cpp",
      cc: "cpp",
      cxx: "cpp",
      c: "cpp",
      java: "java",
      cs: "csharp",
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

  const errorCount = problems.filter(p => p.severity === "error").length;
  const warningCount = problems.filter(p => p.severity === "warning").length;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-80 bg-[#0F0F14] border border-[#36363E]/50 z-10 flex flex-col rounded-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#36363E]">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("problems")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5",
                activeTab === "problems"
                  ? "bg-[#1A1A20] text-white"
                  : "text-[#8D8D98] hover:text-white hover:bg-[#1A1A20]/50"
              )}
            >
              Problems
              {problems.length > 0 && (
                <span className="flex items-center gap-1">
                  {errorCount > 0 && (
                    <span className="text-red-400">{errorCount}</span>
                  )}
                  {warningCount > 0 && (
                    <span className="text-yellow-400">{warningCount}</span>
                  )}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                activeTab === "output"
                  ? "bg-[#1A1A20] text-white"
                  : "text-[#8D8D98] hover:text-white hover:bg-[#1A1A20]/50"
              )}
            >
              Output
            </button>
          </div>
          {activeFile && (
            <span className="text-xs text-[#8D8D98]">{activeFile.name}</span>
          )}
          {isAnalyzing && activeTab === "problems" && (
            <Loader2 className="h-3 w-3 animate-spin text-[#8D8D98]" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "output" && (
            <>
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
            </>
          )}
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

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "output" ? (
          <>
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
          </>
        ) : (
          /* Problems area */
          <div className="flex-1 overflow-y-auto">
            {problems.length === 0 ? (
              <div className="text-[#8D8D98] text-center py-8">
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing code...</span>
                  </div>
                ) : (
                  "No problems found in the current file."
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#36363E]">
                {problems.map((problem, index) => {
                  const Icon =
                    problem.severity === "error" ? AlertCircle :
                    problem.severity === "warning" ? AlertTriangle :
                    Info;

                  const iconColor =
                    problem.severity === "error" ? "text-red-400" :
                    problem.severity === "warning" ? "text-yellow-400" :
                    "text-blue-400";

                  return (
                    <div
                      key={index}
                      className="p-3 hover:bg-[#1A1A20] cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColor)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-[#8D8D98] mb-1">
                            <span>Line {problem.line}</span>
                            {problem.column !== undefined && (
                              <span>Column {problem.column}</span>
                            )}
                          </div>
                          <p className="text-sm text-white">{problem.message}</p>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded uppercase font-medium flex-shrink-0",
                          problem.severity === "error"
                            ? "bg-red-400/10 text-red-400"
                            : problem.severity === "warning"
                            ? "bg-yellow-400/10 text-yellow-400"
                            : "bg-blue-400/10 text-blue-400"
                        )}>
                          {problem.severity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
