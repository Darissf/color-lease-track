import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import { Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderSettings } from "@/components/ai-settings/ProviderSettings";
import { ChatBotConfig } from "@/components/ai-settings/ChatBotConfig";
import { AIChatConfig } from "@/components/ai-settings/AIChatConfig";
import { AIUsageAnalytics } from "@/components/ai-settings/AIUsageAnalytics";

const AISettings = () => {
  const { activeTheme } = useAppTheme();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [allSettings, setAllSettings] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      navigate("/");
      return;
    }
    
    if (user) {
      fetchAllSettings();
    }
  }, [user, isAdmin, isSuperAdmin]);

  const fetchAllSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("user_ai_settings")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllSettings(data || []);
      
      const active = data?.find(s => s.is_active);
      setActiveProvider(active?.ai_provider || null);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-2 md:px-8 md:py-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={cn(
              "text-3xl font-bold flex items-center gap-2",
              activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            )}>
              <Brain className="w-8 h-8" />
              AI Management Center
            </h1>
            <p className="text-muted-foreground mt-2">
              Kelola AI providers dan konfigurasi untuk ChatBot AI & AI Chat
            </p>
          </div>
        </div>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="providers">Provider Settings</TabsTrigger>
            <TabsTrigger value="chatbot">ChatBot AI</TabsTrigger>
            <TabsTrigger value="aichat">AI Chat</TabsTrigger>
            <TabsTrigger value="analytics">Usage & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="mt-6">
            <ProviderSettings 
              allSettings={allSettings} 
              onSettingsChange={fetchAllSettings} 
            />
          </TabsContent>

          <TabsContent value="chatbot" className="mt-6">
            <ChatBotConfig activeProvider={activeProvider} />
          </TabsContent>

          <TabsContent value="aichat" className="mt-6">
            <AIChatConfig activeProvider={activeProvider} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AIUsageAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AISettings;