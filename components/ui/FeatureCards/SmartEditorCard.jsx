"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Code2 } from "lucide-react";
import { useState, useEffect } from "react";

export function SmartEditorCard() {
  const [activeDemo, setActiveDemo] = useState("syntax");
  const [typedCode, setTypedCode] = useState("");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, char: 0 });
  
  const codeSnippet = `function greet(name) {
  return \`Hello, \${name}!\`;
}`;

  const demos = {
    syntax: {
      name: "Syntax",
      color: "from-purple-500 to-pink-500",
      dotColor: "#c27aff",
    },
    autocomplete: {
      name: "Auto\nComplete",
      color: "from-cyan-500 to-blue-500",
      dotColor: "#4ecdc4",
    },
    errors: {
      name: "Error\nDetect",
      color: "from-red-500 to-orange-500",
      dotColor: "#ff6b6b",
    },
    format: {
      name: "Format",
      color: "from-yellow-500 to-amber-500",
      dotColor: "#ffd93d",
    },
  };

  // Typing animation effect
  useEffect(() => {
    let index = 0;
    setTypedCode("");
    
    const interval = setInterval(() => {
      if (index <= codeSnippet.length) {
        setTypedCode(codeSnippet.slice(0, index));
        setCursorPosition({
          line: codeSnippet.slice(0, index).split('\n').length,
          char: index,
        });
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [activeDemo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="md:col-span-1 rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08]
       to-white/[0.03] border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl h-full"
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-lg bg-white/10 border border-white/20">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Smart Editor</h3>
              <p className="text-xs text-muted-foreground">Intelligent assistance</p>
            </div>
          </div>
        </div>

        {/* Interactive Code Editor Demo */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Mini Code Editor Visual */}
          <div className="relative bg-black/60 rounded-lg border border-white/10 p-3 flex-1 font-mono text-xs overflow-hidden">
            {/* Editor Header */}
            <div className="flex gap-1.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            </div>

            {/* Code Content with Syntax Highlighting */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {activeDemo === "syntax" && (
                  <motion.pre
                    key="syntax"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 h-20"
                  >
                    <code>
                      <span className="text-purple-400">function </span>
                      <span className="text-blue-400">greet</span>
                      <span className="text-white">(</span>
                      <span className="text-orange-400">name</span>
                      <span className="text-white">) {'{'}</span>
                      {'\n  '}
                      <span className="text-purple-400">return </span>
                      <span className="text-green-400">`Hello, ${'{'}name{'}'}!`</span>
                      {'\n}'}<span className="animate-pulse">|</span>
                    </code>
                  </motion.pre>
                )}
                
                {activeDemo === "autocomplete" && (
                  <motion.div
                    key="autocomplete"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-20"
                  >
                    <pre className="text-gray-400">
                      <code>cons<span className="animate-pulse text-white">|</span></code>
                    </pre>
                    <motion.div
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="mt-1 bg-gray-800 rounded border border-cyan-500/50 p-1.5 text-[10px]"
                    >
                      <div className="text-cyan-400 bg-cyan-500/20 px-1 rounded">const</div>
                      <div className="text-gray-300 px-1">console</div>
                      <div className="text-gray-300 px-1">constructor</div>
                    </motion.div>
                  </motion.div>
                )}

                {activeDemo === "errors" && (
                  <motion.div
                    key="errors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-20"
                  >
                    <pre className="text-gray-400">
                      <code>
                        <span className="text-purple-400">const </span>
                        <span className="text-white">x = </span>
                        <span className="text-green-400">"hello"</span>
                        {'\n'}
                        <span className="text-white border-b-2 border-red-500">x = 5</span>
                        <span className="animate-pulse text-white">|</span>
                      </code>
                    </pre>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mt-1 flex items-start gap-1 text-[10px] text-red-400"
                    >
                      <span>⚠</span>
                      <span>Cannot reassign constant</span>
                    </motion.div>
                  </motion.div>
                )}

                {activeDemo === "format" && (
                  <motion.div
                    key="format"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-20"
                  >
                    <motion.pre
                      initial={{ x: -5 }}
                      animate={{ x: 0 }}
                      className="text-gray-400"
                    >
                      <code>
                        <span className="text-purple-400">function </span>
                        <span className="text-blue-400">greet</span>
                        <span className="text-white">() {'{'}</span>
                        {'\n  '}
                        <span className="text-purple-400">return </span>
                        <span className="text-green-400">"Hi"</span>
                        {'\n}'}<span className="animate-pulse text-white">|</span>
                      </code>
                    </motion.pre>
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="absolute top-8 right-2 text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30"
                    >
                      ✓ Formatted
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Feature Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(demos).map(([key, demo]) => (
              <motion.button
                key={key}
                onClick={() => setActiveDemo(key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-2 rounded-lg border transition-all ${
                  activeDemo === key
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <span className="text-xs text-white/80 whitespace-pre-line text-center leading-tight">
                    {demo.name}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
