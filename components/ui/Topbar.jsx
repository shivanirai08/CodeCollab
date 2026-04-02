"use client"

import { Button } from "@/components/ui/button"
import LoadingButton from "@/components/ui/LoadingButton"
import { Input } from "@/components/ui/input"
import { Search, Menu, Plus, X, LogOut, ExternalLink } from "lucide-react"
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FaGithub } from "react-icons/fa";
import { setSearchQuery } from "@/store/SearchSlice";
import NotificationBell from "@/components/ui/NotificationBell";

export default function Topbar({ onMenuClick }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const searchValue = useSelector((state) => state.search.searchQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [githubMenuOpen, setGithubMenuOpen] = useState(false);
  const [isJoiningProject, setIsJoiningProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/user');
        const data = await res.json();
        if (data.user) {
          setUserData(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleSearchChange = (value) => {
    dispatch(setSearchQuery(value));
  };

  const handleJoinProject = async () => {
    setIsJoiningProject(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/joinproject');
  };

  const handleCreateProject = async () => {
    setIsCreatingProject(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/createproject');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/signout', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Logged out successfully!");
        router.push("/");
      }
    } catch (error) {
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOut(false);
      setProfileMenuOpen(false);
    }
  };

  const handleGitHubConnect = () => {
    const next = pathname || "/dashboard";
    window.location.href = `/api/github/connect?mode=connect&next=${encodeURIComponent(next)}`;
  };

  const handleExternalNavigation = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    setGithubMenuOpen(false);
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
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
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
                      <Input
                        placeholder="Search"
                        className="h-10 w-full bg-[#212126] border-none pl-11 text-sm placeholder:text-white/60"
                        value={searchValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                      />
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
                    <LoadingButton
                      variant="outline"
                      className="hidden lg:flex border-white text-white hover:bg-white/10 bg-[#121217]"
                      onClick={handleJoinProject}
                      loading={isJoiningProject}
                      loadingText="Joining..."
                    >
                      Join Project
                    </LoadingButton>
                    <LoadingButton
                      className="hidden lg:flex bg-gradient-to-b from-[#FFF] to-[#6B696D] text-black"
                      onClick={handleCreateProject}
                      loading={isCreatingProject}
                      loadingText="Creating..."
                    >
                      Create Project
                    </LoadingButton>

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
                                handleJoinProject();
                              }}
                            >
                              Join Project
                            </button>
                            <button
                              className="w-full px-4 py-3 text-left text-sm hover:bg-[#2F2F35] transition-colors"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                handleCreateProject();
                              }}
                            >
                              Create Project
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <NotificationBell />

                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative rounded-full border border-[var(--border)] hover:bg-[#2F2F35] size-10 overflow-hidden"
                        onClick={() => {
                          setGithubMenuOpen((prev) => !prev);
                          setProfileMenuOpen(false);
                        }}
                      >
                        {userData?.github_connected && userData?.github_profile?.avatar_url ? (
                          <Image
                            src={userData.github_profile.avatar_url}
                            alt="GitHub avatar"
                            className="h-full w-full object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <FaGithub className="size-5" />
                        )}
                      </Button>

                      {githubMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setGithubMenuOpen(false)}
                          />
                          <div className="absolute right-0 top-12 z-50 w-72 rounded-lg bg-[#212126] border border-gray-700 shadow-lg overflow-hidden">
                            {!userData?.github_connected ? (
                              <div className="p-3">
                                <p className="text-sm font-medium text-white">
                                  Connect GitHub
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                  Link your GitHub account to browse repos and access GitHub actions from the app.
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="mt-3 w-full border-white/15 bg-transparent text-white hover:bg-[#2F2F35]"
                                  onClick={handleGitHubConnect}
                                >
                                  <FaGithub className="size-4" />
                                  Connect with GitHub
                                </Button>
                              </div>
                            ) : (
                              <>
                                <div className="px-4 py-3 border-b border-gray-700">
                                  <div className="flex items-center gap-3">
                                    <div className="size-10 overflow-hidden rounded-full border border-gray-600">
                                      <Image
                                        src={userData?.github_profile?.avatar_url || "/thumbnail.svg"}
                                        alt="GitHub avatar"
                                        className="h-full w-full object-cover"
                                        width={40}
                                        height={40}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-white">
                                        {userData?.github_profile?.name || userData?.github_profile?.login || "GitHub"}
                                      </p>
                                      <p className="truncate text-xs text-gray-400">
                                        @{userData?.github_profile?.login || "connected"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-2">
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#2F2F35]"
                                    onClick={() => handleExternalNavigation(userData?.github_profile?.repos_url)}
                                  >
                                    <span>View all repos</span>
                                    <ExternalLink className="size-4 text-gray-400" />
                                  </button>
                                  <button
                                    type="button"
                                    className="mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#2F2F35]"
                                    onClick={() => handleExternalNavigation(userData?.github_profile?.settings_url)}
                                  >
                                    <span>GitHub settings</span>
                                    <ExternalLink className="size-4 text-gray-400" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Profile Menu */}
                    <div className="relative">
                      <div 
                        className="size-10 overflow-hidden rounded-full border border-gray-700 cursor-pointer hover:border-gray-500 transition-colors" 
                        onClick={() => {
                          setProfileMenuOpen(!profileMenuOpen);
                          setGithubMenuOpen(false);
                        }}
                      >
                        <Image 
                          src={userData?.avatar_url || "/thumbnail.svg"} 
                          alt="avatar" 
                          className="h-full w-full object-cover" 
                          width={48} 
                          height={48} 
                        />
                      </div>

                      {/* Profile Dropdown */}
                      {profileMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setProfileMenuOpen(false)}
                          />
                          <div className="absolute right-0 top-12 z-50 w-64 rounded-lg bg-[#212126] border border-gray-700 shadow-lg overflow-hidden">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-gray-700">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="size-10 overflow-hidden rounded-full border border-gray-600">
                                  <Image 
                                    src={userData?.avatar_url || "/thumbnail.svg"} 
                                    alt="avatar" 
                                    className="h-full w-full object-cover" 
                                    width={40} 
                                    height={40} 
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {userData?.username || "User"}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">
                                    {userData?.email || ""}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Logout Button */}
                            <div className="p-2">
                              <LoadingButton
                                variant="ghost"
                                className="w-full justify-start text-sm hover:bg-[#2F2F35] text-red-400 hover:text-red-300"
                                onClick={handleLogout}
                                loading={isLoggingOut}
                                loadingText="Logging out..."
                              >
                                <LogOut className="size-4 mr-2" />
                                Logout
                              </LoadingButton>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
          </div>
        </>
    );
}
