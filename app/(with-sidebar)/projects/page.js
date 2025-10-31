"use client";

import { useEffect, useState } from "react";
import ProjectCard from "@/components/ui/ProjectCard";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllProjects } from "@/store/FetchProjectsSlice";  

export default function ProjectsPage() {
  const [selectedTab, setSelectedTab] = useState("all");
  const projects = useSelector((state) => state.fetchprojects.projects);
  const dispatch = useDispatch();
  const joined = useSelector((state) => state.fetchprojects.joined);
  const created = useSelector((state) => state.fetchprojects.created);

  useEffect(() => {
    dispatch(FetchAllProjects());
  }, [dispatch]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Projects</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          <button className={`px-4 py-1 rounded-sm border ${selectedTab === "all" ? "border-zinc-500 bg-zinc-700" : "bg-zinc-800 border-transparent"}`} onClick={() => setSelectedTab("all")}>
            All
          </button>
          <button className={`px-4 py-1 rounded-sm border ${selectedTab === "created" ? "border-zinc-500 bg-zinc-700" : "bg-zinc-800 border-transparent"}`} onClick={() => setSelectedTab("created")}>
            Created
          </button>
          <button className={`px-4 py-1 rounded-sm border ${selectedTab === "joined" ? "border-zinc-500 bg-zinc-700" : "bg-zinc-800 border-transparent"}`} onClick={() => setSelectedTab("joined")}>
            Joined
          </button>
        </div>
      </div>

      <section
                className="flex flex-row flex-wrap gap-6"
              >
                {selectedTab === "all" ? (
                  projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      description={p.description}
                      thumbnail={p.thumbnail}
                      participants={p.participants}
                      lastEditedText={p.lastEditedText}
                    />
                  ))
                ) : selectedTab === "created" ? (
                  created.map((p) => (
                    <ProjectCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      description={p.description}
                      thumbnail={p.thumbnail}
                      participants={p.participants}
                      lastEditedText={p.lastEditedText}
                    />
                  ))
                ) : (
                  joined.map((p) => (
                    <ProjectCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      description={p.description}
                      thumbnail={p.thumbnail}
                      participants={p.participants}
                      lastEditedText={p.lastEditedText}
                    />
                  ))
                )}
                    </section>
    </div>
  );
}
