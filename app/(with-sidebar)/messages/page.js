"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function MessagesPage() {
  return (
    <div className="p-4 justify-center items-center flex flex-col pt-24">
      <Image src="/comingsoon.svg" alt="Coming Soon" width={56} height={56} className="w-56"/>
      <h3 className="-mt-4">Your inbox is on its way - stay tuned!</h3>
    </div>
  )
}
