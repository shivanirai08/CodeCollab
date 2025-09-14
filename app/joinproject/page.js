"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Key } from "lucide-react";
import Link from "next/link";

export default function JoinProjectPage() {
  const [projectCode, setProjectCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinProject = async (e) => {
    e.preventDefault();

    if (!/^[A-Za-z0-9]{6}$/.test(projectCode)) {
      setError("Project code must be 6 alphanumeric characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Joining project with code:", projectCode);
      alert(`Joined project with code "${projectCode}" successfully! (Demo)`);
    } catch (err) {
      setError("Failed to join project. Please try again.");
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
              Enter the 6-character project code to join
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
                maxLength={6}
                placeholder="ABC123"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest font-mono h-11"
                disabled={isLoading}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || projectCode.length !== 6}
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
