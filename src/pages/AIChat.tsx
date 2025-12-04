import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Send, Plus, Trash2, Loader2, User, Sparkles, MessageSquare, ImageIcon, Download, AlertCircle, Settings } from "lucide-react";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const AI_PROVIDERS = {
  gemini: { name: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro-preview", "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"] },
  openai: { name: "OpenAI", models: ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini"] },
  claude: { name: "Anthropic Claude", models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-3-5-haiku"] },
  deepseek: { name: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"] },
  groq: { name: "Groq", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
} as const;

const IMAGE_MODELS = [
  { id: "imagen-3.0-generate-002", name: "Imagen 3" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" },
];

type AIProvider = keyof typeof AI_PROVIDERS;
type Mode = "chat" | "image";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const AIChat = () => {
  const { isAdmin, isSuperAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const { activeTheme } = useAppTheme();
  
  // Mode state
  const [mode, setMode] = useState<Mode>("chat");
  
  // Chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Image states
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("imagen-3.0-generate-002");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Check admin access
  useEffect(() => {
    if (!authLoading && !isAdmin && !isSuperAdmin) {
      toast.error("Akses ditolak. Halaman ini hanya untuk Admin.");
      navigate("/vip/");
    }
  }, [isAdmin, isSuperAdmin, authLoading, navigate]);

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations();
      checkApiKey();
    }
  }, [user]);

  // Set default model when provider changes
  useEffect(() => {
    if (AI_PROVIDERS[provider].models.length > 0) {
      setModel(AI_PROVIDERS[provider].models[0]);
    }
  }, [provider]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkApiKey = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_ai_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("ai_provider", "gemini")
      .maybeSingle();
    setHasApiKey(!!data);
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, title, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
      
      setMessages(formattedMessages);
      setActiveConversation(conversationId);
    } catch (error: any) {
      toast.error("Gagal memuat percakapan");
    }
  };

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: user?.id,
          title: "New Chat",
          ai_provider: provider,
          model_name: model,
        })
        .select()
        .single();

      if (error) throw error;
      setActiveConversation(data.id);
      setMessages([]);
      await loadConversations();
      toast.success("Percakapan baru dibuat");
    } catch (error: any) {
      toast.error("Gagal membuat percakapan baru");
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("Hapus percakapan ini?")) return;

    try {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
      
      if (activeConversation === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      
      await loadConversations();
      toast.success("Percakapan dihapus");
    } catch (error: any) {
      toast.error("Gagal menghapus percakapan");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!activeConversation) {
      await createNewConversation();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (activeConversation) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConversation,
          role: "user",
          content: userMessage.content,
        });
      }

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          provider,
          model,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "Maaf, terjadi kesalahan.",
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (activeConversation) {
        await supabase.from("chat_messages").insert({
          conversation_id: activeConversation,
          role: "assistant",
          content: assistantMessage.content,
        });

        if (messages.length === 0) {
          const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? "..." : "");
          await supabase
            .from("chat_conversations")
            .update({ title })
            .eq("id", activeConversation);
          await loadConversations();
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Gagal mengirim pesan: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Image generation handlers
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Masukkan deskripsi gambar");
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-image", {
        body: { prompt: imagePrompt.trim(), model: imageModel },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.imageBase64) {
        setGeneratedImage(data.imageBase64);
        toast.success("Gambar berhasil digenerate!");
      } else {
        throw new Error("Tidak ada gambar yang dihasilkan");
      }
    } catch (error: any) {
      console.error("Generate error:", error);
      toast.error("Gagal generate gambar: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Gambar didownload!");
  };

  if (authLoading) {
    return (
      <div className="h-[calc(100vh-104px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex">
      {/* Sidebar - Conversation History (Chat Mode Only) */}
      {mode === "chat" && (
        <div className="hidden md:flex w-64 border-r border-border flex-col bg-card/50 backdrop-blur-sm">
          <div className="p-4 border-b border-border">
            <Button onClick={createNewConversation} className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer transition-colors",
                    activeConversation === conv.id && "bg-accent"
                  )}
                  onClick={() => loadConversation(conv.id)}
                >
                  <span className="text-sm truncate flex-1">{conv.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className={cn(
                "text-xl font-bold",
                activeTheme === 'japanese' && "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
              )}>
                AI Chat
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode Toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  variant={mode === "chat" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8"
                  onClick={() => setMode("chat")}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Chat
                </Button>
                <Button
                  variant={mode === "image" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8"
                  onClick={() => setMode("image")}
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Image
                </Button>
              </div>

              {/* Provider/Model Selector */}
              {mode === "chat" ? (
                <>
                  <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AI_PROVIDERS).map(([key, info]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {info.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS[provider].models.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button size="sm" variant="outline" onClick={createNewConversation} className="md:hidden h-8">
                    <Plus className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Select value={imageModel} onValueChange={setImageModel}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        {mode === "chat" ? (
          <>
            {/* Chat Messages */}
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="px-2 py-4 md:px-8 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                    <Bot className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Mulai percakapan baru dengan AI</p>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    <Card className={cn(
                      "max-w-[80%] p-4",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"
                    )}>
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              code: ({ children }) => (
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </Card>

                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <Card className="max-w-[80%] p-4 bg-card">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="shrink-0 p-4 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ketik pesan... (Enter untuk kirim)"
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-[60px] w-[60px] shrink-0"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Image Generation Mode */
          <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
            {/* API Key Warning */}
            {hasApiKey === false && (
              <Alert className="mb-4 shrink-0" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Gemini API key belum dikonfigurasi.</span>
                  <Button size="sm" variant="outline" onClick={() => navigate("/vip/settings/ai")}>
                    <Settings className="w-4 h-4 mr-2" />
                    Konfigurasi
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
              {/* Preview */}
              <Card className="flex flex-col min-h-0">
                <CardHeader className="shrink-0 py-3">
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>Hasil gambar yang digenerate</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center overflow-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      <p>Sedang membuat gambar...</p>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative group">
                      <img
                        src={generatedImage}
                        alt="Generated"
                        className="max-w-full max-h-[350px] rounded-lg shadow-lg object-contain"
                      />
                      <Button
                        size="sm"
                        onClick={handleDownload}
                        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <ImageIcon className="w-16 h-16 opacity-30" />
                      <p className="text-center">Masukkan prompt dan klik Generate</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prompt Input */}
              <Card className="flex flex-col min-h-0">
                <CardHeader className="shrink-0 py-3">
                  <CardTitle className="text-lg">Prompt</CardTitle>
                  <CardDescription>Deskripsikan gambar yang ingin dibuat</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <Textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Contoh: A beautiful sunset over Indonesian rice terraces, photorealistic, 4k"
                    className="flex-1 min-h-[120px] resize-none"
                    disabled={isLoading}
                  />

                  <div className="shrink-0 space-y-3">
                    <Button
                      onClick={handleGenerateImage}
                      disabled={!imagePrompt.trim() || isLoading || hasApiKey === false}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Image
                        </>
                      )}
                    </Button>

                    {generatedImage && (
                      <Button variant="outline" onClick={handleDownload} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download Image
                      </Button>
                    )}
                  </div>

                  <Alert className="shrink-0">
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Tips:</strong> Semakin detail deskripsi, semakin baik hasilnya.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;
