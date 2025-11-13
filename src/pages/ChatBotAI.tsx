import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Settings, History, Plus, Trash2, MessageSquare, TrendingUp } from "lucide-react";
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

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  ai_provider: string;
  model_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

// Temporary type workaround for Supabase types regeneration
type SupabaseClient = typeof supabase;

const MODEL_OPTIONS = {
  lovable: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Default)" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  ],
  gemini: [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
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
  const [activeProvider, setActiveProvider] = useState<string>("lovable");
  const [selectedModel, setSelectedModel] = useState<string>("google/gemini-2.5-flash");
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationTitle, setConversationTitle] = useState("New Chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
              assistantMessage += content;
              setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
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
          await (supabase as any).from("ai_usage_analytics").insert({
            user_id: user.id,
            conversation_id: conversationId,
            ai_provider: activeProvider,
            model_name: selectedModel,
            response_time_ms: responseTime,
            status: "success",
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
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    await streamChat(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activateLovable = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Nonaktifkan semua dulu
      await (supabase as any)
        .from("user_ai_settings")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Cek apakah baris lovable sudah ada
      const { data: existing } = await (supabase as any)
        .from("user_ai_settings")
        .select("id")
        .eq("user_id", user.id)
        .eq("ai_provider", "lovable")
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from("user_ai_settings")
          .update({ is_active: true })
          .eq("id", existing.id);
      } else {
        await (supabase as any)
          .from("user_ai_settings")
          .insert({ user_id: user.id, ai_provider: "lovable", api_key: "", is_active: true });
      }

      setActiveProvider("lovable");
      setSelectedModel(MODEL_OPTIONS.lovable[0].value);
      toast({ title: "Lovable diaktifkan", description: "Sekarang pertanyaan database akan menggunakan data asli." });
    } catch (e: any) {
      toast({ title: "Gagal mengaktifkan Lovable", description: e.message, variant: "destructive" });
    }
  };

  const currentModels = MODEL_OPTIONS[activeProvider as keyof typeof MODEL_OPTIONS] || [];

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">ChatBot AI</h1>
            <p className="text-muted-foreground mt-1">
              {conversationTitle}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/ai-analytics")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="w-4 h-4 mr-2" />
                  History ({conversations.length})
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Chat History</SheetTitle>
                  <SheetDescription>
                    Load atau hapus percakapan sebelumnya
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <Button
                    onClick={startNewConversation}
                    className="w-full mb-4"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-2">
                      {conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={`p-3 border rounded-lg hover:bg-accent cursor-pointer ${
                            currentConversation === conv.id ? "bg-accent" : ""
                          }`}
                          onClick={() => loadConversation(conv.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">
                                {conv.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {conv.model_name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {conv.message_count} msg
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(conv.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings/ai")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            ✨ {activeProvider}
          </Badge>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[250px] h-8">
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
        {activeProvider !== "lovable" && (
          <Alert className="mt-3">
            <AlertDescription>
              Untuk pertanyaan yang membutuhkan data database (invoice, pemasukan, pengeluaran, kontrak sewa), aktifkan provider Lovable agar AI bisa melakukan function call ke database Anda.
              <Button size="sm" className="ml-3" onClick={activateLovable}>Aktifkan Lovable</Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 && (
            <Alert className="mb-4">
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                Mulai percakapan baru atau load dari history. Model yang dipilih: <strong>{selectedModel}</strong>
              </AlertDescription>
            </Alert>
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span className="text-sm text-muted-foreground">AI sedang mengetik...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ketik pesan Anda..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
