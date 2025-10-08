"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TerminalPanel({ isOpen, onClose }) {
  const [logs, setLogs] = useState([
    "Terminal started...",
    "Type a command below or run code.",
  ]);
  const [input, setInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!isOpen) return null;

  const handleCommand = (cmd) => {
    if (!cmd.trim()) return;

    // Basic simulation (replace with backend execution later)
    let output;
    switch (cmd.trim().toLowerCase()) {
      case "help":
        output = "Available commands: help, clear, echo, run";
        break;
      case "clear":
        setLogs([]);
        return;
      case "run":
        output = "Running your code...";
        break;
      default:
        output = `Command not found: ${cmd}`;
    }

    setLogs((prev) => [...prev, `>>> ${cmd}`, output]);
    setInput("");
  };

  return (
    <div
      className={cn(
        "absolute w-full z-10 bg-[#0F0F14] border border-[#2A2A32] text-white font-mono transition-all duration-300 rounded-t-md",
        collapsed ? "h-12 bottom-0" : "h-64 bottom-2"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A20] border-b border-[#2A2A32] rounded-t-md">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-[#8A8A95]">TERMINAL</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white"
          >
            {collapsed ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLogs([])}
            className="text-gray-400 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="flex flex-col h-[calc(100%-40px)]">
          <div className="flex-1 overflow-y-auto px-4 py-2 text-sm">
            {logs.map((line, i) => (
              <div key={i} className="leading-6">
                {line}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          {/* Input Bar */}
          <div className="flex items-center border-t border-[#2A2A32] px-3 py-2 bg-[#15151B]">
            <span className="text-[#4B4B55] mr-2">$</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCommand(input);
                }
              }}
              placeholder="Enter command..."
              className="flex-1 bg-transparent text-white outline-none text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
