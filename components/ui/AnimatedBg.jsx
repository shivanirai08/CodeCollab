"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const AnimatedBg = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const generated = Array.from({ length: 50 }).map(() => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        opacity: Math.random() * 0.5 + 0.2,
        duration: Math.random() * 10 + 5,
        targetY: Math.random() * window.innerHeight,
        targetOpacity: Math.random() * 0.5 + 0.2,
      }));
      setParticles(generated);
    }
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-glow opacity-30"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary rounded-full"
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
