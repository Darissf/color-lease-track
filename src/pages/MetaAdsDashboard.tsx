import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Activity, TrendingUp, Users, Eye, Phone, Send } from "lucide-react";
import { format } from "date-fns";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

export default function MetaAdsDashboard() {
  const { activeTheme } = useAppTheme();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // Redirect if not super admin
  if (!isSuperAdmin) {
    navigate("/");
    return null;
  }

  // Fetch Meta Ads settings
  const { data: settings } = useQuery({
    queryKey: ["meta-ads-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_ads_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch Meta events (last 30 days)
  const { data: events = [] } = useQuery({
    queryKey: ["meta-events"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("meta_events")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("meta_ads_settings").upsert({
        user_id: user?.id,
        pixel_id: pixelId,
        access_token: accessToken,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-ads-settings"] });
      toast.success("Settings saved successfully!");
    },
    onError: (error) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from("meta_ads_settings")
        .update({ is_active: !isActive })
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-ads-settings"] });
      toast.success("Status updated!");
    },
  });

  // Calculate event statistics
  const eventStats = {
    pageView: events.filter((e) => e.event_name === "PageView").length,
    viewContent: events.filter((e) => e.event_name === "ViewContent").length,
    contact: events.filter((e) => e.event_name === "Contact").length,
    lead: events.filter((e) => e.event_name === "Lead").length,
    total: events.length,
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettingsMutation.mutateAsync();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className={cn(
          "text-3xl font-bold",
          activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        )}>Meta Ads Dashboard</h1>
        <p className="text-muted-foreground">
          Configure and monitor Meta Pixel tracking
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.total}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.pageView}</div>
            <p className="text-xs text-muted-foreground">
              {((eventStats.pageView / eventStats.total) * 100 || 0).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.viewContent}</div>
            <p className="text-xs text-muted-foreground">Portfolio & Blog views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.lead}</div>
            <p className="text-xs text-muted-foreground">
              {eventStats.contact} contact actions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pixel Configuration</CardTitle>
            <CardDescription>
              Configure your Meta (Facebook) Pixel settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pixel ID
                </label>
                <Input
                  value={pixelId || settings?.pixel_id || ""}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="123456789012345"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find this in your Meta Events Manager
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Access Token (Optional)
                </label>
                <Input
                  type="password"
                  value={accessToken || settings?.access_token || ""}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="For Conversion API"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for server-side tracking
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Pixel Active</p>
                  <p className="text-xs text-muted-foreground">
                    Enable tracking on your site
                  </p>
                </div>
                <Switch
                  checked={settings?.is_active || false}
                  onCheckedChange={() =>
                    toggleActiveMutation.mutate(settings?.is_active || false)
                  }
                />
              </div>

              <Button type="submit" className="w-full">
                Save Configuration
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Events Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Latest tracked pixel events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between border-b pb-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.event_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), "MMM dd, HH:mm")}
                    </p>
                    {event.event_data && typeof event.event_data === 'object' && 'content_name' in event.event_data && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {String(event.event_data.content_name)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No events tracked yet</p>
                  <p className="text-xs mt-1">
                    Events will appear here once pixel is active
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium mb-1">1. Get your Pixel ID</h4>
            <p className="text-sm text-muted-foreground">
              Go to Meta Events Manager → Select your pixel → Copy the Pixel ID
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">2. Enable tracking</h4>
            <p className="text-sm text-muted-foreground">
              Enter your Pixel ID above and toggle "Pixel Active" to start tracking
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">3. Monitor performance</h4>
            <p className="text-sm text-muted-foreground">
              View real-time events and optimize your Meta ad campaigns based on user behavior
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
