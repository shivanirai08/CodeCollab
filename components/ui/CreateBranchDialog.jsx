"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function isValidBranchName(name) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) return false;
  if (trimmed.startsWith("-") || trimmed.startsWith(".")) return false;
  if (trimmed.endsWith(".") || trimmed.endsWith(".lock")) return false;
  if (trimmed.includes("..") || trimmed.includes(" ")) return false;
  if (/[~^:?*[\]\\]/.test(trimmed)) return false;
  return /^[a-zA-Z0-9]/.test(trimmed);
}

export default function CreateBranchDialog({
  isOpen,
  onClose,
  projectId,
  currentBranch,
  branches = { local: [], remote: [] },
  collaboratorCount = 0,
  onSuccess,
}) {
  const [name, setName] = useState("");
  const [startPoint, setStartPoint] = useState("");
  const [pushToOrigin, setPushToOrigin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadedBranches, setLoadedBranches] = useState({ local: [], remote: [] });

  const effectiveBranches = useMemo(
    () => ({
      local: branches.local?.length ? branches.local : loadedBranches.local,
      remote: branches.remote?.length ? branches.remote : loadedBranches.remote,
    }),
    [branches.local, branches.remote, loadedBranches.local, loadedBranches.remote]
  );

  const startPointOptions = useMemo(() => {
    const options = new Set();
    if (currentBranch) options.add(currentBranch);
    for (const branch of effectiveBranches.local || []) options.add(branch);
    for (const branch of effectiveBranches.remote || []) options.add(branch);
    return Array.from(options).sort();
  }, [effectiveBranches.local, effectiveBranches.remote, currentBranch]);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setStartPoint(currentBranch || "");
    setPushToOrigin(false);
    setError("");
    setIsSubmitting(false);
  }, [isOpen, currentBranch]);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    let cancelled = false;

    const loadBranches = async () => {
      try {
        const res = await fetch(`/api/project/${projectId}/git/branches`, {
          method: "GET",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setLoadedBranches({
            local: data.local || [],
            remote: data.remote || [],
          });
        }
      } catch {
        if (!cancelled) {
          setLoadedBranches({ local: [], remote: [] });
        }
      }
    };

    loadBranches();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const nameIsValid = isValidBranchName(trimmedName);
  const showCollaboratorWarning = collaboratorCount > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!nameIsValid || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/project/${projectId}/git/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: trimmedName,
          startPoint: startPoint || currentBranch,
          pushToOrigin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create branch");
      }

      await onSuccess?.(data);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Failed to create branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={isSubmitting ? undefined : onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#2B2B30] bg-[#1A1A20] text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#2B2B30] px-6 py-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
              <GitBranch className="size-3.5" />
              New branch
            </div>
            <h2 className="text-xl font-semibold">Create branch</h2>
            <p className="mt-1 text-sm text-gray-400">
              Creates a branch and switches the shared project to it.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {showCollaboratorWarning ? (
            <div className="rounded-xl border border-[#4B3B24] bg-[#231C12] px-4 py-3 text-sm text-[#E8C9A0]">
              {collaboratorCount === 1
                ? "1 collaborator is in this project. Creating a branch updates the shared file tree for everyone."
                : `${collaboratorCount} collaborators are in this project. Creating a branch updates the shared file tree for everyone.`}
            </div>
          ) : null}

          <div>
            <label htmlFor="branch-name" className="mb-1.5 block text-sm font-medium text-[#C9C9D6]">
              Branch name
            </label>
            <input
              id="branch-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="feature/my-change"
              autoFocus
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#2B2B30] bg-[#141419] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-[#5A5A68] focus:border-[#4A4A56]"
            />
            {trimmedName && !nameIsValid ? (
              <p className="mt-1.5 text-xs text-[#FCA5A5]">
                Use letters, numbers, /, ., _, or -. No spaces or special characters.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="branch-start" className="mb-1.5 block text-sm font-medium text-[#C9C9D6]">
              Start from
            </label>
            <select
              id="branch-start"
              value={startPoint}
              onChange={(event) => setStartPoint(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#2B2B30] bg-[#141419] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#4A4A56]"
            >
              {startPointOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                  {branch === currentBranch ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2B2B30] bg-[#141419] px-4 py-3">
            <input
              type="checkbox"
              checked={pushToOrigin}
              onChange={(event) => setPushToOrigin(event.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-[#E6E6EC]">Push to origin</span>
              <span className="mt-0.5 block text-xs text-[#8B909A]">
                Publish the new branch to GitHub immediately.
              </span>
            </span>
          </label>

          {error ? <p className="text-sm text-[#FCA5A5]">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#2B2B30] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-[#23232A] text-white hover:bg-[#2B2B30]"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!nameIsValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create branch"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
