"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, ChevronRight, Check } from "lucide-react";
import { useState, useEffect } from "react";

const projects = [
  { 
    id: 1, 
    name: "Task 1", 
    members: 5, 
    status: "active",
    lastEdited: "Last edited 30/11/2025",
    participants: [
      { id: 1, initials: "R" },
      { id: 2, initials: "C" },
      { id: 3, initials: "A" },
    ]
  },
];

export function ProjectManagementCard() {
  const [mode, setMode] = useState('default'); // 'default', 'creating', 'createSuccess', 'joining', 'joiningTyping', 'joinSuccess'
  const [joinCode, setJoinCode] = useState('');

  const handleCreate = () => {
    setMode('creating');
    setTimeout(() => {
      setMode('createSuccess');
      setTimeout(() => {
        setMode('default');
      }, 2000);
    }, 800);
  };

  const handleJoin = () => {
    setMode('joining');
    setJoinCode('');
    
    // Start typing animation after a brief delay
    setTimeout(() => {
      setMode('joiningTyping');
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Type each digit with delay
      let currentIndex = 0;
      const typingInterval = setInterval(() => {
        if (currentIndex < randomCode.length) {
          setJoinCode(randomCode.substring(0, currentIndex + 1));
          currentIndex++;
          
          // Clear interval after last character
          if (currentIndex === randomCode.length) {
            clearInterval(typingInterval);
            // Show success after typing completes
            setTimeout(() => {
              setMode('joinSuccess');
              setTimeout(() => {
                setMode('default');
                setJoinCode('');
              }, 2000);
            }, 500);
          }
        }
      }, 150);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl h-full"
    >
      <div className="p-5 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-white/10 border border-white/20">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Projects</h3>
              <p className="text-xs text-muted-foreground">Create & Join</p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground my-1">
            Start new projects or join existing ones
          </p>
        </div>

        {/* Compact Layout */}
        <div className="flex flex-col h-full">
          {/* Content Area with Animations */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {/* Default: Project Card */}
              {mode === 'default' && (
                <motion.div
                  key="project-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-black/40 border border-white/10 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{projects[0].name}</p>
                    <p className="text-xs text-muted-foreground">{projects[0].lastEdited}</p>
                  </div>
                  
                  {/* Participants */}
                  <div className="flex items-center gap-2 mx-2">
                    <div className="flex -space-x-3">
                      {projects[0].participants?.slice(0, 2).map((p) => (
                        <div
                          key={p.id}
                          className="flex w-8 h-8 items-center justify-center rounded-full border-2 border-white/10 bg-[#121217] text-xs font-semibold text-white"
                        >
                          {p.initials}
                        </div>
                      ))}
                      {projects[0].participants?.length > 2 && (
                        <div className="flex w-8 h-8 items-center justify-center rounded-full border-2 border-white/10 bg-[#121217] text-xs text-white font-medium">
                          {`+${projects[0].participants.length - 2}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/60 flex-shrink-0" />
                </motion.div>
              )}

              {/* Creating State */}
              {mode === 'creating' && (
                <motion.div
                  key="creating"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center gap-3"
                >
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-sm text-white/80">Creating project...</p>
                </motion.div>
              )}

              {/* Create Success */}
              {mode === 'createSuccess' && (
                <motion.div
                  key="create-success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className="p-3 bg-green-500/20 border border-green-400/50 rounded-lg flex items-center justify-center gap-3"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-green-400" />
                  </motion.div>
                  <p className="text-sm font-semibold text-green-400">Project Created!</p>
                </motion.div>
              )}

              {/* Joining: Input Box */}
              {(mode === 'joining' || mode === 'joiningTyping') && (
                <motion.div
                  key="joining"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-black/40 border border-white/10 rounded-lg flex items-center justify-between gap-3"
                >
                  <p className="text-xs text-white/80 font-medium whitespace-nowrap">Enter Code:</p>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={joinCode}
                      readOnly
                      placeholder="Write 6 digit code"
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/20 rounded-lg text-center text-sm font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 tracking-wider"
                    />
                    {mode === 'joiningTyping' && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-sm"
                      >
                        |
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Join Success */}
              {mode === 'joinSuccess' && (
                <motion.div
                  key="join-success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, type: "spring" }}
                  className="p-3 bg-green-500/20 border border-green-400/50 rounded-lg flex items-center justify-center gap-3"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-green-400" />
                  </motion.div>
                  <p className="text-sm font-semibold text-green-400">Joined Successfully!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Buttons Container */}
          <div className="flex flex-col gap-2">
            {/* Create Project Button */}
            <div>
              <motion.button
                whileHover={{ scale: mode === 'default' ? 1.02 : 1 }}
                whileTap={{ scale: mode === 'default' ? 0.98 : 1 }}
                onClick={handleCreate}
                disabled={mode !== 'default'}
                className={`w-full py-2 border border-white/20 bg-white rounded-lg text-xs text-black hover:text-white cursor-pointer hover:bg-white/5 transition-all font-semibold ${
                  mode !== 'default' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Create New Project
              </motion.button>
            </div>
            {/* Join Project Button */}
            <div>
              <motion.button
                whileHover={{ scale: mode === 'default' ? 1.02 : 1 }}
                whileTap={{ scale: mode === 'default' ? 0.98 : 1 }}
                onClick={handleJoin}
                disabled={mode !== 'default'}
                className={`w-full py-2 border border-white/20 rounded-lg cursor-pointer text-xs text-white hover:bg-white/5 transition-all font-semibold ${
                  mode !== 'default' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Join Project
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
