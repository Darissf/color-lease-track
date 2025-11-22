import { useState } from "react";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";
import { X } from "lucide-react";

const galleryImages = [
  {
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    caption: "Kantor & Workshop",
  },
  {
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800",
    caption: "Peralatan Scaffolding",
  },
  {
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    caption: "Tim Profesional",
  },
  {
    url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800",
    caption: "Warehouse Storage",
  },
  {
    url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
    caption: "Armada Pengiriman",
  },
  {
    url: "https://images.unsplash.com/photo-1590496793907-4896e2e1c6e6?w=800",
    caption: "Instalasi di Lapangan",
  },
];

export const CompanyGallery = () => {
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption: string } | null>(null);

  return (
    <>
      <section className="py-20 bg-gradient-to-b from-sky-blue/5 to-background">
        <div className="container mx-auto px-4">
          <ScrollAnimationWrapper direction="up">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Galeri Perusahaan
              </h2>
              <p className="text-lg text-muted-foreground">
                Lihat lebih dekat fasilitas dan operasional kami
              </p>
            </div>
          </ScrollAnimationWrapper>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {galleryImages.map((image, index) => (
              <ScrollAnimationWrapper
                key={image.url}
                direction="up"
                delay={index * 0.1}
              >
                <div
                  className="relative group cursor-pointer overflow-hidden rounded-xl aspect-[4/3]"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image.url}
                    alt={image.caption}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white font-medium">{image.caption}</p>
                  </div>
                </div>
              </ScrollAnimationWrapper>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-5xl w-full">
            <img
              src={selectedImage.url}
              alt={selectedImage.caption}
              className="w-full h-auto rounded-lg"
            />
            <p className="text-white text-center mt-4 text-lg">
              {selectedImage.caption}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
