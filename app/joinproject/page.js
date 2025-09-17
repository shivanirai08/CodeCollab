"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Key } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export default function JoinProjectPage() {
  const [projectCode, setProjectCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinProject = async (e) => {
    e.preventDefault();

    if (!/^[a-f0-9]{8}$/.test(projectCode)) {
      toast.error("Project code must be 8 hex characters");
      return;
    }
    // const { data: { user }, error } = await supabase.auth.getUser();

    setIsLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      const res = await fetch("/api/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ joinCode: projectCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Request failed");
        return;
      }
      if (data.error) {
        toast.error(data.error);
      } else if (data.joined) {
        toast.success(data.message || "Joined project!");
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

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || projectCode.length !== 8}
            >
              {isLoading ? "Joining..." : "Join Project"}
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
