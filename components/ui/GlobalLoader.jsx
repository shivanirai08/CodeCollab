"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import Image from "next/image";
import { cn } from "@/lib/utils";

function GlobalLoaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // Get loading state from Redux
  const isApiLoading = useSelector((state) => state.loading.isLoading);
  const loadingMessage = useSelector((state) => state.loading.loadingMessage);

  useEffect(() => {
    // Show loader on route change
    setIsRouteLoading(true);
    const timeout = setTimeout(() => setIsRouteLoading(false), 500);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Show loader if either route is changing or API is loading
  const isLoading = isRouteLoading || isApiLoading;

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-black/60 backdrop-blur-md",
        "animate-in fade-in duration-200"
      )}
      style={{ backdropFilter: "blur(8px)" }}
    >
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
            <span className="text-white font-semibold text-lg tracking-wide">
              {loadingMessage || "Loading"}
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

        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function GlobalLoader() {
  return (
    <Suspense fallback={null}>
      <GlobalLoaderContent />
    </Suspense>
  );
}