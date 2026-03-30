"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AccessDeniedModal({
  isOpen,
  projectName,
  projectId,
  accessState = "not_joined",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestAccess = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/project/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          projectId,
          accessType: "collaborator",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request access");
      }

      toast.success(data.message || "Request sent");
      window.location.reload();
    } catch (error) {
      toast.error(error.message || "Failed to request access");
    } finally {
      setLoading(false);
    }
  };

  const renderAction = () => {
    if (accessState === "approved") {
      return (
        <Button
          onClick={() => window.location.reload()}
          className="w-full bg-gradient-to-b from-[#FFF] to-[#6B696D] text-black h-11"
        >
          Enter Project
        </Button>
      );
    }

    if (accessState === "pending") {
      return (
        <Button disabled className="w-full bg-[#2B2B30] text-gray-300 h-11">
          Request Sent
        </Button>
      );
    }

    if (accessState === "rejected") {
      return (
        <Button disabled className="w-full bg-red-500/10 text-red-300 h-11">
          Request Denied
        </Button>
      );
    }

    return (
      <Button
        onClick={handleRequestAccess}
        variant="outline"
        className="w-full h-11 border-[#36363E] hover:bg-[#2B2B30]"
        disabled={loading}
      >
        {loading ? "Sending..." : "Request Access"}
      </Button>
    );
  };

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
            This project is private and only accessible to approved members.
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
          {renderAction()}
        </div>
      </div>
    </div>
  );
}
