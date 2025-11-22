import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const projects = [
  {
    id: 1,
    title: "Villa Mewah Seminyak",
    location: "Seminyak, Bali",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    category: "villa",
  },
  {
    id: 2,
    title: "Hotel Resort Nusa Dua",
    location: "Nusa Dua, Bali",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    category: "hotel",
  },
  {
    id: 3,
    title: "Gedung Komersial Denpasar",
    location: "Denpasar, Bali",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
    category: "komersial",
  },
  {
    id: 4,
    title: "Villa Pantai Canggu",
    location: "Canggu, Bali",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    category: "villa",
  },
  {
    id: 5,
    title: "Apartemen Mewah Sanur",
    location: "Sanur, Bali",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
    category: "komersial",
  },
  {
    id: 6,
    title: "Resort Ubud",
    location: "Ubud, Bali",
    image: "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80",
    category: "hotel",
  },
];

const categories = [
  { id: "all", label: "Semua" },
  { id: "villa", label: "Villa" },
  { id: "hotel", label: "Hotel" },
  { id: "komersial", label: "Komersial" },
];

export const PortfolioGallery = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lightboxImage, setLightboxImage] = useState<typeof projects[0] | null>(null);

  const filteredProjects = selectedCategory === "all"
    ? projects
    : projects.filter(p => p.category === selectedCategory);

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Portfolio <span className="text-sky-500">Proyek Kami</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
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
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg"
                  : "border-sky-300 text-gray-700 hover:bg-sky-50"
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Gallery Grid */}
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
                onClick={() => setLightboxImage(project)}
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

        {/* Lightbox */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
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
                  className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
                <img
                  src={lightboxImage.image}
                  alt={lightboxImage.title}
                  className="w-full rounded-lg"
                />
                <div className="mt-4 text-white text-center">
                  <h3 className="text-2xl font-bold mb-2">{lightboxImage.title}</h3>
                  <p className="flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {lightboxImage.location}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
