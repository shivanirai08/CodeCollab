"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const AnimatedBg = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Reduced from 50 to 20 particles for better performance
      const generated = Array.from({ length: 20 }).map(() => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        opacity: Math.random() * 0.4 + 0.1,
        duration: Math.random() * 10 + 8,
        targetY: Math.random() * window.innerHeight,
        targetOpacity: Math.random() * 0.4 + 0.1,
      }));
      setParticles(generated);
    }
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">

      {/* Floating particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary rounded-full blur-[0.5px]"
          initial={{
            x: p.x,
            y: p.y,
            opacity: p.opacity,
          }}
          animate={{
            y: [p.y, p.targetY],
            opacity: [p.opacity, 0, p.targetOpacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};
