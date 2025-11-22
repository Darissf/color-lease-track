import { Link } from "react-router-dom";
import { Search, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  count: number;
}

interface RecentPost {
  slug: string;
  title: string;
  publishedAt: string;
}

interface BlogSidebarProps {
  categories: Category[];
  recentPosts: RecentPost[];
  popularTags: string[];
  onSearch?: (query: string) => void;
}

export const BlogSidebar = ({
  categories,
  recentPosts,
  popularTags,
  onSearch,
}: BlogSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <aside className="space-y-8">
      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Cari Artikel</h3>
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="text"
            placeholder="Cari artikel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-sky-blue transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Categories */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Kategori</h3>
        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/blog/category/${category.slug}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-sky-blue/10 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-foreground group-hover:text-sky-blue transition-colors">
                    {category.name}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {category.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Recent Posts */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">
          Artikel Terbaru
        </h3>
        <ul className="space-y-4">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="block group"
              >
                <h4 className="text-sm font-medium text-foreground group-hover:text-sky-blue transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(post.publishedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Popular Tags */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Tag Populer
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <Link key={tag} to={`/blog/tag/${tag.toLowerCase()}`}>
              <Badge variant="outline" className="hover:bg-sky-blue hover:text-white hover:border-sky-blue transition-colors cursor-pointer">
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};
