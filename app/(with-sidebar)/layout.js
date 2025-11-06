"use client"

import { useState } from "react"
import Sidebar from "@/components/ui/Sidebar"
import Topbar from "@/components/ui/Topbar"

export default function WithSidebarLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-10">
        {/* Top bar */}
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        {children}
      </main>
    </div>
  )
}