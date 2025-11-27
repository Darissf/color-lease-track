import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Settings, History, Plus, Trash2, MessageSquare, TrendingUp, Search as SearchIcon, Download, Command as CommandIcon, Sparkles, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ImageUploader } from "@/components/ImageUploader";
import { PersonaSelector } from "@/components/PersonaSelector";
import { MessageActions } from "@/components/MessageActions";
import { CommandPalette } from "@/components/CommandPalette";
import { ExportDialog } from "@/components/ExportDialog";
import { ConversationSearch } from "@/components/ConversationSearch";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { GradientButton } from "@/components/GradientButton";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  ai_provider: string;
  model_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  tags?: string[];
  folder?: string;
  persona_id?: string;
}

// Temporary type workaround for Supabase types regeneration
type SupabaseClient = typeof supabase;

const MODEL_OPTIONS = {
  gemini: [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Recommended)" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  openai: [
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  claude: [
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-opus-4-1", label: "Claude Opus 4.1" },
    { value: "claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-coder", label: "DeepSeek Coder" },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ],
};

export default function ChatBotAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.0-flash-exp");
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationTitle, setConversationTitle] = useState("New Chat");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  
  const { activeTheme } = useAppTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchActiveProvider();
    fetchConversations();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchActiveProvider = async () => {
    try {
      const { data } = await supabase
        .from("user_ai_settings")
        .select("ai_provider")
        .eq("is_active", true)
        .maybeSingle();
      
      if (data) {
        setActiveProvider(data.ai_provider);
        const models = MODEL_OPTIONS[data.ai_provider as keyof typeof MODEL_OPTIONS];
        if (models && models.length > 0) {
          setSelectedModel(models[0].value);
        }
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("chat_conversations")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversations((data || []) as Conversation[]);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages = data.map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      setMessages(loadedMessages);
      setCurrentConversation(conversationId);
      
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setConversationTitle(conv.title);
        setActiveProvider(conv.ai_provider);
        setSelectedModel(conv.model_name);
      }

      toast({ title: "Percakapan dimuat" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat percakapan",
        variant: "destructive",
      });
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversation(null);
    setConversationTitle("New Chat");
    toast({ title: "Percakapan baru dimulai" });
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("Hapus percakapan ini?")) return;

    try {
      const { error } = await (supabase as any)
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      toast({ title: "Percakapan dihapus" });
      await fetchConversations();
      
      if (currentConversation === conversationId) {
        startNewConversation();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menghapus percakapan",
        variant: "destructive",
      });
    }
  };

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Anda harus login terlebih dahulu",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      let conversationId = currentConversation;
      
      if (!conversationId) {
        const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
        const { data: newConv, error: convError } = await (supabase as any)
          .from("chat_conversations")
          .insert({
            user_id: user.id,
            title,
            ai_provider: activeProvider,
            model_name: selectedModel,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
        setCurrentConversation(conversationId);
        setConversationTitle(title);
        await fetchConversations();
      }

      await (supabase as any).from("chat_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: userMessage,
      });

      // Use fetch for streaming instead of supabase.functions.invoke
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          conversationId,
          model: selectedModel,
        }),
      });

      if (!resp.ok || !resp.body) {
        let desc = "Gagal memulai stream";
        try {
          const j = await resp.json();
          desc = j?.error || desc;
        } catch {}
        throw new Error(desc);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Sanitasi: hapus token tool_calls dan kontennya
              let sanitized = content;
              
              // Hapus pattern tool__calls__begin...tool__calls__end
              sanitized = sanitized.replace(/tool__calls__begin[\s\S]*?tool__calls__end/gi, '');
              
              // Hapus tool__sep
              sanitized = sanitized.replace(/tool__sep/gi, '');
              
              // Hapus pattern <tool_call>...</tool_call>
              sanitized = sanitized.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '');
              
              // Hapus pattern yang mungkin muncul dari DeepSeek
              sanitized = sanitized.replace(/\[TOOL_CALLS\][\s\S]*?\[\/TOOL_CALLS\]/gi, '');
              
              if (sanitized) {
                assistantMessage += sanitized;
                setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
              }
            }
          } catch (e) {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantMessage && conversationId) {
        const { data: { user } } = await supabase.auth.getUser();
        
        await (supabase as any).from("chat_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage,
        });

        if (user) {
          const responseTime = Date.now() - startTime;
          
          // Estimasi tokens: 1 token ≈ 4 characters
          const estimateTokens = (text: string) => Math.ceil(text.length / 4);
          const requestTokens = estimateTokens(userMessage);
          const responseTokens = estimateTokens(assistantMessage);
          const totalTokens = requestTokens + responseTokens;
          
          // Estimasi cost berdasarkan provider dan model (dalam USD)
          const calculateCost = (provider: string, model: string, inTokens: number, outTokens: number) => {
            const pricing: Record<string, Record<string, { input: number; output: number }>> = {
              gemini: {
                "gemini-2.0-flash-exp": { input: 0, output: 0 }, // Free tier
                "gemini-1.5-pro": { input: 0.00000125, output: 0.000005 },
                "gemini-1.5-flash": { input: 0.000000075, output: 0.0000003 },
              },
              openai: {
                "gpt-5": { input: 0.00001, output: 0.00003 }, // $10 / 1M input, $30 / 1M output
                "gpt-5-mini": { input: 0.0000015, output: 0.000006 },
                "gpt-4o": { input: 0.0000025, output: 0.00001 },
                "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
              },
              claude: {
                "claude-sonnet-4-5": { input: 0.000003, output: 0.000015 }, // $3 / 1M input, $15 / 1M output
                "claude-opus-4-1": { input: 0.000015, output: 0.000075 }, // $15 / 1M input, $75 / 1M output
                "claude-3-5-haiku": { input: 0.0000008, output: 0.000004 }, // $0.80 / 1M input, $4 / 1M output
              },
              deepseek: {
                "deepseek-chat": { input: 0.00000014, output: 0.00000028 }, // $0.14 / 1M input, $0.28 / 1M output
                "deepseek-coder": { input: 0.00000014, output: 0.00000028 },
              },
              groq: {
                "llama-3.3-70b-versatile": { input: 0.00000059, output: 0.00000079 }, // $0.59 / 1M input, $0.79 / 1M output
                "mixtral-8x7b-32768": { input: 0.00000024, output: 0.00000024 },
              },
            };
            
            const providerPricing = pricing[provider]?.[model];
            if (!providerPricing) return 0;
            
            return (inTokens * providerPricing.input) + (outTokens * providerPricing.output);
          };
          
          const costEstimate = calculateCost(activeProvider, selectedModel, requestTokens, responseTokens);
          
          await (supabase as any).from("ai_usage_analytics").insert({
            user_id: user.id,
            conversation_id: conversationId,
            ai_provider: activeProvider,
            model_name: selectedModel,
            response_time_ms: responseTime,
            status: "success",
            tokens_used: totalTokens,
            request_tokens: requestTokens,
            response_tokens: responseTokens,
            cost_estimate: costEstimate,
          });
        }
      }

      await fetchConversations();

    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Terjadi kesalahan saat menghubungi AI";
      if (error?.message?.includes("429")) {
        errorMessage = "Terlalu banyak request, coba lagi nanti";
      } else if (error?.message?.includes("402")) {
        errorMessage = "Kredit AI habis, silakan isi ulang";
      }

      if (currentConversation) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any).from("ai_usage_analytics").insert({
            user_id: user.id,
            conversation_id: currentConversation,
            ai_provider: activeProvider,
            model_name: selectedModel,
            response_time_ms: Date.now() - startTime,
            status: "error",
            error_message: error?.message,
          });
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !currentImage) || isLoading) return;

    const userMessage = input.trim();
    const imageToSend = currentImage;
    setInput("");
    setCurrentImage(null);
    
    if (imageToSend) {
      await handleImageAnalysis(userMessage, imageToSend);
    } else {
      await streamChat(userMessage);
    }
  };

  const handleImageAnalysis = async (prompt: string, imageUrl: string) => {
    setIsImageProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-vision', {
        body: { image: imageUrl, prompt: prompt || "What's in this image?" }
      });

      if (error) throw error;

      const userMsg: Message = {
        role: "user",
        content: prompt || "What's in this image?",
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };
      
      const aiMsg: Message = {
        role: "assistant",
        content: data.analysis,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMsg, aiMsg]);

      // Save to database if conversation exists
      if (currentConversation) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('chat_messages').insert([
            { conversation_id: currentConversation, role: 'user', content: userMsg.content },
            { conversation_id: currentConversation, role: 'assistant', content: aiMsg.content }
          ]);
        }
      }

      toast({ title: "Image analyzed successfully" });
    } catch (error: any) {
      console.error('Image analysis error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze image",
        variant: "destructive",
      });
    } finally {
      setIsImageProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRegenerate = async (messageIndex: number) => {
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== "user") return;

    setMessages((prev) => prev.slice(0, messageIndex));
    setIsLoading(true);
    try {
      await streamChat(userMessage.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCommand = async (command: string) => {
    setInput(command);
    setTimeout(() => handleSend(), 100);
  };

  const currentModels = MODEL_OPTIONS[activeProvider as keyof typeof MODEL_OPTIONS] || [];

  return (
    <>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onCommand={handleQuickCommand}
      />
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        conversationId={currentConversation || ''}
        messages={messages.map(m => ({ ...m, created_at: m.created_at || new Date().toISOString() }))}
        conversationTitle={conversationTitle}
      />
      <ConversationSearch
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelectConversation={loadConversation}
      />
      <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
        {/* Header Section - OUTSIDE AnimatedBackground for visibility */}
        <div className="shrink-0 px-2 py-2 md:px-8 md:py-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-4xl lg:text-5xl font-bold text-foreground truncate">
                ✨ ChatBot AI
              </h1>
              <p className="text-xs md:text-lg bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent mt-1 truncate hidden xs:block">
                {conversationTitle}
              </p>
            </div>
            
            {/* Desktop: Show all buttons */}
            <div className="hidden md:flex gap-2">
              <GradientButton
                variant="budget"
                size="sm"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <CommandIcon className="w-4 h-4 mr-2" />
                Commands
              </GradientButton>
              <GradientButton
                variant="primary"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                disabled={!currentConversation}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </GradientButton>
              <GradientButton
                variant="income"
                size="sm"
                onClick={() => setSearchDialogOpen(true)}
              >
                <SearchIcon className="w-4 h-4 mr-2" />
                Search
              </GradientButton>
              <GradientButton
                variant="savings"
                size="sm"
                onClick={() => navigate("/ai-analytics")}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </GradientButton>
              <Sheet>
                <SheetTrigger asChild>
                  <GradientButton variant="budget" size="sm">
                    <History className="w-4 h-4 mr-2" />
                    History ({conversations.length})
                  </GradientButton>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
                    <SheetTitle className="text-white flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Chat History
                    </SheetTitle>
                    <SheetDescription className="text-white/90">
                      Load atau hapus percakapan sebelumnya
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4">
                    <GradientButton
                      className="w-full mb-4"
                      variant="income"
                      onClick={() => {
                        startNewConversation();
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Conversation
                    </GradientButton>
                    <ScrollArea className="h-[calc(100vh-12rem)]">
                      <div className="space-y-2">
                        {conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                              currentConversation === conv.id 
                                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500 shadow-lg shadow-purple-500/30' 
                                : 'border-transparent hover:border-purple-500/50 hover:bg-gradient-to-br hover:from-purple-500/5 hover:to-pink-500/5 hover:scale-[1.02]'
                            }`}
                            onClick={() => loadConversation(conv.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{conv.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className="text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
                                    {conv.ai_provider}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {conv.message_count} messages
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(conv.updated_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 hover:bg-red-500/20 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conv.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>
              <GradientButton
                variant="budget"
                size="sm"
                onClick={startNewConversation}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                New Chat
              </GradientButton>
              <GradientButton
                variant="primary"
                size="sm"
                onClick={() => navigate("/settings/ai")}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </GradientButton>
            </div>
            
            {/* Mobile: Show minimal buttons + dropdown */}
            <div className="flex md:hidden gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 -m-6 mb-4 rounded-t-lg">
                    <SheetTitle className="text-white flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Chat History
                    </SheetTitle>
                    <SheetDescription className="text-white/90">
                      Load atau hapus percakapan sebelumnya
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4">
                    <GradientButton
                      className="w-full mb-4"
                      variant="income"
                      onClick={() => startNewConversation()}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Conversation
                    </GradientButton>
                    <ScrollArea className="h-[calc(100vh-12rem)]">
                      <div className="space-y-2">
                        {conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                              currentConversation === conv.id 
                                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500 shadow-lg shadow-purple-500/30' 
                                : 'border-transparent hover:border-purple-500/50 hover:bg-gradient-to-br hover:from-purple-500/5 hover:to-pink-500/5'
                            }`}
                            onClick={() => loadConversation(conv.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{conv.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className="text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
                                    {conv.ai_provider}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {conv.message_count} messages
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 hover:bg-red-500/20 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConversation(conv.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={startNewConversation}>
                <Plus className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCommandPaletteOpen(true)}>
                    <CommandIcon className="w-4 h-4 mr-2" />
                    Commands
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExportDialogOpen(true)} disabled={!currentConversation}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSearchDialogOpen(true)}>
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/ai-analytics")}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings/ai")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="mt-2 md:mt-3 flex items-center gap-2 flex-wrap">
            <Badge className="gap-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 shadow-lg shadow-purple-500/50">
              <Sparkles className="w-3 h-3" />
              {activeProvider}
            </Badge>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full md:w-[250px] h-8 border-purple-500/50 hover:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!["openai", "claude", "deepseek", "gemini"].includes(activeProvider) && (
            <Alert className="mt-2 md:mt-3 border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5 hidden md:flex">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <AlertDescription className="text-foreground">
                Provider {activeProvider} tidak mendukung akses database. Untuk pertanyaan yang membutuhkan data (invoice, pemasukan, pengeluaran, kontrak sewa), gunakan OpenAI, Claude, Gemini, atau DeepSeek.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Chat Content - INSIDE AnimatedBackground */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AnimatedBackground theme="budget">
            <div className="h-full flex flex-col px-2 md:px-4 py-2 md:py-4">
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 min-h-0 p-4">
          {messages.length === 0 && (
            <>
              <Alert className="mb-4 border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5 hidden md:flex">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <AlertDescription className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Mulai percakapan baru atau load dari history. Model yang dipilih: <strong>{selectedModel}</strong>
                </AlertDescription>
              </Alert>
              
              <div className="mb-6">
                <h3 className={cn(
                  "text-sm font-medium mb-3 flex items-center gap-2",
                  activeTheme === 'japanese'
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                    : "text-foreground"
                )}>
                  <Sparkles className={cn(
                    "w-4 h-4",
                    activeTheme === 'japanese' ? "text-purple-500" : "text-primary"
                  )} />
                  Suggested Prompts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      icon: "💰",
                      title: "Analisa Keuangan",
                      prompt: "Buatkan analisa lengkap keuangan saya bulan ini",
                      gradient: "from-emerald-500 to-green-600"
                    },
                    {
                      icon: "📊",
                      title: "Budget Planning",
                      prompt: "Bantu saya buat rencana budget untuk bulan depan",
                      gradient: "from-blue-500 to-cyan-600"
                    },
                    {
                      icon: "💡",
                      title: "Savings Tips",
                      prompt: "Berikan tips untuk meningkatkan tabungan saya",
                      gradient: "from-purple-500 to-pink-600"
                    },
                    {
                      icon: "📈",
                      title: "Investment Advice",
                      prompt: "Rekomendasi investasi yang cocok untuk pemula",
                      gradient: "from-orange-500 to-red-600"
                    }
                  ].map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setInput(suggestion.prompt);
                        setTimeout(() => handleSend(), 100);
                      }}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl group relative overflow-hidden",
                        activeTheme === 'japanese'
                          ? `bg-gradient-to-br ${suggestion.gradient} hover:scale-105`
                          : "bg-card border border-border hover:border-primary"
                      )}
                    >
                      <div className={cn(
                        "absolute inset-0 transition-colors",
                        activeTheme === 'japanese'
                          ? "bg-white/10 group-hover:bg-white/20"
                          : "bg-primary/5 group-hover:bg-primary/10"
                      )}></div>
                      <div className="relative z-10">
                        <div className="text-3xl mb-2">{suggestion.icon}</div>
                        <h4 className={cn(
                          "font-bold text-sm mb-1",
                          activeTheme === 'japanese' ? "text-white" : "text-foreground"
                        )}>{suggestion.title}</h4>
                        <p className={cn(
                          "text-xs",
                          activeTheme === 'japanese' ? "text-white/90" : "text-muted-foreground"
                        )}>{suggestion.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 shadow-lg",
                    activeTheme === 'japanese'
                      ? "bg-gradient-to-br from-purple-500 to-pink-600 ring-purple-500/20 shadow-purple-500/50 animate-pulse-glow"
                      : "bg-primary ring-primary/20 shadow-primary/50"
                  )}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 flex flex-col gap-2">
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl p-4 shadow-xl transition-all duration-300",
                      message.role === "user"
                        ? activeTheme === 'japanese'
                          ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-600 text-white ml-auto rounded-br-sm shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/60 animate-slide-in-right"
                          : "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                        : activeTheme === 'japanese'
                          ? "bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 text-white rounded-bl-sm shadow-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/60 animate-slide-in-left"
                          : "bg-card text-card-foreground border border-border rounded-bl-sm"
                    )}
                  >
                    {message.image_url && (
                      <img src={message.image_url} alt="Uploaded" className="max-w-full rounded mb-2" />
                    )}
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      activeTheme === 'japanese' ? "prose-invert" : ""
                    )}>
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {message.id && (
                    <MessageActions
                      messageId={message.id}
                      content={message.content}
                      onRegenerate={message.role === "assistant" ? () => handleRegenerate(index) : undefined}
                    />
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-blue-500/20 shadow-lg shadow-blue-500/50">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center ring-4 ring-purple-500/20 shadow-lg shadow-purple-500/50 animate-pulse-glow">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-2xl rounded-bl-sm p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full animate-bounce shadow-lg shadow-purple-500/50" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-3 h-3 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full animate-bounce shadow-lg shadow-pink-500/50" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-3 h-3 bg-gradient-to-r from-rose-500 to-purple-600 rounded-full animate-bounce shadow-lg shadow-rose-500/50" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">
                      AI sedang berpikir...
                    </span>
                    <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-2 md:p-4 border-t shrink-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-blue-500/5">
          {currentImage && (
            <div className="mb-3 relative inline-block">
              <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                <img src={currentImage} alt="Upload preview" className="max-h-32 rounded" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                onClick={() => setCurrentImage(null)}
              >
                ×
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="hidden md:block">
              <PersonaSelector
                selectedPersonaId={selectedPersonaId}
                onPersonaChange={setSelectedPersonaId}
              />
            </div>
            <VoiceRecorder
              onTranscript={(text) => setInput(text)}
              disabled={isLoading}
            />
            <ImageUploader
              onImageSelect={setCurrentImage}
              disabled={isLoading || isImageProcessing}
            />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ketik pesan..."
              disabled={isLoading}
              className="flex-1 min-w-0 border-2 border-purple-500/30 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all rounded-xl bg-white/50 backdrop-blur-sm"
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && !currentImage) || isLoading}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </Button>
          </div>
        </div>
              </Card>
            </div>
          </AnimatedBackground>
        </div>
      </div>
     </>
  );
}
