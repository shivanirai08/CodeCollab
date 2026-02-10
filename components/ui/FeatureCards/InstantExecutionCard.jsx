"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, Play, RotateCcw, Check, AlertCircle } from "lucide-react";
import { useState } from "react";

const defaultCode = `function calculateSum(a, b) {
  return a + b;
}

console.log(calculateSum(5, 10));`;

export function InstantExecutionCard() {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [executionTime, setExecutionTime] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");
    setError("");
    setExecutionTime("");
    
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceCode: code,
          language: "javascript",
          stdin: "",
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log("API Response:", result);
      
      // Always set the result, then handle success/error
      if (result.success && result.output) {
        setOutput(result.output);
      } else if (!result.success && result.error) {
        setError(result.error);
      } else if (result.output) {
        setOutput(result.output);
      } else {
        setError(result.error || "Execution failed - No output received");
      }
      
      if (result.time) {
        setExecutionTime(`${(parseFloat(result.time) * 1000).toFixed(0)}ms`);
      }
      
      setRunCount((prev) => prev + 1);
    } catch (err) {
      console.error("Execution Error:", err);
      setError(err.message || "Failed to execute code");
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(defaultCode);
    setOutput("");
    setError("");
    setExecutionTime("");
    setRunCount(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="md:col-span-2 rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl h-full"
    >
      <div className="p-6 md:p-8 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-white/10 border border-white/20">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-white">Instant Execution</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Run code in milliseconds</p>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetCode}
                disabled={!output && !isRunning && code === defaultCode}
                className={`px-3 py-2 border rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  output || isRunning || code !== defaultCode
                    ? "border-white/20 text-white hover:bg-white/5"
                    : "border-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={runCode}
                disabled={isRunning}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  isRunning
                    ? "bg-white/50 opacity-50 cursor-not-allowed"
                    : "bg-white/10 hover:shadow-lg"
                } text-white`}
              >
                {isRunning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Play className="w-4 h-4" />
                    </motion.div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Code
                  </>
                )}
              </motion.button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Execute code instantly and see real-time results
          </p>
        </div>

        {/* Code and Output Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Code Section */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground">JavaScript Input</p>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-black/60 border border-white/10 rounded p-2 text-white font-mono text-xs resize-none focus:outline-none focus:border-cyan-400/50 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              placeholder="Enter JavaScript code here..."
            />
          </div>

          {/* Output Section */}
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-muted-foreground">Console Output</p>
              {output && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-[10px] text-green-400"
                >
                  <Check className="w-2.5 h-2.5" />
                  Success
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-[10px] text-red-400"
                >
                  <AlertCircle className="w-2.5 h-2.5" />
                  Error
                </motion.div>
              )}
            </div>
            <div className="font-mono text-xs flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-2">
              {isRunning ? (
                <motion.div
                  key="running"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-purple-400 flex items-center gap-2"
                >
                  Executing...
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 whitespace-pre-wrap break-words"
                >
                  {error}
                </motion.div>
              ) : output ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-400 whitespace-pre-wrap break-words"
                >
                  {output}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/30 text-xs"
                >
                  Click "Run Code" to execute
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <div className="flex gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{
                  backgroundColor: isRunning ? "#fbbf24" : error ? "#ef4444" : output ? "#10b981" : "#6b7280",
                  scale: isRunning ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.5, repeat: isRunning ? Infinity : 0 }}
                className="w-2 h-2 rounded-full"
              />
              <span>{isRunning ? "Running" : error ? "Error" : output ? "Success" : "Ready"}</span>
            </div>
            <span>Execution time: {executionTime || "—"}</span>
            <span>Runs: {runCount}</span>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground"
          >
          Lightning fast execution
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
