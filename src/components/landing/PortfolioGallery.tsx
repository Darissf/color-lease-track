import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/metaPixel";

interface Project {
  id: string;
  title: string;
  location: string;
  image_url: string;
  category: string;
  description?: string;
}

const categories = [
  { id: "all", label: "Semua" },
  { id: "villa", label: "Villa" },
  { id: "hotel", label: "Hotel" },
  { id: "komersial", label: "Komersial" },
];

// Fallback data with construction-related images
const fallbackProjects: Project[] = [
  {
    id: "1",
    title: "Villa Mewah Seminyak",
    location: "Seminyak, Bali",
    image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    category: "villa",
  },
  {
    id: "2",
    title: "Hotel Resort Nusa Dua",
    location: "Nusa Dua, Bali",
    image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80",
    category: "hotel",
  },
  {
    id: "3",
    title: "Gedung Komersial Denpasar",
    location: "Denpasar, Bali",
    image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
    category: "komersial",
  },
  {
    id: "4",
    title: "Villa Pantai Canggu",
    location: "Canggu, Bali",
    image_url: "https://images.unsplash.com/photo-1517089596392-fb9a9033e05b?w=800&q=80",
    category: "villa",
  },
  {
    id: "5",
    title: "Apartemen Mewah Sanur",
    location: "Sanur, Bali",
    image_url: "https://images.unsplash.com/photo-1590644365607-1c5f72a1fcc9?w=800&q=80",
    category: "komersial",
  },
  {
    id: "6",
    title: "Resort Ubud",
    location: "Ubud, Bali",
    image_url: "https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea?w=800&q=80",
    category: "hotel",
  },
];

export const PortfolioGallery = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lightboxImage, setLightboxImage] = useState<Project | null>(null);

  // Fetch projects from database
  const { data: dbProjects = [], isLoading } = useQuery({
    queryKey: ["portfolio-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_projects")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  // Use database projects or fallback
  const projects = dbProjects.length > 0 ? dbProjects : fallbackProjects;

  const filteredProjects = selectedCategory === "all"
    ? projects
    : projects.filter(p => p.category === selectedCategory);

  const handleProjectClick = (project: Project) => {
    // Track ViewContent event for Meta Pixel
    trackEvent("ViewContent", {
      content_name: project.title,
      content_category: project.category,
      content_ids: [project.id],
      content_type: "portfolio",
    });

    setLightboxImage(project);
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            Portfolio <span className="text-amber-500">Proyek Kami</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Lihat berbagai proyek scaffolding yang telah kami selesaikan dengan sukses
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              className={`rounded-full ${
                selectedCategory === cat.id
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-64 bg-slate-200 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          /* Gallery Grid */
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4 }}
                  className="group relative overflow-hidden rounded-2xl shadow-xl cursor-pointer h-64"
                  onClick={() => handleProjectClick(project)}
                >
                  <img
                    src={project.image_url}
                    alt={project.title}
                    loading="lazy"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" />
                        {project.location}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4"
              onClick={() => setLightboxImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative max-w-4xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
                <img
                  src={lightboxImage.image_url}
                  alt={lightboxImage.title}
                  className="w-full rounded-lg"
                />
                <div className="mt-4 text-white text-center">
                  <h3 className="text-2xl font-bold mb-2">{lightboxImage.title}</h3>
                  <p className="flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {lightboxImage.location}
                  </p>
                  {lightboxImage.description && (
                    <p className="text-sm mt-3 opacity-80">{lightboxImage.description}</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};