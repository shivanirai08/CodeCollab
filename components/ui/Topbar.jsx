"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Bell } from "lucide-react"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Topbar() {
  const router = useRouter();

    const handleLogout = async () => {
    const res = await fetch('/api/signout', { method: 'POST' })
    const data = await res.json()
    if (data.error) alert(data.error)
    else{
     toast.success("Logged out successfully!")
     router.push('/auth/login')}
  };

    return(
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 py-6 bg-background py-4">
                  <div className="relative w-full max-w-xl">
                    <Input placeholder="Search" className="h-10 w-100 bg-[#212126] border-none pl-11 text-sm placeholder:text-white/60" />
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" className="border-white text-white hover:bg-white/10 bg-[#121217]" onClick={()=>{router.push("/joinproject")}}>
                      Join Project
                    </Button>
                    <Button className="bg-gradient-to-b from-[#FFF] to-[#6B696D] text-black" onClick={()=>{router.push("/createproject")}}>
                      Create Project
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full bg-[#212126] hover:bg-[#2F2F35] size-10">
                      <Bell />
                    </Button>
                    <div className="size-10 overflow-hidden rounded-full border border-gray-700" onClick={handleLogout}>
                      <Image src="/thumbnail.svg" alt="avatar" className="h-full w-full object-cover" width={48} height={48} />
                    </div>
                  </div>
                </div>
    )
}