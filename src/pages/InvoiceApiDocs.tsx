import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Check, Code, Key, FileJson, Terminal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const InvoiceApiDocs = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
  }, [isSuperAdmin]);

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
  "access_code": "ABC123",
  "document_type": "invoice",
  "payment_id": "uuid-optional"
}`;

  const responseExample = `{
  "success": true,
  "document_type": "invoice",
  "verification_code": "VRF-2024-001234",
  
  "contract": {
    "id": "uuid",
    "invoice": "INV-2024-001",
    "keterangan": "Sewa Gedung Lantai 5",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "tanggal": "2024-01-15",
    "tagihan": 50000000,
    "tagihan_belum_bayar": 0
  },
  
  "client": {
    "nama": "PT Contoh Indonesia",
    "nomor_telepon": "08123456789"
  },
  
  "payment": {
    "id": "uuid",
    "payment_date": "2024-01-20",
    "amount": 50000000,
    "payment_method": "Transfer Bank",
    "notes": "Pembayaran lunas"
  },
  
  "bank_info": {
    "bank_name": "Bank BCA",
    "account_number": "1234567890",
    "account_holder_name": "PT Company"
  },
  
  "template_settings": {
    "company_name": "PT Company Indonesia",
    "company_address": "Jl. Sudirman No. 123",
    "company_phone": "021-12345678",
    "company_email": "info@company.com",
    "invoice_logo_url": "https://storage.../logo.png",
    "signature_url": "https://storage.../signature.png",
    "font_family": "Inter",
    "header_color_primary": "#1a365d",
    "invoice_layout_settings": { "..." : "..." },
    "receipt_layout_settings": { "..." : "..." },
    "...": "100+ properties"
  },
  
  "custom_text_elements": [],
  
  "generated_at": "2024-01-20T10:30:00Z",
  "api_version": "1.0"
}`;

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
                  <span>Semua template settings (100+ properti)</span>
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

          {/* Code Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">JavaScript / TypeScript</h3>
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
