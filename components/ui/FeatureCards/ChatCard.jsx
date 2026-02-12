"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";

const initialMessages = [
  { id: 1, user: "Alex", text: "Fixed the bug!", color: "#c27aff", isUser: false },
  { id: 2, user: "Sarah", text: "Great work! 🎉", color: "#4ecdc4", isUser: false },
  { id: 3, user: "You", text: "Awesome team!", color: "#00d4ff", isUser: true },
];

const typingResponses = [
  { user: "Alex", text: "Thanks for the help!", color: "#c27aff" },
  { user: "Sarah", text: "Ready for the next task", color: "#4ecdc4" },
];

export function ChatCard() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        user: "You",
        text: message,
        color: "#00d4ff",
        isUser: true,
      };
      setMessages([...messages, newMessage]);
      setMessage("");

      // Simulate typing response
      const response = typingResponses[Math.floor(Math.random() * typingResponses.length)];
      setIsTyping(true);
      setTypingUser(response.user);

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            user: response.user,
            text: response.text,
            color: response.color,
            isUser: false,
          },
        ]);
      }, 1500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl h-full"
    >
      <div className="p-6 md:p-8 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/10 border border-white/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white">Team Chat</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Communicate instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-400"
              />
              <span className="text-xs text-muted-foreground">Online</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Stay connected with your team through real-time messaging
          </p>
        </div>

        {/* Messages */}
        <div className="h-120 space-y-3 mb-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.isUser ? 20 : -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    msg.isUser
                      ? "bg-blue-500/30 border border-blue-400/50 text-white"
                      : "bg-white/10 border border-white/20 text-white/80"
                  }`}
                >
                  {!msg.isUser && (
                    <p className="text-xs font-semibold mb-1" style={{ color: msg.color }}>
                      {msg.user}
                    </p>
                  )}
                  <p className="text-xs md:text-sm">{msg.text}</p>
                </motion.div>
              </motion.div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-white/10 border border-white/20">
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">{typingUser}</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                        className="w-1.5 h-1.5 rounded-full bg-white/50"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-white/50 focus:border-cyan-400/50 focus:outline-none transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!message.trim()}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
              message.trim()
                ? "bg-cyan-500/30 text-cyan-400 hover:bg-cyan-500/40"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Message Count */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          {messages.length} messages
        </p>
      </div>
    </motion.div>
  );
}
