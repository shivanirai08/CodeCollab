"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Image from "next/image"

export default function SettingsPage() {
  return (
    <div className="p-4 justify-center items-center flex flex-col pt-24">
          <Image src="/comingsoon.svg" alt="Coming Soon" width={56} height={56} className="w-56"/>
          <h3 className="-mt-4">Customize your experience - stay tuned!</h3>
    </div>
  )
}
