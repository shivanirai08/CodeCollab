"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ProjectCard from "@/components/ui/ProjectCard";

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    const fetchUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error(error);
      return;
    }

    console.log(user);
    fetchUser();
  }}, []);


  const sampleProjects = [
    {
      id: 1,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
    {
      id: 2,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
    {
      id: 3,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
    {
      id: 4,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
    {
      id: 5,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
    {
      id: 6,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
    {
      id: 7,
      title: "To-do App",
      description: "",
      thumbnail: "",
      lastEditedText: "last edited 2 min ago",
      participants: [
        { name: "S", avatar: "/logo.svg", initials: "S" },
        { name: "K", avatar: "/next.svg", initials: "K" },
        { name: "M", avatar: "/vercel.svg", initials: "M" },
      ],
    },
  ];

  return (
    <>
        {/* Welcome */}
        <div className="mb-3 text-2xl font-semibold">
          Welcome back, Shivani !
        </div>
        <div className="mb-4 text-base text-white/70">Recent Projects</div>

        {/* Cards */}
        <section
          className="grid [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))] gap-6"
        >
          {sampleProjects.map((p) => (
            <ProjectCard
              key={p.id}
              title={p.title}
              description={p.description}
              thumbnail={p.thumbnail}
              lastEditedText={p.lastEditedText}
              participants={p.participants}
            />
          ))}
        </section>
    </>
  );
}
