import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Code, Key, FileJson, Terminal, ChevronDown, ChevronRight, Database, Eye, EyeOff, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ApiDocsPublicLinkManager } from "@/components/api-docs/ApiDocsPublicLinkManager";

const InvoiceApiDocs = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  // API Key state
  const [apiKeyData, setApiKeyData] = useState<{
    has_key: boolean;
    api_key: {
      id: string;
      key_preview: string;
      created_at: string;
      last_used_at: string | null;
    } | null;
  } | null>(null);
  const [fullApiKey, setFullApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchApiKey();
  }, [isSuperAdmin]);

  const fetchApiKey = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('manage-api-key', {
        method: 'GET',
      });

      if (response.data?.success) {
        setApiKeyData(response.data);
      }
    } catch (error) {
      console.error("Error fetching API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      setIsGenerating(true);
      const response = await supabase.functions.invoke('manage-api-key', {
        method: 'POST',
      });

      if (response.data?.success) {
        setFullApiKey(response.data.api_key.full_key);
        setShowApiKey(true);
        toast.success("API Key berhasil dibuat! Simpan key ini - hanya ditampilkan sekali!");
        fetchApiKey();
      } else {
        toast.error(response.data?.error || "Gagal membuat API key");
      }
    } catch (error) {
      console.error("Error generating API key:", error);
      toast.error("Gagal membuat API key");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateApiKey = async () => {
    try {
      setIsRegenerating(true);
      const response = await supabase.functions.invoke('manage-api-key', {
        method: 'PUT',
      });

      if (response.data?.success) {
        setFullApiKey(response.data.api_key.full_key);
        setShowApiKey(true);
        toast.success("API Key berhasil di-regenerate! Simpan key baru ini!");
        fetchApiKey();
      } else {
        toast.error(response.data?.error || "Gagal regenerate API key");
      }
    } catch (error) {
      console.error("Error regenerating API key:", error);
      toast.error("Gagal regenerate API key");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const baseUrl = "https://uqzzpxfmwhmhiqniiyjk.supabase.co/functions/v1/document-api";

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Disalin ke clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={() => copyToClipboard(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  const requestExample = `{
  "access_code": "CTR-ABC12345",
  "document_type": "invoice",
  "payment_id": "uuid-optional-for-kwitansi"
}`;

  const responseExample = `{
  "success": true,
  "document_type": "invoice",
  "verification_code": "A1B2C3D4",
  "access_code": "CTR-ABC12345",
  
  "contract": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "invoice": "INV-2024-001",
    "keterangan": "Sewa Scaffolding Proyek A",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "tanggal": "2024-01-15",
    "tagihan": 50000000,
    "tagihan_belum_bayar": 0,
    "jumlah_lunas": 50000000,
    "tanggal_lunas": "2024-01-20",
    "tanggal_bayar_terakhir": "2024-01-20",
    "status": "lunas"
  },
  
  "client": {
    "nama": "PT Contoh Indonesia",
    "nomor_telepon": "08123456789"
  },
  
  "payment": {
    "id": "uuid",
    "payment_date": "2024-01-20",
    "amount": 50000000,
    "payment_number": 1,
    "notes": "Pembayaran lunas"
  },
  
  "bank_info": {
    "bank_name": "Bank BCA",
    "account_number": "1234567890",
    "account_holder_name": "PT Company"
  },
  
  "template_settings": {
    "company_name": "PT Company Indonesia",
    "...": "150+ properties"
  },
  
  "custom_text_elements": [...],
  
  "generated_at": "2024-01-20T10:30:00Z",
  "api_version": "1.0"
}`;

  // Schema documentation data
  const schemaCategories = [
    {
      name: "Company Info",
      fields: [
        { name: "company_name", type: "string", description: "Nama perusahaan" },
        { name: "company_address", type: "string", description: "Alamat perusahaan" },
        { name: "company_phone", type: "string", description: "Nomor telepon" },
        { name: "company_email", type: "string", description: "Email perusahaan" },
        { name: "company_website", type: "string", description: "Website perusahaan" },
        { name: "company_npwp", type: "string", description: "Nomor NPWP" },
        { name: "company_tagline", type: "string", description: "Tagline/slogan" },
        { name: "owner_name", type: "string", description: "Nama pemilik" },
      ]
    },
    {
      name: "Images & URLs",
      fields: [
        { name: "invoice_logo_url", type: "string", description: "URL logo invoice" },
        { name: "signature_url", type: "string", description: "URL tanda tangan" },
        { name: "signature_image_url", type: "string", description: "URL gambar tanda tangan" },
        { name: "custom_stamp_url", type: "string", description: "URL stempel custom" },
        { name: "bank_logo_url", type: "string", description: "URL logo bank" },
        { name: "icon_email_url", type: "string", description: "URL ikon email" },
        { name: "icon_website_url", type: "string", description: "URL ikon website" },
        { name: "icon_maps_url", type: "string", description: "URL ikon maps" },
        { name: "icon_whatsapp_url", type: "string", description: "URL ikon WhatsApp" },
      ]
    },
    {
      name: "Typography",
      fields: [
        { name: "font_family", type: "string", description: "Font utama" },
        { name: "heading_font_family", type: "string", description: "Font heading" },
        { name: "font_size_base", type: "number", description: "Ukuran font dasar (px)" },
      ]
    },
    {
      name: "Colors",
      fields: [
        { name: "header_color_primary", type: "string", description: "Warna primer header" },
        { name: "header_color_secondary", type: "string", description: "Warna sekunder header" },
        { name: "accent_color", type: "string", description: "Warna aksen" },
        { name: "border_color", type: "string", description: "Warna border" },
        { name: "company_name_color", type: "string", description: "Warna nama perusahaan" },
        { name: "company_info_color", type: "string", description: "Warna info perusahaan" },
        { name: "document_title_color", type: "string", description: "Warna judul dokumen" },
        { name: "label_color", type: "string", description: "Warna label" },
        { name: "value_color", type: "string", description: "Warna nilai" },
        { name: "tagline_color", type: "string", description: "Warna tagline" },
      ]
    },
    {
      name: "Table Settings",
      fields: [
        { name: "table_header_bg", type: "string", description: "Warna background header tabel" },
        { name: "table_header_text_color", type: "string", description: "Warna teks header tabel" },
        { name: "table_border_style", type: "string", description: "Style border tabel" },
        { name: "table_alternating_rows", type: "boolean", description: "Aktifkan baris bergantian" },
        { name: "table_alternating_color", type: "string", description: "Warna baris bergantian" },
      ]
    },
    {
      name: "Layout Settings (JSONB)",
      fields: [
        { name: "invoice_layout_settings", type: "object", description: "Posisi elemen di invoice" },
        { name: "receipt_layout_settings", type: "object", description: "Posisi elemen di kwitansi" },
        { name: "logo_position_x/y", type: "number", description: "Posisi logo (0-100)" },
        { name: "logo_scale", type: "number", description: "Skala logo (0.1-2.0)" },
        { name: "signature_position_x/y", type: "number", description: "Posisi tanda tangan" },
        { name: "stamp_position_x/y", type: "number", description: "Posisi stempel" },
        { name: "qr_verification_position_x/y", type: "number", description: "Posisi QR verifikasi" },
        { name: "watermark_position_x/y", type: "number", description: "Posisi watermark" },
      ]
    },
    {
      name: "Signature Text Styling",
      fields: [
        { name: "signature_label", type: "string", description: "Label tanda tangan (e.g., 'Hormat Kami,')" },
        { name: "signer_name", type: "string", description: "Nama penandatangan" },
        { name: "signer_title", type: "string", description: "Jabatan penandatangan" },
        { name: "signature_label_font_size", type: "number", description: "Ukuran font label" },
        { name: "signature_label_color", type: "string", description: "Warna label" },
        { name: "signature_label_font_weight", type: "string", description: "Tebal font label" },
        { name: "signer_name_font_size", type: "number", description: "Ukuran font nama" },
        { name: "signer_name_font_weight", type: "string", description: "Tebal font nama" },
        { name: "signer_title_font_size", type: "number", description: "Ukuran font jabatan" },
      ]
    },
    {
      name: "Stamp Settings",
      fields: [
        { name: "stamp_type", type: "string", description: "'auto', 'custom', atau 'none'" },
        { name: "stamp_text", type: "string", description: "Teks stempel" },
        { name: "stamp_color_lunas", type: "string", description: "Warna stempel LUNAS" },
        { name: "stamp_color_belum_lunas", type: "string", description: "Warna stempel BELUM LUNAS" },
        { name: "stamp_rotation", type: "number", description: "Rotasi stempel (derajat)" },
        { name: "stamp_opacity", type: "number", description: "Opacity stempel (0-100)" },
        { name: "stamp_scale", type: "number", description: "Skala stempel" },
        { name: "stamp_border_width", type: "number", description: "Lebar border stempel" },
        { name: "stamp_border_style", type: "string", description: "Style border stempel" },
      ]
    },
    {
      name: "Watermark Settings",
      fields: [
        { name: "watermark_type", type: "string", description: "'text' atau 'image'" },
        { name: "watermark_text", type: "string", description: "Teks watermark" },
        { name: "watermark_opacity", type: "number", description: "Opacity watermark (0-100)" },
        { name: "watermark_rotation", type: "number", description: "Rotasi watermark (derajat)" },
        { name: "watermark_size", type: "number", description: "Ukuran watermark" },
      ]
    },
    {
      name: "Visibility Flags",
      fields: [
        { name: "show_company_name", type: "boolean", description: "Tampilkan nama perusahaan" },
        { name: "show_company_address", type: "boolean", description: "Tampilkan alamat" },
        { name: "show_company_phone", type: "boolean", description: "Tampilkan telepon" },
        { name: "show_company_email", type: "boolean", description: "Tampilkan email" },
        { name: "show_company_website", type: "boolean", description: "Tampilkan website" },
        { name: "show_signature", type: "boolean", description: "Tampilkan tanda tangan" },
        { name: "show_stamp", type: "boolean", description: "Tampilkan stempel" },
        { name: "show_stamp_on_invoice", type: "boolean", description: "Stempel di invoice" },
        { name: "show_stamp_on_receipt", type: "boolean", description: "Stempel di kwitansi" },
        { name: "show_watermark", type: "boolean", description: "Tampilkan watermark" },
        { name: "show_qr_code", type: "boolean", description: "Tampilkan QR code" },
        { name: "show_bank_info", type: "boolean", description: "Tampilkan info bank" },
        { name: "show_terbilang", type: "boolean", description: "Tampilkan terbilang" },
        { name: "show_terms", type: "boolean", description: "Tampilkan syarat & ketentuan" },
        { name: "show_footer", type: "boolean", description: "Tampilkan footer" },
      ]
    },
    {
      name: "Labels & Content",
      fields: [
        { name: "label_client", type: "string", description: "Label klien (e.g., 'Kepada Yth:')" },
        { name: "label_description", type: "string", description: "Label keterangan" },
        { name: "label_amount", type: "string", description: "Label jumlah" },
        { name: "label_total", type: "string", description: "Label total" },
        { name: "label_terbilang", type: "string", description: "Label terbilang" },
        { name: "document_title", type: "string", description: "Judul invoice" },
        { name: "receipt_title", type: "string", description: "Judul kwitansi" },
        { name: "terms_conditions", type: "string", description: "Syarat & ketentuan" },
        { name: "footer_text", type: "string", description: "Teks footer" },
        { name: "custom_note", type: "string", description: "Catatan khusus" },
      ]
    },
    {
      name: "Numbering & Counters",
      fields: [
        { name: "invoice_prefix", type: "string", description: "Prefix nomor invoice" },
        { name: "receipt_prefix", type: "string", description: "Prefix nomor kwitansi" },
        { name: "number_format", type: "string", description: "Format penomoran" },
        { name: "counter_invoice", type: "number", description: "Counter invoice" },
        { name: "counter_receipt", type: "number", description: "Counter kwitansi" },
        { name: "default_due_days", type: "number", description: "Default hari jatuh tempo" },
      ]
    },
  ];

  const jsExample = `const response = await fetch(
  '${baseUrl}',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      access_code: 'ABC123',
      document_type: 'invoice'
    })
  }
);

const data = await response.json();
console.log(data);`;

  const phpExample = `<?php
$apiUrl = '${baseUrl}';
$apiKey = 'YOUR_API_KEY';

$data = [
  'access_code' => 'ABC123',
  'document_type' => 'invoice'
];

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Content-Type: application/json',
  'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);`;

  const pythonExample = `import requests

url = '${baseUrl}'
headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
}
payload = {
    'access_code': 'ABC123',
    'document_type': 'invoice'
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print(data)`;

  const curlExample = `curl -X POST '${baseUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_API_KEY' \\
  -d '{
    "access_code": "ABC123",
    "document_type": "invoice"
  }'`;

  const goExample = `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    url := "${baseUrl}"
    
    payload := map[string]string{
        "access_code":   "ABC123",
        "document_type": "invoice",
    }
    jsonPayload, _ := json.Marshal(payload)
    
    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    
    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;

  const axiosExample = `const axios = require('axios');

const response = await axios.post(
  '${baseUrl}',
  {
    access_code: 'ABC123',
    document_type: 'invoice'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY'
    }
  }
);

console.log(response.data);`;

  const displayApiKey = fullApiKey || (apiKeyData?.api_key?.key_preview ?? '');

  return (
    <div className="h-[calc(100vh-104px)] relative overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/invoice")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 w-full min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent break-words">
              Document API Documentation
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              API untuk integrasi dengan aplikasi eksternal
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4">
        {/* API Key Management Card */}
        <Card className="mb-4 p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">API Key</h3>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </p>
                ) : apiKeyData?.has_key ? (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Connected
                    {apiKeyData.api_key?.last_used_at && (
                      <span className="text-muted-foreground ml-2">
                        • Last used: {new Date(apiKeyData.api_key.last_used_at).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    ⚠ Not configured
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {isLoading ? (
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
              ) : apiKeyData?.has_key ? (
                <>
                  <div className="flex items-center gap-1 bg-muted px-3 py-2 rounded-md flex-1 sm:flex-initial">
                    <code className="text-sm font-mono">
                      {showApiKey && fullApiKey ? fullApiKey : displayApiKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-1"
                      onClick={() => setShowApiKey(!showApiKey)}
                      disabled={!fullApiKey}
                    >
                      {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(fullApiKey || displayApiKey, 'apiKey')}
                    >
                      {copiedField === 'apiKey' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isRegenerating}>
                        {isRegenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Regenerate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Regenerate API Key?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          API key lama akan dinonaktifkan dan tidak bisa digunakan lagi. 
                          Pastikan untuk menyimpan API key baru setelah di-regenerate.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={regenerateApiKey}>
                          Ya, Regenerate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Button onClick={generateApiKey} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Generate API Key
                </Button>
              )}
            </div>
          </div>

          {/* Warning message when new key is generated */}
          {fullApiKey && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Simpan API Key ini sekarang! Key hanya ditampilkan sekali.
              </p>
            </div>
          )}
        </Card>

        {/* Public Link Manager */}
        <ApiDocsPublicLinkManager />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-2">
              <FileJson className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="auth" className="gap-2">
              <Key className="h-4 w-4" />
              Authentication
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-2">
              <Code className="h-4 w-4" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-2">
              <Database className="h-4 w-4" />
              Response Schema
            </TabsTrigger>
            <TabsTrigger value="examples" className="gap-2">
              <Terminal className="h-4 w-4" />
              Code Examples
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-3">Document Data API</h2>
              <p className="text-muted-foreground mb-4">
                API ini menyediakan data lengkap untuk generate dokumen (Invoice/Kwitansi) 
                di aplikasi eksternal Anda. Semua data template, layout, dan informasi 
                perusahaan akan dikirimkan dalam format JSON.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Base URL</label>
                  <div className="flex items-center gap-2 mt-1 bg-muted rounded-md p-3">
                    <code className="text-sm flex-1 break-all">{baseUrl}</code>
                    <CopyButton text={baseUrl} field="baseUrl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Method</label>
                    <div className="bg-muted rounded-md p-3 mt-1">
                      <code className="text-sm">POST</code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Content-Type</label>
                    <div className="bg-muted rounded-md p-3 mt-1">
                      <code className="text-sm">application/json</code>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Fitur API</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Data kontrak lengkap (nomor, tanggal, keterangan, tagihan)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Informasi klien (nama, telepon)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Detail pembayaran untuk kwitansi</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Semua template settings (150+ properti)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Layout settings untuk posisi elemen</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>URL gambar langsung (logo, signature, stamp)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Custom text elements</span>
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Authentication Tab */}
          <TabsContent value="auth" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-3">API Key Authentication</h2>
              <p className="text-muted-foreground mb-4">
                Semua request harus menyertakan header <code className="bg-muted px-1 rounded">x-api-key</code> dengan API key yang valid.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Header Format</label>
                  <div className="flex items-center gap-2 mt-1 bg-muted rounded-md p-3">
                    <code className="text-sm flex-1">x-api-key: YOUR_API_KEY</code>
                    <CopyButton text="x-api-key: YOUR_API_KEY" field="header" />
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4">
                  <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-2">⚠️ Keamanan</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Jangan ekspos API key di frontend/client-side code</li>
                    <li>• Simpan API key di environment variables</li>
                    <li>• Gunakan HTTPS untuk semua request</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Error Responses</h3>
              <div className="space-y-3">
                <div className="bg-muted rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-red-500 text-white px-2 py-0.5 rounded">401</span>
                    <span className="text-sm font-medium">Unauthorized</span>
                  </div>
                  <code className="text-xs text-muted-foreground">{"{ \"error\": \"Invalid API key\" }"}</code>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-red-500 text-white px-2 py-0.5 rounded">404</span>
                    <span className="text-sm font-medium">Not Found</span>
                  </div>
                  <code className="text-xs text-muted-foreground">{"{ \"error\": \"Contract not found\" }"}</code>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-red-500 text-white px-2 py-0.5 rounded">400</span>
                    <span className="text-sm font-medium">Bad Request</span>
                  </div>
                  <code className="text-xs text-muted-foreground">{"{ \"error\": \"Missing required fields\" }"}</code>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium bg-green-500 text-white px-2 py-0.5 rounded">POST</span>
                <code className="text-sm font-medium">/document-api</code>
              </div>
              
              <p className="text-muted-foreground mb-4">
                Mengambil semua data yang diperlukan untuk generate dokumen Invoice atau Kwitansi.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Request Body</h4>
                  <div className="relative">
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                      <code>{requestExample}</code>
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={requestExample} field="request" />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p><code className="bg-muted px-1 rounded">access_code</code> - Kode akses kontrak (required)</p>
                    <p><code className="bg-muted px-1 rounded">document_type</code> - "invoice" atau "kwitansi" (required)</p>
                    <p><code className="bg-muted px-1 rounded">payment_id</code> - ID pembayaran untuk kwitansi spesifik (optional)</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Response</h4>
                  <div className="relative">
                    <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-96">
                      <code>{responseExample}</code>
                    </pre>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={responseExample} field="response" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Response Schema Tab */}
          <TabsContent value="schema" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold mb-3">Response Schema</h2>
              <p className="text-muted-foreground mb-4">
                Dokumentasi lengkap untuk semua field dalam <code className="bg-muted px-1 rounded">template_settings</code>.
                Total 150+ properti tersedia.
              </p>
            </Card>

            {schemaCategories.map((category) => (
              <Collapsible
                key={category.name}
                open={openSections[category.name]}
                onOpenChange={() => toggleSection(category.name)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {category.fields.length} fields
                      </span>
                    </div>
                    {openSections[category.name] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">Field</TableHead>
                            <TableHead className="w-[100px]">Type</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.fields.map((field) => (
                            <TableRow key={field.name}>
                              <TableCell className="font-mono text-sm">{field.name}</TableCell>
                              <TableCell>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  field.type === 'string' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                  field.type === 'number' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                  field.type === 'boolean' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                  'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {field.type}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{field.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </TabsContent>

          {/* Code Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">JavaScript / TypeScript (Fetch)</h3>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                  <code>{jsExample}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={jsExample} field="js" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Node.js (Axios)</h3>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                  <code>{axiosExample}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={axiosExample} field="axios" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Go (Golang)</h3>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                  <code>{goExample}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={goExample} field="go" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">PHP</h3>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                  <code>{phpExample}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={phpExample} field="php" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Python</h3>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                  <code>{pythonExample}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={pythonExample} field="python" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">cURL</h3>
              <div className="relative">
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                  <code>{curlExample}</code>
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={curlExample} field="curl" />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InvoiceApiDocs;
