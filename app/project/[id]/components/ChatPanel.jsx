"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Maximize2, Minimize2 } from "lucide-react";


export default function ChatPanel({ isChatOpen, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

  const handleSendMessage = () => {
    const message = inputValue.trim();
    if (message) {
      console.log("sent", message);
      const newMessage = {
        id: Date.now(),
        text: message,
      };
      setMessages((prev) => [...prev, newMessage]);
      setInputValue("");
    }
  };

  return (
    <>
      {/* Mobile Overlay - Only show when expanded */}
      {isChatOpen && isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-[#19191F] transition-all duration-300 shrink-0 rounded-t-3xl lg:rounded-sm",
          // Desktop behavior
          "hidden lg:flex h-full",
          isChatOpen ? "lg:w-72" : "lg:w-0",
          // Mobile behavior - Instagram-style bottom sheet
          "fixed lg:relative z-50 lg:inset-auto bottom-0 left-0 right-0",
          isChatOpen ? "flex" : "hidden lg:flex",
          // Height based on expansion state
          isExpanded ? "h-[90vh]" : "h-[50vh]"
        )}
      >
        {/* Header with drag indicator for mobile */}
        <div className="flex flex-col">
          {/* Mobile drag indicator */}
          <div className="lg:hidden flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#36363E] px-4 py-3">
            <div className="text-sm font-semibold text-[#E1E1E6]">Chats</div>
            <div className="flex items-center gap-2">
              {/* Expand/Collapse button - Mobile only */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              {/* Close button */}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="text-sm text-gray-400 text-center mt-8">
              No messages yet
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm text-[#E1E1E6]">
                {msg.text}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 border-t border-[#36363E] p-3">
          <Input
            type="text"
            placeholder="Type message.."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="shrink-0"
          >
            Send
          </Button>
        </div>
      </div>
    </>
  );
}
