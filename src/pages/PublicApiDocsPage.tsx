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
  Send
} from "lucide-react";

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

  const responseProperties = data.response_schema.data.properties as Record<string, { type: string; description: string; fields?: Array<{ name: string; type: string; description: string }>; categories?: Array<{ name: string; count: number; examples: string[] }> }>;

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="auth" className="gap-2">
              <Key className="h-4 w-4" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-2">
              <Database className="h-4 w-4" />
              Response Schema
            </TabsTrigger>
            <TabsTrigger value="examples" className="gap-2">
              <Code className="h-4 w-4" />
              Code Examples
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
                                <TableCell className="font-mono">{field.name}</TableCell>
                                <TableCell>{field.type}</TableCell>
                                <TableCell>{field.description}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      {value.categories && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {value.categories.map((cat) => (
                            <div key={cat.name} className="p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{cat.name}</span>
                                <Badge variant="secondary">{cat.count} fields</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {cat.examples.map((ex) => (
                                  <code key={ex} className="text-xs bg-background px-1.5 py-0.5 rounded">
                                    {ex}
                                  </code>
                                ))}
                              </div>
                            </div>
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
