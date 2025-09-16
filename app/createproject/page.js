"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, Globe, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

export default function CreateProjectPage() {
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    visibility: "private",
    template: "blank",
    language: "html",
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

    try{

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a project");
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            title: formData.projectName,
            description: formData.description,
            visibility: formData.visibility,
            template: formData.template,
            language: formData.language,
            owner_id: user.id,
          },
        ])
        .select()
        .single();
      if (data) {
        toast.success(`Project "${data.name}" created successfully!`);
        setFormData({
          projectName: "",
          description: "",
          visibility: "private",
          template: "blank",
          language: "html",
        });
        setIsLoading(false);
        console.log("Created project:", data);
      }
      if (error) throw error;
    } catch (err) {
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsLoading(false);
    }

  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3">
      <div className="w-full max-w-xl">
        <Card className="p-6 gap-2">
          {/* Header inside card */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="p-2 bg-primary/10 rounded-full">
                <Plus className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Create Project
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your project and start collaborating
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
            {/* Project Name */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="projectName"
                className="text-sm font-medium text-foreground"
              >
                Project Name *
              </label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="projectName"
                  type="text"
                  placeholder="Enter project name"
                  value={formData.projectName}
                  onChange={(e) =>
                    handleInputChange("projectName", e.target.value)
                  }
                  className="pl-9 h-10 text-base"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="description"
                className="text-sm font-medium text-foreground"
              >
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Optional"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="min-h-[70px] text-base"
                disabled={isLoading}
              />
            </div>

            {/* Template & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Template
                </label>
                <Select
                  value={formData.template}
                  onValueChange={(value) =>
                    handleInputChange("template", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank</SelectItem>
                    <SelectItem value="react">React</SelectItem>
                    <SelectItem value="vue">Vue</SelectItem>
                    <SelectItem value="angular">Angular</SelectItem>
                    <SelectItem value="node">Node.js</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  Language
                </label>
                <Select
                  value={formData.language}
                  onValueChange={(value) =>
                    handleInputChange("language", value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML/CSS/JS</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <label className="font-medium text-sm text-foreground">
                Visibility
              </label>
              <div className="p-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm mb-3">
                  <Input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === "private"}
                    onChange={(e) =>
                      handleInputChange("visibility", e.target.value)
                    }
                    className="w-4 h-4 text-primary"
                    disabled={isLoading}
                  />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>Private</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === "public"}
                    onChange={(e) =>
                      handleInputChange("visibility", e.target.value)
                    }
                    className="w-4 h-4 text-primary"
                    disabled={isLoading}
                  />
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>Public</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-1"
              disabled={isLoading || !formData.projectName.trim()}
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </form>

          {/* Footer inside card */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have a project code?{" "}
              <Link href="/joinproject" className="text-primary hover:underline">
                Join here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
