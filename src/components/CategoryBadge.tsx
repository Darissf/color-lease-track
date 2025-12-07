import { Badge } from "@/components/ui/badge";
import { getCategoryStyle } from "@/lib/categoryColors";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/contexts/AppThemeContext";

interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export const CategoryBadge = ({ category, size = "md", showIcon = true }: CategoryBadgeProps) => {
  const style = getCategoryStyle(category);
  const Icon = style.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5"
  };

  // Get shadow color dari bg class
  const shadowColor = style.bg.replace('bg-', '');

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5 font-semibold border-0 text-white shadow-lg",
        "transition-all duration-300 hover:scale-105 hover:shadow-xl",
        style.bg,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={cn("text-white", size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5")} />}
      {category}
    </Badge>
  );
};
