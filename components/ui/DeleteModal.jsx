"use client"

import { X } from "lucide-react"
import { Button } from "./button"

export default function DeleteModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#1A1A20] text-white rounded-xl shadow-xl border border-[#2B2B30] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title || "Confirm Delete"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </Button>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-400 mb-6">
          {message || "Are you sure you want to delete this item? This action cannot be undone."}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="bg-[#23232A] hover:bg-[#2B2B30] text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}