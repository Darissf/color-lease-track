import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Copy, 
  FileCode, 
  Database, 
  Code, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle,
  BookOpen,
  Key,
  Send,
  Bot,
  Sparkles,
  History
} from "lucide-react";

interface UpdateInfoChange {
  version: string;
  date: string;
  title: string;
  items: string[];
}

interface ApiDocsData {
  version: string;
  base_url: string;
  authentication: {
    method: string;
    header: string;
    description: string;
    note: string;
  };
  request_schema: Record<string, { type: string; required?: boolean; description: string; default?: string }>;
  response_schema: {
    success: { type: string; description: string };
    data: {
      type: string;
      description: string;
      properties: Record<string, unknown>;
    };
  };
  code_examples: Record<string, string>;
  ai_prompts?: {
    lengkap: string;
    ringkas: string;
    pdf_rendering: string;
  };
  update_info?: {
    version: string;
    changes: UpdateInfoChange[];
    migration?: {
      from: string;
      to: string;
      backward_compatible: boolean;
      notes?: string;
    };
  };
}

export default function PublicApiDocsPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [data, setData] = useState<ApiDocsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedPromptType, setSelectedPromptType] = useState<'lengkap' | 'ringkas' | 'pdf_rendering'>('lengkap');

  useEffect(() => {
    if (accessCode) {
      fetchApiDocs();
    }
  }, [accessCode]);

  const fetchApiDocs = async () => {
    try {
      const { data: responseData, error: fetchError } = await supabase.functions.invoke(
        "api-docs-public-view",
        {
          body: null,
          headers: {},
        }
      );

      // Use query params approach since invoke doesn't support query params well
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-docs-public-view?access_code=${accessCode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 410) {
          setError("expired");
          setExpiredAt(result.expired_at);
        } else {
          setError(result.error || "Link tidak valid");
        }
        return;
      }

      setData(result.data);
      setExpiredAt(result.expires_at);
      setViewCount(result.view_count);
    } catch (err) {
      console.error("Error fetching API docs:", err);
      setError("Terjadi kesalahan saat memuat dokumentasi");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Disalin ke clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold">Document API Documentation</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <div>
                  <h2 className="text-lg font-semibold text-amber-800">
                    {error === "expired" ? "Link Sudah Expired" : "Link Tidak Valid"}
                  </h2>
                  <p className="text-sm text-amber-700 mt-1">
                    {error === "expired"
                      ? `Link ini expired pada ${expiredAt ? format(new Date(expiredAt), "dd MMMM yyyy HH:mm", { locale: id }) : "waktu yang tidak diketahui"}`
                      : "Link yang Anda akses tidak valid atau sudah dihapus."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-sky-500 to-cyan-500 text-white py-3">
          <div className="container mx-auto px-4 text-center text-sm">
            Powered by Document API
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const responseProperties = data.response_schema.data.properties as Record<string, { type: string; description: string; fields?: Array<{ name: string; type: string; description: string }>; categories?: Array<{ name: string; count: number; examples: string[]; fields?: Array<{ name: string; type: string; description: string }> }> }>;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileCode className="h-6 w-6" />
                Document API Documentation
              </h1>
              <p className="text-sky-100 mt-1">v{data.version}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {viewCount} views
              </span>
              {expiredAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Valid hingga {format(new Date(expiredAt), "dd MMM yyyy HH:mm", { locale: id })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Base URL */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Base URL</p>
                <code className="text-lg font-mono bg-muted px-3 py-1 rounded">{data.base_url}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(data.base_url, "base_url")}
              >
                {copiedField === "base_url" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="auth" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Auth</span>
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Schema</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="gap-2">
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Code</span>
            </TabsTrigger>
            <TabsTrigger value="ai-prompt" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">AI Prompt</span>
            </TabsTrigger>
            <TabsTrigger value="release-notes" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Release</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Badge>POST</Badge>
                    <code className="ml-2 text-sm">{data.base_url}</code>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(data.request_schema).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-mono">{key}</TableCell>
                          <TableCell>{value.type}</TableCell>
                          <TableCell>
                            {value.required ? (
                              <Badge variant="destructive">Required</Badge>
                            ) : (
                              <Badge variant="secondary">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {value.description}
                            {value.default && (
                              <span className="text-muted-foreground"> (default: {value.default})</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Method</p>
                    <p className="font-semibold">{data.authentication.method}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Header</p>
                    <code className="font-mono bg-muted px-2 py-1 rounded">{data.authentication.header}</code>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p>{data.authentication.description}</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {data.authentication.note}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Response Schema Tab */}
          <TabsContent value="schema" className="space-y-4">
            {Object.entries(responseProperties).map(([key, value]) => (
              <Collapsible
                key={key}
                open={openSections[key]}
                onOpenChange={() => toggleSection(key)}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {openSections[key] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-mono font-semibold">{key}</span>
                          <Badge variant="outline">{value.type}</Badge>
                          {(key === 'line_items' || key === 'page_2_settings') && (
                            <Badge className="bg-emerald-500 text-white text-xs">NEW v1.2</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {value.fields?.length || value.categories?.length || 0} items
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground text-left mt-1">{value.description}</p>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      {value.fields && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Field</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {value.fields.map((field) => (
                              <TableRow key={field.name}>
                                <TableCell className="font-mono">
                                  {field.name}
                                  {(field.name === 'jumlah_lunas' || field.name === 'tanggal_lunas') && (
                                    <Badge className="ml-2 bg-emerald-500 text-white text-xs">NEW</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{field.type}</TableCell>
                                <TableCell>{field.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      {value.categories && (
                        <div className="space-y-2">
                          {value.categories.map((cat) => (
                            <Collapsible
                              key={cat.name}
                              open={openSections[`cat-${cat.name}`]}
                              onOpenChange={() => toggleSection(`cat-${cat.name}`)}
                            >
                              <CollapsibleTrigger className="w-full">
                                <div className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {openSections[`cat-${cat.name}`] ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                      <span className="font-medium">{cat.name}</span>
                                      {cat.name.includes('v1.4') && (
                                        <Badge className="bg-emerald-500 text-white text-xs">NEW</Badge>
                                      )}
                                    </div>
                                    <Badge variant="secondary">{cat.count} fields</Badge>
                                  </div>
                                  {!openSections[`cat-${cat.name}`] && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {cat.examples.map((ex) => (
                                        <code key={ex} className="text-xs bg-background px-1.5 py-0.5 rounded">
                                          {ex}
                                        </code>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Field</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {cat.fields?.map((field) => (
                                        <TableRow key={field.name}>
                                          <TableCell className="font-mono text-sm">{field.name}</TableCell>
                                          <TableCell className="text-sm">{field.type}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">{field.description}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </TabsContent>

          {/* Code Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            {Object.entries(data.code_examples).map(([lang, code]) => (
              <Card key={lang}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize">{lang}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code, lang)}
                    >
                      {copiedField === lang ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{code}</code>
                  </pre>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* AI Prompt Tab */}
          <TabsContent value="ai-prompt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  AI Prompt Generator
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pilih jenis prompt dan copy ke AI favorit Anda (ChatGPT, Claude, Gemini, dll) untuk membantu integrasi API.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt Type Selector */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedPromptType === 'lengkap' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPromptType('lengkap')}
                  >
                    📋 Prompt Lengkap
                  </Button>
                  <Button
                    variant={selectedPromptType === 'ringkas' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPromptType('ringkas')}
                  >
                    ⚡ Prompt Ringkas
                  </Button>
                  <Button
                    variant={selectedPromptType === 'pdf_rendering' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPromptType('pdf_rendering')}
                  >
                    📄 PDF Rendering
                  </Button>
                </div>

                {/* Prompt Content */}
                {data.ai_prompts && (
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      <code>{data.ai_prompts[selectedPromptType]}</code>
                    </pre>
                    <Button
                      className="absolute top-2 right-2"
                      size="sm"
                      onClick={() => data.ai_prompts && copyToClipboard(data.ai_prompts[selectedPromptType], `prompt_${selectedPromptType}`)}
                    >
                      {copiedField === `prompt_${selectedPromptType}` ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          Disalin!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Prompt
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Tips */}
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                  <h4 className="font-medium text-sky-800 mb-2">💡 Tips Penggunaan</h4>
                  <ul className="text-sm text-sky-700 space-y-1">
                    <li>• <strong>Prompt Lengkap:</strong> Berisi semua informasi API termasuk schema dan contoh kode</li>
                    <li>• <strong>Prompt Ringkas:</strong> Hanya informasi esensial untuk quick start</li>
                    <li>• <strong>PDF Rendering:</strong> Fokus pada data yang diperlukan untuk render PDF dokumen</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Release Notes Tab */}
          <TabsContent value="release-notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Release Notes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Riwayat perubahan dan update Document API
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.update_info?.changes?.map((change, index) => (
                  <div key={index} className="border-l-4 border-sky-500 pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{change.version}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{change.date}</span>
                      {index === 0 && (
                        <Badge className="bg-emerald-500 text-white text-xs">LATEST</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold mb-2">{change.title}</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {change.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Migration Info */}
                {data.update_info?.migration && (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                    <h4 className="font-medium text-sky-800 mb-2">🔄 Migration Info</h4>
                    <div className="text-sm text-sky-700 space-y-1">
                      <p><strong>From:</strong> {data.update_info.migration.from} → <strong>To:</strong> {data.update_info.migration.to}</p>
                      <p><strong>Backward Compatible:</strong> {data.update_info.migration.backward_compatible ? 'Ya ✅' : 'Tidak ❌'}</p>
                      {data.update_info.migration.notes && (
                        <p><strong>Notes:</strong> {data.update_info.migration.notes}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-sky-500 to-cyan-500 text-white py-3">
        <div className="container mx-auto px-4 text-center text-sm">
          Powered by Document API v{data.version}
        </div>
      </div>
    </div>
  );
}
