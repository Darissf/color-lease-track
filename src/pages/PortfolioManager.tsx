import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Trash2, Edit, Star, StarOff, GripVertical, Plus } from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface PortfolioProject {
  id: string;
  title: string;
  location: string;
  category: string;
  image_url: string;
  thumbnail_url: string | null;
  description: string | null;
  project_date: string | null;
  is_featured: boolean;
  display_order: number;
}

export default function PortfolioManager() {
  const { activeTheme } = useAppTheme();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Redirect if not super admin
  if (!isSuperAdmin) {
    navigate("/");
    return null;
  }

  // Fetch portfolio projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["portfolio-projects", filterCategory],
    queryFn: async () => {
      let query = supabase
        .from("portfolio_projects")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PortfolioProject[];
    },
  });

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("portfolio-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Add project mutation
  const addProjectMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const file = formData.get("image") as File;
      const imageUrl = await uploadImage(file);

      const { error } = await supabase.from("portfolio_projects").insert({
        title: formData.get("title") as string,
        location: formData.get("location") as string,
        category: formData.get("category") as string,
        description: formData.get("description") as string,
        image_url: imageUrl,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects"] });
      setIsAddDialogOpen(false);
      toast.success("Project added successfully!");
    },
    onError: (error) => {
      toast.error("Failed to add project: " + error.message);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("portfolio_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects"] });
      toast.success("Project deleted!");
    },
  });

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from("portfolio_projects")
        .update({ is_featured: !isFeatured })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects"] });
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (reorderedProjects: PortfolioProject[]) => {
      const updates = reorderedProjects.map((project, index) => ({
        id: project.id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("portfolio_projects")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-projects"] });
      toast.success("Order updated!");
    },
  });

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsUploading(true);
    await addProjectMutation.mutateAsync(formData);
    setIsUploading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={cn(
            "text-3xl font-bold",
            activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          )}>Portfolio Manager</h1>
          <p className="text-muted-foreground">Manage project images and details</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="komersial">Komersial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={projects}
          onReorder={updateOrderMutation.mutate}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {projects.map((project) => (
            <Reorder.Item key={project.id} value={project}>
              <motion.div layout>
                <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleFeaturedMutation.mutate({ id: project.id, isFeatured: project.is_featured })}
                      >
                        {project.is_featured ? (
                          <StarOff className="w-4 h-4" />
                        ) : (
                          <Star className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteProjectMutation.mutate(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {project.is_featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-medium">
                      {project.category}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold mb-1">{project.title}</h3>
                    <p className="text-sm text-muted-foreground">{project.location}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* Add Project Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProject} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Image</label>
              <Input
                name="image"
                type="file"
                accept="image/*"
                required
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input name="title" required disabled={isUploading} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input name="location" required disabled={isUploading} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select name="category" required disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="komersial">Komersial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
              <Textarea name="description" disabled={isUploading} />
            </div>
            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Add Project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
