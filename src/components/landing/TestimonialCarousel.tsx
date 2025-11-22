import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

const testimonials = [
  {
    id: 1,
    name: "Budi Santoso",
    company: "PT Graha Konstruksi",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi",
    rating: 5,
    text: "Pelayanan sangat memuaskan! Scaffolding berkualitas dan pengiriman tepat waktu. Tim yang profesional dan responsif.",
  },
  {
    id: 2,
    name: "Dewi Lestari",
    company: "Villa Architect Bali",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dewi",
    rating: 5,
    text: "Sudah 3 proyek villa kami pakai jasa mereka. Harga kompetitif, kualitas terjamin, dan support 24/7 sangat membantu!",
  },
  {
    id: 3,
    name: "Made Wirawan",
    company: "Hotel Grand Bali",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Made",
    rating: 5,
    text: "Sangat rekomendasi! Proses konsultasi hingga instalasi berjalan lancar. Scaffolding kokoh dan aman untuk proyek hotel kami.",
  },
  {
    id: 4,
    name: "Siti Nurhaliza",
    company: "Kontraktor Mandiri",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Siti",
    rating: 5,
    text: "Partner terbaik untuk proyek konstruksi! Staf yang ramah, harga transparan, dan maintenance scaffolding yang baik.",
  },
];

export const TestimonialCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-20 bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Apa Kata <span className="text-sky-500">Klien Kami</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Kepuasan klien adalah prioritas utama kami
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 relative"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 left-6 w-12 h-12 text-sky-200" />

              {/* Content */}
              <div className="text-center relative z-10">
                {/* Avatar */}
                <img
                  src={testimonials[currentIndex].image}
                  alt={testimonials[currentIndex].name}
                  className="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-sky-200 shadow-lg"
                />

                {/* Stars */}
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-gray-700 text-lg md:text-xl italic mb-6">
                  "{testimonials[currentIndex].text}"
                </p>

                {/* Name & Company */}
                <div>
                  <p className="font-bold text-xl text-gray-800">
                    {testimonials[currentIndex].name}
                  </p>
                  <p className="text-sky-600 font-medium">
                    {testimonials[currentIndex].company}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              onClick={prev}
              variant="outline"
              size="icon"
              className="rounded-full border-sky-300 hover:bg-sky-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "bg-sky-500 w-8"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={next}
              variant="outline"
              size="icon"
              className="rounded-full border-sky-300 hover:bg-sky-50"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
