"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Please confirm",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmClassName = "",
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-[#2B2B30] bg-[#1A1A20] p-6 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </Button>
        </div>

        <p className="mb-6 text-sm text-gray-400">{message}</p>

        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="bg-[#23232A] text-white hover:bg-[#2B2B30]"
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className={confirmClassName} disabled={loading}>
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
