import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  QrCode, 
  Image as ImageIcon, 
  Palette, 
  FileSignature,
  Stamp,
  Upload,
  Trash2,
  CreditCard,
} from "lucide-react";
import CustomQRManager, { CustomQR } from "./CustomQRManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualDocumentSidebarProps {
  content: any;
  onUpdate: (key: string, value: any) => void;
  documentType: "invoice" | "receipt";
}

const ManualDocumentSidebar: React.FC<ManualDocumentSidebarProps> = ({
  content,
  onUpdate,
  documentType,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    type: "logo" | "signature"
  ) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}_${crypto.randomUUID()}.${fileExt}`;
      const filePath = `manual-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-images")
        .getPublicUrl(filePath);

      const key = type === "logo" ? "logo_url" : "signature_image_url";
      onUpdate(key, publicUrl);
      toast.success(`${type === "logo" ? "Logo" : "Tanda tangan"} berhasil diupload`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal upload file");
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="p-4 space-y-4">
        <Accordion type="multiple" defaultValue={["payment", "qr", "logo", "signature"]} className="space-y-2">
          
          {/* Payment Section - Invoice Only */}
          {documentType === "invoice" && (
            <AccordionItem value="payment" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Pembayaran</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Tampilkan Seksi Pembayaran</Label>
                  <Switch
                    checked={content.show_payment_section ?? true}
                    onCheckedChange={(checked) => onUpdate("show_payment_section", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Link QR Pembayaran</Label>
                  <Input
                    value={content.payment_qr_link || ""}
                    onChange={(e) => onUpdate("payment_qr_link", e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">Tampilkan QR Pembayaran</Label>
                  <Switch
                    checked={content.show_payment_qr ?? true}
                    onCheckedChange={(checked) => onUpdate("show_payment_qr", checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-xs">Nama Bank</Label>
                  <Input
                    value={content.bank_name || ""}
                    onChange={(e) => onUpdate("bank_name", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nomor Rekening</Label>
                  <Input
                    value={content.bank_account_number || ""}
                    onChange={(e) => onUpdate("bank_account_number", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nama Pemilik Rekening</Label>
                  <Input
                    value={content.bank_account_name || ""}
                    onChange={(e) => onUpdate("bank_account_name", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nomor WhatsApp Konfirmasi</Label>
                  <Input
                    value={content.wa_number || ""}
                    onChange={(e) => onUpdate("wa_number", e.target.value)}
                    placeholder="+6281234567890"
                    className="h-8 text-sm"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* QR Code Section */}
          <AccordionItem value="qr" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Custom QR Codes</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <CustomQRManager
                qrCodes={(content.custom_qr_codes as CustomQR[]) || []}
                onChange={(qrCodes) => onUpdate("custom_qr_codes", qrCodes)}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Logo Section */}
          <AccordionItem value="logo" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Logo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {content.logo_url ? (
                <div className="space-y-2">
                  <img
                    src={content.logo_url}
                    alt="Logo"
                    className="max-h-16 object-contain border rounded p-2"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate("logo_url", "")}
                    className="gap-1 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Logo
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "logo");
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    className="gap-2 w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Signature Section */}
          <AccordionItem value="signature" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Tanda Tangan</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tampilkan Tanda Tangan</Label>
                <Switch
                  checked={content.show_signature ?? true}
                  onCheckedChange={(checked) => onUpdate("show_signature", checked)}
                />
              </div>

              {content.signature_image_url ? (
                <div className="space-y-2">
                  <img
                    src={content.signature_image_url}
                    alt="Signature"
                    className="max-h-16 object-contain border rounded p-2"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdate("signature_image_url", "")}
                    className="gap-1 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus TTD
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "signature");
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signatureInputRef.current?.click()}
                    className="gap-2 w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Tanda Tangan
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Stamp Section */}
          <AccordionItem value="stamp" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Stamp className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Stempel</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tampilkan Stempel</Label>
                <Switch
                  checked={content.show_stamp ?? false}
                  onCheckedChange={(checked) => onUpdate("show_stamp", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Teks Stempel</Label>
                <Input
                  value={content.stamp_text || "LUNAS"}
                  onChange={(e) => onUpdate("stamp_text", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Warna Stempel</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={content.stamp_color || "#22c55e"}
                    onChange={(e) => onUpdate("stamp_color", e.target.value)}
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={content.stamp_color || "#22c55e"}
                    onChange={(e) => onUpdate("stamp_color", e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Colors Section */}
          <AccordionItem value="colors" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Warna</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Warna Primer</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={content.primary_color || "#0369a1"}
                    onChange={(e) => onUpdate("primary_color", e.target.value)}
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={content.primary_color || "#0369a1"}
                    onChange={(e) => onUpdate("primary_color", e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Warna Sekunder</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={content.secondary_color || "#f0f9ff"}
                    onChange={(e) => onUpdate("secondary_color", e.target.value)}
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={content.secondary_color || "#f0f9ff"}
                    onChange={(e) => onUpdate("secondary_color", e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Warna Border</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={content.border_color || "#e2e8f0"}
                    onChange={(e) => onUpdate("border_color", e.target.value)}
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={content.border_color || "#e2e8f0"}
                    onChange={(e) => onUpdate("border_color", e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
};

export default ManualDocumentSidebar;
