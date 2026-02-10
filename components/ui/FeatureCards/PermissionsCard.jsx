"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useState } from "react";

export function PermissionsCard() {
  const [isPrivate, setIsPrivate] = useState(true);
  const [permission, setPermission] = useState("view");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 hover:border-white/20 transition-all backdrop-blur-xl h-full"
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/10 border border-white/20">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Permissions</h3>
            <p className="text-xs text-muted-foreground">Control access</p>
          </div>
        </div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3">Manage who can view or edit your projects with granular controls</p>

        {/* Visibility Toggle */}
        <div className="mb-3">
          <p className="text-xs text-white/60 mb-2">Visibility</p>
          <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/10 rounded-lg">
            <span className={`text-sm flex-1 ${!isPrivate ? "text-white font-medium" : "text-white/50"}`}>
              Public
            </span>
            <motion.button
              onClick={() => setIsPrivate((prev) => !prev)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPrivate ? "bg-purple-500" : "bg-blue-500"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                animate={{ x: isPrivate ? 22 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>
            <span className={`text-sm flex-1 text-right ${isPrivate ? "text-white font-medium" : "text-white/50"}`}>
              Private
            </span>
          </div>
        </div>

        {/* Permission Dropdown */}
        <div>
          <p className="text-xs text-white/60 mb-2">Default Permission</p>
          <div className="relative">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm appearance-none cursor-pointer hover:border-white/20 focus:border-purple-400/50 focus:outline-none transition-all"
            >
              <option value="view" className="bg-black text-white">Can View</option>
              <option value="edit" className="bg-black text-white">Can Edit</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
