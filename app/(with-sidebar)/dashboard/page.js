"use client";

import { useEffect} from "react";
import ProjectCard from "@/components/ui/ProjectCard";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllProjects } from "@/store/FetchProjectsSlice";
import { fetchUserInfo } from "@/store/UserSlice";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const Projects = useSelector((state) => state.fetchprojects.projects);
  const userName = useSelector((state) => state.user.userName);

  useEffect(() => {
    dispatch(fetchUserInfo());
    dispatch(FetchAllProjects());
  }, [dispatch]);

  return (
    <>
        {/* Welcome */}
        <div className="mb-3 text-xl md:text-2xl font-semibold">
          Welcome back, {userName || "User"} !
        </div>
        <div className="mb-4 text-sm md:text-base text-white/70">Recent Projects</div>

        {/* Cards */}
        <section
         className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
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