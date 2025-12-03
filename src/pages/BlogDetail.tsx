import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BlogContent } from "@/components/blog/BlogContent";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Eye, ArrowLeft, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { getArticleSchema, getBreadcrumbSchema } from "@/lib/seo";

export default function BlogDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);

    // Fetch post
    const { data: postData } = await supabase
      .from("blog_posts")
      .select("*, category:blog_categories(name, color, slug)")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (postData) {
      setPost(postData);

      // Increment views
      await supabase
        .from("blog_posts")
        .update({ views_count: postData.views_count + 1 })
        .eq("id", postData.id);

      // Fetch related posts
      const { data: relatedData } = await supabase
        .from("blog_posts")
        .select("*, category:blog_categories(name, color)")
        .eq("category_id", postData.category_id)
        .neq("id", postData.id)
        .eq("status", "published")
        .limit(3);

      setRelatedPosts(relatedData || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-blue" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Artikel tidak ditemukan
        </h1>
        <Link to="/blog">
          <Button>Kembali ke Blog</Button>
        </Link>
      </div>
    );
  }

  const readingTime = Math.ceil(post.content.split(" ").length / 200);

  const articleUrl = `https://sewascaffoldingbali.com/blog/${post.slug}`;

  return (
    <>
      {/* SEO */}
      <SEOHead
        title={post.title}
        description={post.excerpt || post.content.substring(0, 155)}
        keywords={post.tags?.join(", ") || "scaffolding, konstruksi, bali"}
        canonical={`/blog/${post.slug}`}
        ogImage={post.featured_image}
        ogType="article"
        publishedTime={post.published_at}
        modifiedTime={post.updated_at}
        author="Tim Scaffolding Bali"
        structuredData={[
          getArticleSchema({
            title: post.title,
            description: post.excerpt || post.content.substring(0, 155),
            url: articleUrl,
            image: post.featured_image,
            publishedTime: post.published_at,
            modifiedTime: post.updated_at,
          }),
          getBreadcrumbSchema([
            { name: "Beranda", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` }
          ])
        ]}
      />

      <ReadingProgress />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="container mx-auto px-4 pt-8 pb-4">
          <Link to="/blog">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Blog
            </Button>
          </Link>
        </div>

        {/* Article Header */}
        <article className="container mx-auto px-4 pb-12">
          <div className="max-w-4xl mx-auto">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <Badge style={{ backgroundColor: post.category?.color }}>
                {post.category?.name}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(post.published_at), "d MMMM yyyy", { locale: idLocale })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {post.views_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {readingTime} min baca
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Share */}
            <div className="mb-8">
              <ShareButtons
                url={window.location.href}
                title={post.title}
              />
            </div>

            {/* Featured Image */}
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full rounded-xl mb-8 shadow-lg"
              />
            )}

            {/* Content */}
            <BlogContent content={post.content} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-border">
                {post.tags.map((tag: string) => (
                  <Link key={tag} to={`/blog/tag/${tag}`}>
                    <Badge variant="outline" className="hover:bg-sky-blue hover:text-white transition-colors">
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Author Card */}
            <div className="mt-12 p-6 bg-gradient-to-br from-sky-blue/10 to-cyan/10 rounded-xl border border-sky-blue/20">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-sky-blue to-cyan text-white text-lg">
                    SB
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">
                    Tim Scaffolding Bali
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Menyediakan informasi terpercaya seputar scaffolding dan konstruksi di Bali.
                    Berpengalaman lebih dari 10 tahun melayani berbagai proyek.
                  </p>
                </div>
              </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-16">
                <h2 className="text-3xl font-bold text-foreground mb-8">
                  Artikel Terkait
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link key={relatedPost.id} to={`/blog/${relatedPost.slug}`}>
                      <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        {relatedPost.featured_image && (
                          <img
                            src={relatedPost.featured_image}
                            alt={relatedPost.title}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                            {relatedPost.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {relatedPost.excerpt}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
