"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useState, useEffect } from "react";

const teamMembers = [
  { name: "Sarah", color: "#4ecdc4", isTyping: true },
  { name: "Alex", color: "#c27aff", isTyping: false },
  { name: "Mike", color: "#ffa500", isTyping: false },
];

export function RealtimeCollabCard() {
  const [typedCode, setTypedCode] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const fullCode = `function calculateSum(a, b) {\n  return a + b;\n}`;
  
  const [cursors, setCursors] = useState([
    { x: 20, y: 20 }, // Sarah - typing position
    { x: 180, y: 10 }, // Alex
    { x: 280, y: 40 }, // Mike
  ]);

  // Typing animation
  useEffect(() => {
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex <= fullCode.length) {
        setTypedCode(fullCode.slice(0, charIndex));
        charIndex++;
      } else {
        // Reset and start over
        setTimeout(() => {
          charIndex = 0;
          setTypedCode("");
        }, 2000);
      }
    }, 80);

    return () => clearInterval(typingInterval);
  }, []);

  // Blinking cursor
  useEffect(() => {
    const cursorBlink = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);
    return () => clearInterval(cursorBlink);
  }, []);

  // Move non-typing cursors
  useEffect(() => {
    const moveCursors = setInterval(() => {
      setCursors((prev) => [
        prev[0], // Sarah stays at typing position
        { x: Math.random() * 300 + 50, y: Math.random() * 60}, // Alex moves
        { x: Math.random() * 300 + 50, y: Math.random() * 90}, // Mike moves
      ]);
    }, 3000);

    return () => clearInterval(moveCursors);
  }, []);

  // Calculate Sarah's cursor position based on typed text
  const getSarahCursorPosition = () => {
    const lines = typedCode.split('\n');
    const lastLineIndex = lines.length - 1;
    const lastLine = lines[lastLineIndex];
    const charWidth = 7.2; // approximate width per character
    const lineHeight = 20; // line height
    
    return {
      x: 20 + (lastLine.length * charWidth),
      y: 5 + (lastLineIndex * lineHeight),
    };
  };

  const sarahPos = getSarahCursorPosition();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="md:col-span-2 rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl h-full"
    >
      <div className="p-6 md:p-8 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-white/10 border border-white/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-white">Real-time Collaboration</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Code together, see changes instantly</p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Watch your teammates code in real-time with live cursors and instant synchronization
          </p>
        </div>

        {/* Code Editor */}
        <div className="flex-1 bg-black/60 border border-white/10 rounded-lg p-4 mb-4 font-mono text-sm relative overflow-hidden min-h-[200px]">
          {/* Editor Header */}
          <div className="flex gap-1.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          </div>

          {/* Code Content */}
          <div className="relative z-10">
            <pre className="text-green-400 leading-5">
              <code>
                {typedCode}
                {showCursor && <span className="text-white">|</span>}
              </code>
            </pre>
          </div>

          {/* Sarah's Cursor (typing) */}
          <motion.div
            animate={{
              x: sarahPos.x,
              y: sarahPos.y + 30,
            }}
            transition={{ duration: 0.1 }}
            className="absolute pointer-events-none z-20"
          >
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 16 16" fill={teamMembers[0].color}>
                <path d="M0 0L16 6L6 8L4 16L0 0Z" />
              </svg>
              <motion.span
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[10px] px-2 py-0.5 rounded text-white whitespace-nowrap"
                style={{ backgroundColor: teamMembers[0].color }}
              >
                {teamMembers[0].name} typing...
              </motion.span>
            </div>
          </motion.div>

          {/* Alex's Cursor (moving) */}
          <motion.div
            animate={{
              x: cursors[1].x,
              y: cursors[1].y + 10,
            }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute pointer-events-none z-20"
          >
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 16 16" fill={teamMembers[1].color}>
                <path d="M0 0L16 6L6 8L4 16L0 0Z" />
              </svg>
              <span
                className="text-[10px] px-2 py-0.5 rounded text-white whitespace-nowrap"
                style={{ backgroundColor: teamMembers[1].color }}
              >
                {teamMembers[1].name}
              </span>
            </div>
          </motion.div>

          {/* Mike's Cursor (moving) */}
          <motion.div
            animate={{
              x: cursors[2].x,
              y: cursors[2].y + 10,
            }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="absolute pointer-events-none z-20"
          >
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 16 16" fill={teamMembers[2].color}>
                <path d="M0 0L16 6L6 8L4 16L0 0Z" />
              </svg>
              <span
                className="text-[10px] px-2 py-0.5 rounded text-white whitespace-nowrap"
                style={{ backgroundColor: teamMembers[2].color }}
              >
                {teamMembers[2].name}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          {["Live Updates", "Multi-cursor", "Sync Changes"].map((tag) => (
            <motion.div
              key={tag}
              whileHover={{ scale: 1.05 }}
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-all"
            >
              <p className="text-xs text-white">{tag}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
