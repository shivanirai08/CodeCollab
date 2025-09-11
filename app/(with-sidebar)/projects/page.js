"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/ui/ProjectCard";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    setProjects([
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
    ]);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Projects</h1>

      <section
                className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]"
              >
                {projects.map((p) => (
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
    </div>
  );
}
