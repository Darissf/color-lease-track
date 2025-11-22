import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface AchievementBadgeProps {
  icon: LucideIcon;
  label: string;
  description: string;
}

export const AchievementBadge = ({
  icon: Icon,
  label,
  description,
}: AchievementBadgeProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex-shrink-0 w-64 bg-card border-2 border-sky-blue/20 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-sky-blue/40 transition-all duration-300"
    >
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-blue to-cyan flex items-center justify-center">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h4 className="text-lg font-bold text-foreground">{label}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
};
