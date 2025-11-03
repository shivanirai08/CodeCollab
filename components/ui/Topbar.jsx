"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Bell, Menu, Plus, X } from "lucide-react"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

export default function Topbar({ onMenuClick }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
    const res = await fetch('/api/signout', { method: 'POST' })
    const data = await res.json()
    if (data.error) alert(data.error)
    else{
     toast.success("Logged out successfully!")
     router.push('/auth/login')}
  };

    return(
        <>
          {/* Mobile Search Overlay - Full Screen */}
          {searchOpen && (
            <div className="lg:hidden fixed inset-0 bg-background z-50 flex items-start p-4 pt-6">
              <div className="relative w-full">
                <Input
                  placeholder="Search"
                  className="h-12 w-full bg-[#212126] border-none pl-12 pr-12 text-base placeholder:text-white/60"
                  autoFocus
                />
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  onClick={() => setSearchOpen(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
          )}

          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 md:gap-4 py-4 bg-background">
                  {/* Hamburger Menu Button - Mobile Only */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden rounded-full bg-[#212126] hover:bg-[#2F2F35] size-10"
                    onClick={onMenuClick}
                  >
                    <Menu className="size-5" />
                  </Button>

                  {/* Search Bar - Expandable on Mobile */}
                  <div className="relative flex-1 max-w-xl">
                    {/* Desktop Search - Always Visible */}
                    <div className="hidden lg:block relative w-full">
                      <Input placeholder="Search" className="h-10 w-full bg-[#212126] border-none pl-11 text-sm placeholder:text-white/60" />
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    {/* Mobile Search - Icon Only */}
                    <div className="lg:hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-[#212126] hover:bg-[#2F2F35] size-10"
                        onClick={() => setSearchOpen(true)}
                      >
                        <Search className="size-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3">
                    {/* Desktop CTAs */}
                    <Button
                      variant="outline"
                      className="hidden lg:flex border-white text-white hover:bg-white/10 bg-[#121217]"
                      onClick={()=>{router.push("/joinproject")}}
                    >
                      Join Project
                    </Button>
                    <Button
                      className="hidden lg:flex bg-gradient-to-b from-[#FFF] to-[#6B696D] text-black"
                      onClick={()=>{router.push("/createproject")}}
                    >
                      Create Project
                    </Button>

                    {/* Mobile + Button */}
                    <div className="lg:hidden relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-gradient-to-b from-[#FFF] to-[#6B696D] text-black hover:opacity-90 size-10"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      >
                        <Plus className="size-5" />
                      </Button>

                      {/* Dropdown Menu */}
                      {mobileMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMobileMenuOpen(false)}
                          />
                          <div className="absolute right-0 top-12 z-50 w-48 rounded-lg bg-[#212126] border border-gray-700 shadow-lg overflow-hidden">
                            <button
                              className="w-full px-4 py-3 text-left text-sm hover:bg-[#2F2F35] transition-colors border-b border-gray-700"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                router.push("/joinproject");
                              }}
                            >
                              Join Project
                            </button>
                            <button
                              className="w-full px-4 py-3 text-left text-sm hover:bg-[#2F2F35] transition-colors"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                router.push("/createproject");
                              }}
                            >
                              Create Project
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="rounded-full bg-[#212126] hover:bg-[#2F2F35] size-10">
                      <Bell className="size-5" />
                    </Button>
                    <div className="size-10 overflow-hidden rounded-full border border-gray-700 cursor-pointer" onClick={handleLogout}>
                      <Image src="/thumbnail.svg" alt="avatar" className="h-full w-full object-cover" width={48} height={48} />
                    </div>
                  </div>
          </div>
        </>
    );
}