import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Image, Edit, TrendingUp, Search } from "lucide-react";
import BlogPosts from "./admin/BlogPosts";
import BlogCategories from "./admin/BlogCategories";
import PortfolioManager from "./PortfolioManager";
import EditPage from "./EditPage";
import ContentStudio from "./ContentStudio";
import MetaAdsDashboard from "./MetaAdsDashboard";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}

const StatsCard = ({ title, value, icon, description }: StatsCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

export default function LandingSettings() {
  const { activeTheme } = useAppTheme();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, navigate]);

  // Fetch dashboard stats
  const { data: blogStats } = useQuery({
    queryKey: ["landing-stats-blog"],
    queryFn: async () => {
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("status", { count: "exact" });
      
      const total = posts?.length || 0;
      const published = posts?.filter(p => p.status === "published").length || 0;
      
      return { total, published };
    },
  });

  const { data: portfolioStats } = useQuery({
    queryKey: ["landing-stats-portfolio"],
    queryFn: async () => {
      const { count } = await supabase
        .from("portfolio_projects")
        .select("*", { count: "exact", head: true });
      
      return { total: count || 0 };
    },
  });

  const { data: metaStats } = useQuery({
    queryKey: ["landing-stats-meta"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count } = await supabase
        .from("meta_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());
      
      return { events: count || 0 };
    },
  });

  const { data: contentStats } = useQuery({
    queryKey: ["landing-stats-content"],
    queryFn: async () => {
      const { count } = await supabase
        .from("editable_content")
        .select("*", { count: "exact", head: true });
      
      return { total: count || 0 };
    },
  });

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-[1600px]">
      <div className="mb-6">
        <h1 className={cn(
          "text-3xl font-bold flex items-center gap-3",
          activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        )}>
          <LayoutDashboard className="h-8 w-8 text-primary" />
          Setting Landing Page
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola semua aspek landing page: blog, portfolio, content & tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="blog" className="gap-2">
            <FileText className="h-4 w-4" />
            Blog
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Image className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Edit className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="meta-ads" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Meta Ads
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Blog Posts"
              value={blogStats?.total || 0}
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              description={`${blogStats?.published || 0} published`}
            />
            <StatsCard
              title="Portfolio Projects"
              value={portfolioStats?.total || 0}
              icon={<Image className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title="Editable Content"
              value={contentStats?.total || 0}
              icon={<Edit className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title="Meta Events (30d)"
              value={metaStats?.events || 0}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for landing page management</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => setActiveTab("blog")} variant="outline" className="h-auto py-4 flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-sm">Manage Blog</span>
              </Button>
              <Button onClick={() => setActiveTab("portfolio")} variant="outline" className="h-auto py-4 flex-col gap-2">
                <Image className="h-6 w-6" />
                <span className="text-sm">Add Portfolio</span>
              </Button>
              <Button onClick={() => setActiveTab("content")} variant="outline" className="h-auto py-4 flex-col gap-2">
                <Edit className="h-6 w-6" />
                <span className="text-sm">Edit Content</span>
              </Button>
              <Button onClick={() => setActiveTab("meta-ads")} variant="outline" className="h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm">View Analytics</span>
              </Button>
            </CardContent>
          </Card>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Latest Updates</CardTitle>
                <CardDescription>Recent changes to your landing page</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">Blog posts managed from this page</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">Portfolio projects organized here</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">Content editing tools available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Landing page metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Published Content</span>
                    <span className="font-semibold">{blogStats?.published || 0} posts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Portfolio Items</span>
                    <span className="font-semibold">{portfolioStats?.total || 0} projects</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Recent Tracking</span>
                    <span className="font-semibold">{metaStats?.events || 0} events</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Blog Management Tab */}
        <TabsContent value="blog">
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList>
              <TabsTrigger value="posts">Blog Posts</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts">
              <BlogPosts />
            </TabsContent>
            
            <TabsContent value="categories">
              <BlogCategories />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          <PortfolioManager />
        </TabsContent>

        {/* Content Editor Tab */}
        <TabsContent value="content">
          <Tabs defaultValue="quick" className="space-y-6">
            <TabsList>
              <TabsTrigger value="quick">Quick Edit</TabsTrigger>
              <TabsTrigger value="studio">Content Studio</TabsTrigger>
            </TabsList>
            
            <TabsContent value="quick">
              <EditPage />
            </TabsContent>
            
            <TabsContent value="studio">
              <ContentStudio />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Meta Ads Tab */}
        <TabsContent value="meta-ads">
          <MetaAdsDashboard />
        </TabsContent>

        {/* SEO Tab (Placeholder) */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Analytics</CardTitle>
              <CardDescription>Coming soon - Manage SEO settings and analytics integration</CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">SEO Management</p>
                <p className="text-sm">This feature is under development</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
