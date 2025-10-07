"use client";

import { cn } from "@/lib/utils";
import { FiCrosshair } from "react-icons/fi";

export default function Tab({ name, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer",
        active == name
          ? "text-white bg-[#1A1A20] rounded-t-md"
          : "text-[#C9C9D6]"
      )}
    >
      <span>{name}</span>
      <span className="opacity-60"><FiCrosshair/></span>
    </div>
  );
}
