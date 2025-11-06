"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  HiOutlineViewGrid,
  HiViewGrid,
  HiOutlineFolder,
  HiFolder,
  HiOutlineChatAlt2,
  HiChatAlt2,
  HiOutlineCog,
  HiCog,
  HiChevronLeft,
  HiX,
} from "react-icons/hi"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function Sidebar({ className, mobileOpen, onClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileOpen) {
      onClose?.()
    }
  }, [pathname])

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "h-screen flex-col justify-between border-r border-r-[#36363E] bg-sidebar transition-all duration-300",
          // Desktop behavior - always visible
          "lg:flex",
          collapsed ? "lg:w-16" : "lg:w-48",
          "lg:relative",
          // Mobile behavior - hidden by default, shows as drawer
          "fixed z-50 top-0 left-0",
          mobileOpen ? "flex w-64" : "hidden",
          className
        )}
      >
        {/* Mobile Close Button */}
        <button
          className="lg:hidden absolute top-4 right-4 text-white hover:text-gray-300"
          onClick={onClose}
        >
          <HiX size={24} />
        </button>

        {/* Logo and Navigation Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-8">
            <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-6 w-6" />
            {!collapsed && <div className="text-lg font-semibold">CodeCollab</div>}
          </div>

          {/* Navigation */}
          <nav className="mt-6 grid gap-1 px-2">
            <SidebarLink
              href="/dashboard"
              icon={<HiOutlineViewGrid size={24} />}
              activeIcon={<HiViewGrid size={24} />}
              label="Dashboard"
              collapsed={collapsed}
              active={pathname === "/dashboard"}
            />
            <SidebarLink
              href="/projects"
              icon={<HiOutlineFolder size={24} />}
              activeIcon={<HiFolder size={24} />}
              label="My Projects"
              collapsed={collapsed}
              active={pathname === "/projects"}
            />
            <SidebarLink
              href="/messages"
              icon={<HiOutlineChatAlt2 size={24} />}
              activeIcon={<HiChatAlt2 size={24} />}
              label="Messages"
              collapsed={collapsed}
              active={pathname === "/messages"}
            />
            <SidebarLink
              href="/settings"
              icon={<HiOutlineCog size={24} />}
              activeIcon={<HiCog size={24} />}
              label="Settings"
              collapsed={collapsed}
              active={pathname === "/settings"}
            />
          </nav>
        </div>

        {/* Collapse toggle - Desktop Only */}
        <div className="mt-auto hidden lg:flex justify-center p-3">
          <Button
            variant="ghost"
            className={cn(
              "flex w-full items-center justify-start gap-2 px-3 py-2 text-sm transition-all hover:bg-[#29292E]",
              collapsed ? "w-10" : "w-full"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            <HiChevronLeft
              className={cn(
                "size-5 transition-transform",
                collapsed ? "rotate-180" : "rotate-0"
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({ href, icon, activeIcon, label, active = false, collapsed }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-[#C9C9D6] hover:bg-[#29292E] hover:text-[#FFFFFF]"
      )}
    >
      <span className="flex items-center justify-center">
        {active ? activeIcon : icon}
      </span>
      {!collapsed && <span className={cn("font-medium", collapsed && "hidden")}>{label}</span>}
    </Link>
  )
}
