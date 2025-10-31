"use client"

import { Toaster } from "sonner"

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#1A1A20",
          color: "#fff",
          border: "1px solid #36363E",
        },
        className: "toast",
      }}
    />
  )
}