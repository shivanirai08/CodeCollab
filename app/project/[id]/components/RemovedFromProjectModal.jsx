"use client";

import { useEffect } from "react";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function RemovedFromProjectModal({ isOpen, projectName }) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      // Auto-redirect after 5 seconds
      const timer = setTimeout(() => {
        router.push("/projects");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, router]);

  if (!isOpen) return null;

  const handleGoToProjects = () => {
    router.push("/projects");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#1A1A20] text-white rounded-xl shadow-xl border border-[#2B2B30] p-6 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <UserX className="h-8 w-8 text-red-400" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold mb-2">Removed from Project</h2>
          <p className="text-sm text-gray-400">
            You have been removed from <span className="font-medium text-white">"{projectName}"</span> by the project owner.
          </p>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-500 text-center mb-6">
          You no longer have access to this project. Redirecting to your projects in 5 seconds...
        </p>

        {/* Actions */}
        <div className="flex justify-center">
          <Button onClick={handleGoToProjects}>
            Go to My Projects
          </Button>
        </div>
      </div>
    </div>
  );
}
