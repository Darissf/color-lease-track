import { Link } from "react-router-dom";
import { Calendar, Eye, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  category: string;
  categoryColor?: string;
  publishedAt: string;
  viewsCount: number;
}

export const BlogCard = ({
  slug,
  title,
  excerpt,
  featuredImage,
  category,
  categoryColor = "#0ea5e9",
  publishedAt,
  viewsCount,
}: BlogCardProps) => {
  return (
    <Link to={`/blog/${slug}`}>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
        {/* Featured Image */}
        <div className="relative h-48 overflow-hidden bg-muted">
          {featuredImage ? (
            <img
              src={featuredImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sky-blue to-cyan flex items-center justify-center">
              <span className="text-white text-4xl font-bold opacity-20">
                {title.charAt(0)}
              </span>
            </div>
          )}
          <Badge
            className="absolute top-4 left-4"
            style={{ backgroundColor: categoryColor }}
          >
            {category}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2 group-hover:text-sky-blue transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {excerpt}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(publishedAt), "d MMM yyyy", { locale: id })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {viewsCount}
              </span>
            </div>
            <span className="flex items-center gap-1 text-sky-blue font-medium group-hover:gap-2 transition-all">
              Baca <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
