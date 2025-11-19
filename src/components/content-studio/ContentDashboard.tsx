import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Shield, Clock, TrendingUp, BarChart3, PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentStats {
  total_items: number;
  protected_items: number;
  items_by_page: Record<string, number>;
  items_by_category: Record<string, number>;
  recent_changes_24h: number;
  stale_items_30d: number;
}

export default function ContentDashboard() {
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: allContent, error } = await supabase
        .from("editable_content")
        .select("*");

      if (error) throw error;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats: ContentStats = {
        total_items: allContent.length,
        protected_items: allContent.filter((c) => c.is_protected).length,
        items_by_page: {},
        items_by_category: {},
        recent_changes_24h: allContent.filter(
          (c) => new Date(c.updated_at) > oneDayAgo
        ).length,
        stale_items_30d: allContent.filter(
          (c) => new Date(c.updated_at) < thirtyDaysAgo
        ).length,
      };

      allContent.forEach((item) => {
        stats.items_by_page[item.page] =
          (stats.items_by_page[item.page] || 0) + 1;
        stats.items_by_category[item.category || "general"] =
          (stats.items_by_category[item.category || "general"] || 0) + 1;
      });

      setStats(stats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!stats) {
    return <div>Failed to load dashboard</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Analytics</h2>
        <p className="text-muted-foreground">
          Overview of your content management system
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_items}</div>
            <p className="text-xs text-muted-foreground">All content items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protected</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.protected_items}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.protected_items / stats.total_items) * 100).toFixed(1)}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Changes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recent_changes_24h}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stale Content</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stale_items_30d}</div>
            <p className="text-xs text-muted-foreground">Not updated in 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Content by Page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Content by Page
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {Object.entries(stats.items_by_page)
                .sort(([, a], [, b]) => b - a)
                .map(([page, count]) => (
                  <div
                    key={page}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <span className="font-mono text-sm">{page}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Content by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Content by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(stats.items_by_category)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <div
                  key={category}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border bg-card"
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {category}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
