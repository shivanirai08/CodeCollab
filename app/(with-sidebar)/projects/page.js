"use client";

import { useEffect, useState, useMemo } from "react";
import ProjectCard from "@/components/ui/ProjectCard";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllProjects } from "@/store/FetchProjectsSlice";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [displayLimit, setDisplayLimit] = useState(10);
  const projects = useSelector((state) => state.fetchprojects.projects);
  const dispatch = useDispatch();
  const joined = useSelector((state) => state.fetchprojects.joined);
  const created = useSelector((state) => state.fetchprojects.created);
  const searchQuery = useSelector((state) => state.search.searchQuery);

  useEffect(() => {
    dispatch(FetchAllProjects());
  }, [dispatch]);

  // Reset display limit when tab or search changes
  useEffect(() => {
    setDisplayLimit(10);
  }, [selectedTab, searchQuery]);

  // Filter projects based on search query
  const filterProjects = (projectList) => {
    if (!searchQuery.trim()) return projectList;

    const query = searchQuery.toLowerCase();
    return projectList.filter(
      (project) =>
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  };

  const filteredProjects = useMemo(() => {
    if (selectedTab === "all") return filterProjects(projects);
    if (selectedTab === "created") return filterProjects(created);
    return filterProjects(joined);
  }, [projects, created, joined, selectedTab, searchQuery]);

  // Paginated projects
  const displayedProjects = useMemo(() => {
    return filteredProjects.slice(0, displayLimit);
  }, [filteredProjects, displayLimit]);

  const hasMore = displayLimit < filteredProjects.length;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 10);
  };

  const getEmptyMessage = () => {
    if (searchQuery.trim()) {
      return {
        title: "No projects found",
        description: "Try adjusting your search or create a new project to get started.",
      };
    }

    if (selectedTab === "created") {
      return {
        title: "No projects created yet",
        description: "Start by creating your first project to collaborate with others!",
      };
    }

    if (selectedTab === "joined") {
      return {
        title: "No projects joined yet",
        description: "Join a project using a project code or wait for an invitation!",
      };
    }

    return {
      title: "No projects yet",
      description: "Create your first project or join one to get started!",
    };
  };

  const emptyState = getEmptyMessage();

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">My Projects</h1>

      <div className="flex items-center justify-between mb-4 md:mb-6 overflow-x-auto">
        <div className="flex space-x-2">
          <button
            className={`px-3 md:px-4 py-1 rounded-sm border text-sm md:text-base ${
              selectedTab === "all" ? "border-zinc-500 bg-zinc-700" : "bg-zinc-800 border-transparent"
            }`}
            onClick={() => setSelectedTab("all")}
          >
            All
          </button>
          <button
            className={`px-3 md:px-4 py-1 rounded-sm border text-sm md:text-base ${
              selectedTab === "created" ? "border-zinc-500 bg-zinc-700" : "bg-zinc-800 border-transparent"
            }`}
            onClick={() => setSelectedTab("created")}
          >
            Created
          </button>
          <button
            className={`px-3 md:px-4 py-1 rounded-sm border text-sm md:text-base ${
              selectedTab === "joined" ? "border-zinc-500 bg-zinc-700" : "bg-zinc-800 border-transparent"
            }`}
            onClick={() => setSelectedTab("joined")}
          >
            Joined
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col justify-center items-center p-4 py-16">
          <Image
            src={searchQuery.trim() ? "/notfound.svg" : "/noproject.svg"}
            alt="No projects found"
            width={200}
            height={200}
            className="w-48 md:w-56"
          />
          <h3 className="-mt-6 text-center text-lg md:text-xl font-semibold text-white/80 z-2">
            {emptyState.title}
          </h3>
          <p className="mt-2 text-center text-sm md:text-base text-white/60 max-w-md">
            {emptyState.description}
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {displayedProjects.map((p) => (
              <ProjectCard
                key={p.id}
                id={p.id}
                title={p.title}
                description={p.description}
                thumbnail={p.thumbnail}
                participants={p.participants}
                lastEditedText={p.lastEditedText}
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
    </div>
  );
}
