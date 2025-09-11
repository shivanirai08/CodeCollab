"use client"

import Sidebar from "@/components/ui/Sidebar"
import Topbar from "@/components/ui/Topbar"

export default function WithSidebarLayout({ children }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 pb-10">
        {/* Top bar */}
        <Topbar/>
        {children}
      </main>
    </div>
  )
}