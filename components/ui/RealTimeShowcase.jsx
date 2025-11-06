"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { MousePointer2, Zap, ShieldCheck } from "lucide-react";

export const RealTimeShowcase = () => {
  const [typingIndex, setTypingIndex] = useState(0);
  const [cursorPositions, setCursorPositions] = useState([
    { id: 1, x: 20, y: 30, name: "Alice", color: "#3b82f6" },
    { id: 2, x: 60, y: 50, name: "Bob", color: "#10b981" },
    { id: 3, x: 40, y: 70, name: "Charlie", color: "#f59e0b" },
  ]);

  const codeLines = [
    'function mergeSort(arr) {',
    '  if (arr.length <= 1) return arr;',
    '  const mid = Math.floor(arr.length / 2);',
    '  const left = mergeSort(arr.slice(0, mid));',
    '  const right = mergeSort(arr.slice(mid));',
    '  return merge(left, right);',
    '}',
  ];

  // Animate cursors moving around
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorPositions((prev) =>
        prev.map((cursor) => ({
          ...cursor,
          x: Math.max(10, Math.min(90, cursor.x + (Math.random() - 0.5) * 15)),
          y: Math.max(20, Math.min(80, cursor.y + (Math.random() - 0.5) * 10)),
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Typing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingIndex((prev) => (prev + 1) % codeLines.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16">
      <div className="text-center mb-8 md:mb-12">
        <motion.h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 text-white px-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Real-Time Collaboration in Action
        </motion.h2>
        <motion.p
          className="text-muted-foreground text-sm sm:text-base md:text-lg w-full px-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
        >
          Watch as multiple developers code together seamlessly, just like magic
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Card className="relative overflow-hidden bg-white/5 border-white/10 shadow-2xl p-4 sm:p-6 md:p-8">
          {/* Code editor simulation */}
          <div className="relative bg-white/5 rounded-lg p-4 sm:p-6 min-h-[240px] sm:min-h-[280px] md:min-h-[320px] font-mono text-xs sm:text-sm">
            {/* Line numbers */}
            <div className="absolute left-0 top-0 p-6 text-muted-foreground/40 select-none">
              {codeLines.map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code content */}
            <div className="pl-8">
              {codeLines.map((line, i) => (
                <div key={i} className="leading-6 text-gray-300">
                  {i === typingIndex ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-blue-400"
                    >
                      {line}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-2 h-5 bg-blue-400 ml-1"
                      />
                    </motion.span>
                  ) : (
                    <span className={i < typingIndex ? "text-green-400" : ""}>
                      {line}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Animated cursors */}
            <AnimatePresence>
              {cursorPositions.map((cursor) => (
                <motion.div
                  key={cursor.id}
                  className="absolute pointer-events-none"
                  initial={false}
                  animate={{
                    left: `${cursor.x}%`,
                    top: `${cursor.y}%`,
                  }}
                  transition={{
                    duration: 1.5,
                    ease: "easeInOut",
                  }}
                >
                  {/* Cursor pointer */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="drop-shadow-lg"
                  >
                    <path
                      d="M3 3L13 8L8 9L6 14L3 3Z"
                      fill={cursor.color}
                      stroke="white"
                      strokeWidth="1"
                    />
                  </svg>
                  {/* Cursor label */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute left-5 -top-1 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
                    style={{ backgroundColor: cursor.color }}
                  >
                    {cursor.name}
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Active users indicator */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex -space-x-2">
              {cursorPositions.map((cursor) => (
                <div
                  key={cursor.id}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: cursor.color }}
                >
                  {cursor.name[0]}
                </div>
              ))}
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {cursorPositions.length} developers coding together
            </span>
            <div className="sm:ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs sm:text-sm text-green-500 font-medium">Live</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Feature highlights below showcase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
        {[
          {
            title: "Live Cursors",
            desc: "See where your teammates are working in real-time",
            icon: MousePointer2,
          },
          {
            title: "Instant Updates",
            desc: "Changes appear immediately for everyone",
            icon: Zap,
          },
          {
            title: "Conflict-Free",
            desc: "Smart merging prevents editing conflicts",
            icon: ShieldCheck,
          },
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-4 md:p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 h-full">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <div className="p-2.5 md:p-3 rounded-lg md:rounded-xl bg-white/10 border border-white/20">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h3 className="font-semibold text-base md:text-lg text-white">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
};
