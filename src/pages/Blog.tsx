import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollAnimationWrapper } from "@/components/landing/ScrollAnimationWrapper";
import { Loader2 } from "lucide-react";

export default function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogData();
  }, [selectedCategory]);

  const fetchBlogData = async () => {
    setLoading(true);

    // Fetch categories with post count
    const { data: categoriesData } = await supabase
      .from("blog_categories")
      .select("*")
      .order("display_order");

    // Fetch posts
    let postsQuery = supabase
      .from("blog_posts")
      .select("*, category:blog_categories(name, color)")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (selectedCategory) {
      postsQuery = postsQuery.eq("category_id", selectedCategory);
    }

    const { data: postsData } = await postsQuery;

    // Get post counts for categories
    const categoriesWithCount = await Promise.all(
      (categoriesData || []).map(async (cat) => {
        const { count } = await supabase
          .from("blog_posts")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id)
          .eq("status", "published");
        
        return { ...cat, count: count || 0 };
      })
    );

    // Fetch recent posts for sidebar
    const { data: recentData } = await supabase
      .from("blog_posts")
      .select("slug, title, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5);

    setCategories(categoriesWithCount);
    setPosts(postsData || []);
    setRecentPosts(recentData || []);
    setLoading(false);
  };

  const popularTags = ["scaffolding", "safety", "konstruksi", "tips", "renovasi"];

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-br from-sky-blue to-cyan text-white overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl font-bold mb-4">Blog Scaffolding Bali</h1>
          <p className="text-xl max-w-2xl mx-auto opacity-90">
            Tips konstruksi, case studies, dan panduan lengkap seputar scaffolding
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24">
                <BlogSidebar
                  categories={categories}
                  recentPosts={recentPosts}
                  popularTags={popularTags}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9 order-1 lg:order-2">
              {/* Category Filter */}
              <Tabs value={selectedCategory || "all"} className="mb-8">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="all" onClick={() => setSelectedCategory(null)}>
                    Semua
                  </TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-blue" />
                </div>
              ) : (
                <>
                  {/* Featured Post */}
                  {featuredPost && (
                    <ScrollAnimationWrapper direction="up">
                      <div className="mb-12">
                        <BlogCard
                          slug={featuredPost.slug}
                          title={featuredPost.title}
                          excerpt={featuredPost.excerpt}
                          featuredImage={featuredPost.featured_image}
                          category={featuredPost.category?.name || "Uncategorized"}
                          categoryColor={featuredPost.category?.color}
                          publishedAt={featuredPost.published_at}
                          viewsCount={featuredPost.views_count}
                        />
                      </div>
                    </ScrollAnimationWrapper>
                  )}

                  {/* Posts Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {regularPosts.map((post, index) => (
                      <ScrollAnimationWrapper
                        key={post.id}
                        direction="up"
                        delay={index * 0.1}
                      >
                        <BlogCard
                          slug={post.slug}
                          title={post.title}
                          excerpt={post.excerpt}
                          featuredImage={post.featured_image}
                          category={post.category?.name || "Uncategorized"}
                          categoryColor={post.category?.color}
                          publishedAt={post.published_at}
                          viewsCount={post.views_count}
                        />
                      </ScrollAnimationWrapper>
                    ))}
                  </div>

                  {posts.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground text-lg">
                        Belum ada artikel yang dipublikasikan.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
