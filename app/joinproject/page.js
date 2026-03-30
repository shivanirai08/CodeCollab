"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Key } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function JoinProjectPage() {
  const [projectCode, setProjectCode] = useState("");
  const [accessType, setAccessType] = useState("collaborator");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoinProject = async (e) => {
    e.preventDefault();

    if (!/^[a-f0-9]{8}$/.test(projectCode)) {
      toast.error("Project code must be 8 hex characters");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/project/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ joinCode: projectCode, accessType }),
        credentials: "same-origin",
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.state === "member" && data?.projectId) {
          toast.success("You already have access to this project");
          router.push(`/project/${data.projectId}`);
          return;
        }

        if (data?.state === "pending") {
          toast.info(data?.error || "Request already sent");
          return;
        }

        toast.error(data?.error || "Request failed");
        return;
      }
      if (data.error) {
        toast.error(data.error);
      } else if (data.joined) {
        toast.success(data.message || "Joined project!");
         setTimeout(() => {
          router.push(`/project/${data.projectId}`);
        }, 500);
      } else {
        toast.info(data.message || "Request sent");
      }
    } catch (err) {
      console.error("Route error:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2">
      <div className="w-full max-w-md">
        <Card className="p-6 space-y-6">
          {/* Header inside card */}
          <div className="text-center space-y-2">
            <div className="mx-auto p-2 bg-primary/10 rounded-full w-fit">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Join Project</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 8-character project code to join
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoinProject} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="projectCode"
                className="text-sm font-medium text-foreground"
              >
                Project Code *
              </label>
              <Input
                id="projectCode"
                type="text"
                maxLength={8}
                placeholder="ABC123"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="text-center text-lg tracking-widest font-mono h-11"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">
                Requested Access
              </label>
              <Select value={accessType} onValueChange={setAccessType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborator">Collaborator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || projectCode.length !== 8}
            >
              {isLoading ? "Submitting..." : "Join Project"}
            </Button>
          </form>

          {/* Footer inside card */}
          <div className="text-center text-sm text-muted-foreground">
            Want to create a new project instead?{" "}
            <Link
              href="/createproject"
              className="text-primary hover:underline"
            >
              Create here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
