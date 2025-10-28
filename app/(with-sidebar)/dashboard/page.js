"use client";

import { useEffect, useState } from "react";
import ProjectCard from "@/components/ui/ProjectCard";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllProjects } from "@/store/FetchProjectsSlice";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const Projects = useSelector((state) => state.fetchprojects.projects);
  const [userName, setUserName] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (!res.ok) {
          console.error("Failed to fetch user, status:", res.status);
          return;
        }
        const data = await res.json();
        const user = data?.user;
        const name = user?.username;
        setUserName(name);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUser();
    dispatch(FetchAllProjects());
  }, [dispatch]);

  return (
    <>
        {/* Welcome */}
        <div className="mb-3 text-2xl font-semibold">
          Welcome back, {userName || "User"} !
        </div>
        <div className="mb-4 text-base text-white/70">Recent Projects</div>

        {/* Cards */}
        <section
         className="flex flex-row flex-wrap gap-6"
        >
          {Projects.map((p) => (
            <ProjectCard
              key={p.id}
              id={p.id}
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