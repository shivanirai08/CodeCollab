"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createProject } from "@/store/ProjectSlice";

export default function CreateProjectPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    visibility: "private",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!formData.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    try {
      const result = await dispatch(createProject(formData)).unwrap();

      toast.success(`Project "${result.title}" created successfully!`);

      // Redirect to the project page
      setTimeout(() => {
        router.push(`/project/${result.id}`);
      }, 500);
    } catch (error) {
      toast.error(error || "Failed to create project. Please try again.");
      console.error("Create project error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3">
      <div className="w-full max-w-xl">
        <Card className="p-6 gap-2">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <Plus className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Create New Project
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Set up your project and start collaborating
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateProject} className="flex flex-col gap-5">
            {/* Project Name */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="projectName"
                className="text-sm font-medium text-foreground"
              >
                Project Name *
              </label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="projectName"
                  type="text"
                  placeholder="My Awesome Project"
                  value={formData.projectName}
                  onChange={(e) =>
                    handleInputChange("projectName", e.target.value)
                  }
                  className="pl-10 h-11 text-base"
                  disabled={isLoading}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description{" "}
                <span className="text-muted-foreground">(Optional)</span>
              </label>
              <Textarea
                id="description"
                placeholder="What's your project about?"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="min-h-[90px] text-base resize-none"
                disabled={isLoading}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {formData.description.length}/500
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange("visibility", "private")}
                  disabled={isLoading}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    formData.visibility === "private"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${
                    isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <Lock
                    className={`h-5 w-5 ${
                      formData.visibility === "private"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-left">
                    <div className="font-medium text-sm">Private</div>
                    <div className="text-xs text-muted-foreground">
                      Only collaborators
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange("visibility", "public")}
                  disabled={isLoading}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    formData.visibility === "public"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${
                    isLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <Globe
                    className={`h-5 w-5 ${
                      formData.visibility === "public"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <div className="text-left">
                    <div className="font-medium text-sm">Public</div>
                    <div className="text-xs text-muted-foreground">
                      Anyone can view
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Create Button */}
            <Button
              type="submit"
              className="w-full h-11 mt-2"
              disabled={isLoading || !formData.projectName.trim()}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Already have a project code?{" "}
              <Link
                href="/joinproject"
                className="text-primary hover:underline font-medium"
              >
                Join here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
