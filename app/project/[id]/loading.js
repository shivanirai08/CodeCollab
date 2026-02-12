"use client";

import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Logo with glow effect */}
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl animate-pulse scale-150" />
          
          {/* Logo */}
          <div className="relative animate-bounce-slow">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-full" />
            <Image
              src="/logo.svg"
              alt="Loading"
              width={32}
              height={32}
              className="drop-shadow-2xl relative z-10"
              priority
            />
          </div>
        </div>

        {/* Loading text with dots */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-semibold text-lg tracking-wide">
              Loading
            </span>
            <div className="flex gap-1 items-end h-6">
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
