"use client";

import { useEffect, useRef, useState } from "react";
import LoadingButton from "@/components/ui/LoadingButton";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import RequestSentModal from "@/components/ui/RequestSentModal";
import { Eye, Key, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function normalizeProjectCode(value) {
  return value.toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, 8);
}

export default function JoinProjectPage() {
  const [projectCode, setProjectCode] = useState("");
  const [accessType, setAccessType] = useState("collaborator");
  const [isLoading, setIsLoading] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestedProjectName, setRequestedProjectName] = useState("");
  const codeInputRef = useRef(null);
  const router = useRouter();

  const isValidCode = /^[a-f0-9]{8}$/.test(projectCode);

  useEffect(() => {
    codeInputRef.current?.focus();
  }, []);

  const handleCodeChange = (event) => {
    setProjectCode(normalizeProjectCode(event.target.value));
  };

  const handleCodePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    setProjectCode(normalizeProjectCode(pasted));
  };

  const handleJoinProject = async (e) => {
    e.preventDefault();

    if (!isValidCode) {
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
        setRequestedProjectName(data.projectTitle || "");
        setRequestModalOpen(true);
      }
    } catch (err) {
      console.error("Route error:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <RequestSentModal
        isOpen={requestModalOpen}
        projectName={requestedProjectName}
        onStay={() => setRequestModalOpen(false)}
        onDashboard={() => router.push("/dashboard")}
      />
      <div className="flex min-h-screen items-center justify-center bg-background p-2 md:p-6">
        <div className="w-full max-w-lg">
          <Card className="gap-4 p-4 md:p-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-foreground">Join a Project</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the code shared by the project owner
              </p>
            </div>

            <form onSubmit={handleJoinProject} className="flex flex-col">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="projectCode"
                  className="text-sm font-medium text-foreground"
                >
                  Project code *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={codeInputRef}
                    id="projectCode"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={8}
                    placeholder="a1b2c3d4"
                    value={projectCode}
                    onChange={handleCodeChange}
                    onPaste={handleCodePaste}
                    className="h-11 pl-10 text-center font-mono text-base tracking-[0.3em] md:text-lg"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-right text-xs text-muted-foreground">
                  {projectCode.length}/8
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <label className="text-sm font-medium text-foreground">
                  Request access as
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`flex items-start gap-2 rounded-lg border-2 p-3 transition-all ${
                      accessType === "collaborator"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    } ${isLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    onClick={() => setAccessType("collaborator")}
                    disabled={isLoading}
                  >
                    <Pencil
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        accessType === "collaborator"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium">Collaborator</div>
                      <div className="text-xs text-muted-foreground">
                        Edit files and collaborate
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`flex items-start gap-2 rounded-lg border-2 p-3 transition-all ${
                      accessType === "viewer"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    } ${isLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    onClick={() => setAccessType("viewer")}
                    disabled={isLoading}
                  >
                    <Eye
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        accessType === "viewer"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="text-left">
                      <div className="text-sm font-medium">Viewer</div>
                      <div className="text-xs text-muted-foreground">
                        View project files only
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <LoadingButton
                type="submit"
                loading={isLoading}
                loadingText="Sending request..."
                disabled={!isValidCode}
                className="mt-6 flex w-full flex-row items-center justify-center gap-2"
              >
                <Key className="h-4 w-4" />
                Join Project
              </LoadingButton>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Want to create a new project instead?{" "}
                <Link href="/createproject" className="font-medium text-primary hover:underline">
                  Create here
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
