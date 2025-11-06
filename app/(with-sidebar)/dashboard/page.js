"use client";

import { useEffect, useMemo, useState } from "react";
import ProjectCard from "@/components/ui/ProjectCard";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllProjects } from "@/store/FetchProjectsSlice";
import { fetchUserInfo } from "@/store/UserSlice";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const Projects = useSelector((state) => state.fetchprojects.projects);
  const userName = useSelector((state) => state.user.userName);
  const searchQuery = useSelector((state) => state.search.searchQuery);
  const [displayLimit, setDisplayLimit] = useState(10);

  useEffect(() => {
    dispatch(fetchUserInfo());
    dispatch(FetchAllProjects());
  }, [dispatch]);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return Projects;

    const query = searchQuery.toLowerCase();
    return Projects.filter(
      (project) =>
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [Projects, searchQuery]);

  // Paginated projects
  const displayedProjects = useMemo(() => {
    return filteredProjects.slice(0, displayLimit);
  }, [filteredProjects, displayLimit]);

  const hasMore = displayLimit < filteredProjects.length;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 10);
  };

  return (
    <>
        {/* Welcome */}
        <div className="mb-3 text-xl md:text-2xl font-semibold">
          Welcome back, {userName || "User"} !
        </div>
        <div className="mb-4 text-sm md:text-base text-white/70">Recent Projects</div>

        {/* Cards */}
        {filteredProjects.length == 0 && (
          <div className="flex flex-col justify-center items-center p-4 py-16">
            <Image
              src={searchQuery.trim() ? "/notfound.svg" : "/noproject.svg"}
              alt="No projects found"
              width={200}
              height={200}
              className="w-48 md:w-56"
            />
            <h3 className="-mt-6 text-center text-lg md:text-xl font-semibold text-white/80 z-2">
              {searchQuery.trim() ? "No projects found" : "No projects yet"}
            </h3>
            <p className="mt-2 text-center text-sm md:text-base text-white/60 max-w-md">
              {searchQuery.trim()
                ? "Try adjusting your search or create a new project to get started."
                : "It's quiet here... start your first project or join one already in motion!"}
            </p>
          </div>
        )}

        {filteredProjects.length > 0 && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {displayedProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  description={p.description}
                  thumbnail={p.thumbnail}
                  lastEditedText={p.lastEditedText}
                  participants={p.participants}
                  role={p.role}
                />
              ))}
            </section>

            {hasMore && (
              <div className="flex justify-center mt-6 md:mt-8">
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
    </>
  );
}