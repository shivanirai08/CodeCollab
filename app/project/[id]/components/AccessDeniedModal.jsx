"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";

export default function AccessDeniedModal({ isOpen, projectName }) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#1A1A20] text-white rounded-xl shadow-2xl border border-[#2B2B30] p-8 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500/10 rounded-full">
            <Lock className="h-12 w-12 text-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            You are not a member of{" "}
            <span className="text-white font-medium">"{projectName}"</span>.
            <br />
            This project is private and only accessible to collaborators.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-primary hover:bg-primary/90 h-11"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            onClick={() => router.push("/joinproject")}
            variant="outline"
            className="w-full h-11 border-[#36363E] hover:bg-[#2B2B30]"
          >
            Join a Project
          </Button>
        </div>
      </div>
    </div>
  );
}