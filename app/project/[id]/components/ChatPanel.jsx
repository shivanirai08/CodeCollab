"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X} from "lucide-react";


export default function ChatPanel({isChatOpen, setIsChatOpen}) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-[#19191F] transition-all duration-300 shrink-0 rounded-sm",
        isChatOpen ? "w-72" : "w-0"
      )}
    >
      <div className="flex items-center justify-between border-b border-[#36363E] px-4 py-3">
        <div className="text-sm font-semibold text-[#E1E1E6]">Chats</div>
        <Button variant="ghost" onClick={() => setIsChatOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm text-[#E1E1E6]">
            {msg.text}
          </div>
        ))}
      </div>

      <div className="flex border-t border-[#36363E] p-3">
        <Input
          type="text"
          placeholder="Type message.."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const message = inputValue;
              if (message) {
                setIsSending(true);
                console.log(message);
                setTimeout(() => {
                  setIsSending(false);
                }, 1000);
                const newMessage = {
                  id: Date.now(),
                  text: message,
                };
                setMessages((prev) => [...prev, newMessage]);
                setInputValue("");
              }
            }
          }}
        />
        <Button
          className="ml-2"
          onClick={(e) => {
            e.preventDefault();
            const message = document.querySelector("input").value;
            if (message) {
              setIsSending(true);
              console.log("sent", message);
              setTimeout(() => {
                setIsSending(false);
              }, 1000);
              const newMessage = {
                id: Date.now(),
                text: message,
              };
              setMessages((prev) => [...prev, newMessage]);
              document.querySelector("input").value = "";
            }
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
