import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  MessageSquare, 
  Zap, 
  TrendingUp, 
  FileText, 
  Target,
  Heart,
  Dna,
  Users,
  Plane,
  Sparkles,
  Settings,
  BarChart3
} from "lucide-react";

const AIHub = () => {
  const navigate = useNavigate();

  const aiFeatures = [
    {
      id: "analytics",
      title: "AI Analytics",
      description: "Natural language queries & conversational analytics",
      icon: MessageSquare,
      color: "bg-blue-500",
      path: "/ai-analytics",
      features: ["Natural Language Query", "Conversational Analytics", "Voice Input"]
    },
    {
      id: "automation",
      title: "AI Automation",
      description: "Smart categorization & document intelligence",
      icon: Zap,
      color: "bg-purple-500",
      path: "/ai-automation",
      features: ["Smart Categorization", "OCR Document Scanning", "Auto Data Entry"]
    },
    {
      id: "advisor",
      title: "AI Advisor",
      description: "Investment advice, scenario modeling & financial DNA",
      icon: TrendingUp,
      color: "bg-green-500",
      path: "/ai-advisor",
      features: ["Investment Advisor", "Scenario Modeling", "Financial DNA Profile"]
    },
    {
      id: "insights",
      title: "AI Insights",
      description: "Behavioral analysis & emotional finance tracking",
      icon: Brain,
      color: "bg-orange-500",
      path: "/ai-insights",
      features: ["Behavioral Insights", "Emotional Finance", "Spending Patterns"]
    },
    {
      id: "autopilot",
      title: "AI Auto-Pilot",
      description: "Multi-agent system & autonomous management",
      icon: Plane,
      color: "bg-red-500",
      path: "/ai-autopilot",
      features: ["Multi-Agent System", "Auto-Pilot Mode", "Smart Execution"]
    },
    {
      id: "settings",
      title: "AI Settings",
      description: "Configure providers, API keys & test connections",
      icon: Settings,
      color: "bg-gray-500",
      path: "/settings/ai",
      features: ["Provider Setup", "API Key Management", "Connection Testing"]
    },
    {
      id: "usage",
      title: "Usage Analytics",
      description: "Monitor API calls, tokens, costs & performance",
      icon: BarChart3,
      color: "bg-cyan-500",
      path: "/ai-usage",
      features: ["API Call Tracking", "Cost Monitoring", "Performance Metrics"]
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            AI Hub
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Powered by Advanced AI - Your complete intelligent financial ecosystem
        </p>
      </div>

      {/* AI Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card 
              key={feature.id} 
              className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary"
              onClick={() => navigate(feature.path)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`${feature.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {feature.features.map((feat, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline">
                  Explore
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">11</div>
              <div className="text-sm text-muted-foreground">AI Models</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">Active</div>
              <div className="text-sm text-muted-foreground">System Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">∞</div>
              <div className="text-sm text-muted-foreground">Capabilities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">24/7</div>
              <div className="text-sm text-muted-foreground">Availability</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIHub;
