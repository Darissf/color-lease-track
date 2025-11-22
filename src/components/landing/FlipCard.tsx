import { motion } from "framer-motion";
import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlipCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  price?: string;
}

export const FlipCard = ({ icon: Icon, title, description, features, gradient, price }: FlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative h-80 cursor-pointer perspective-1000"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="relative w-full h-full"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br ${gradient} p-8 text-white shadow-2xl`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col items-center text-center h-full justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
              <Icon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-4">{title}</h3>
            <p className="text-white/90">{description}</p>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br ${gradient} p-8 text-white shadow-2xl`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex flex-col h-full justify-between">
            <div>
              <h3 className="text-xl font-bold mb-4">{title}</h3>
              <ul className="space-y-2 mb-4">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-white/90">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            {price && (
              <div className="text-center">
                <p className="text-sm text-white/80 mb-1">Mulai dari</p>
                <p className="text-2xl font-bold mb-4">{price}</p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Minta Penawaran
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
