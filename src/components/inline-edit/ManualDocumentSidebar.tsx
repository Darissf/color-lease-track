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
  Settings2,
  Droplets,
} from "lucide-react";
import CustomQRManager, { CustomQR } from "./CustomQRManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const { user } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const bankLogoInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    file: File,
    type: "logo" | "signature" | "bank_logo"
  ) => {
    if (!user) {
      toast.error("User not authenticated");
      return;
    }
    
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      // Use user.id as folder to comply with RLS policy
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-images")
        .getPublicUrl(filePath);

      const keyMap = {
        logo: "logo_url",
        signature: "signature_image_url",
        bank_logo: "bank_logo_url"
      };
      
      onUpdate(keyMap[type], publicUrl);
      toast.success(`${type === "logo" ? "Logo" : type === "signature" ? "Tanda tangan" : "Logo bank"} berhasil diupload`);
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

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Header Primer</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={content.header_color_primary || "#0369a1"}
                    onChange={(e) => onUpdate("header_color_primary", e.target.value)}
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={content.header_color_primary || "#0369a1"}
                    onChange={(e) => onUpdate("header_color_primary", e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Header Sekunder</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={content.header_color_secondary || "#0ea5e9"}
                    onChange={(e) => onUpdate("header_color_secondary", e.target.value)}
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={content.header_color_secondary || "#0ea5e9"}
                    onChange={(e) => onUpdate("header_color_secondary", e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Header Style Section */}
          <AccordionItem value="header" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Header Style</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tampilkan Header Stripe</Label>
                <Switch
                  checked={content.show_header_stripe ?? true}
                  onCheckedChange={(checked) => onUpdate("show_header_stripe", checked)}
                />
              </div>

              {content.show_header_stripe && (
                <div className="space-y-2">
                  <Label className="text-xs">Tinggi Stripe ({content.header_stripe_height || 12}px)</Label>
                  <Slider
                    value={[content.header_stripe_height || 12]}
                    onValueChange={([val]) => onUpdate("header_stripe_height", val)}
                    min={4}
                    max={24}
                    step={1}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Watermark Section */}
          <AccordionItem value="watermark" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Watermark</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tampilkan Watermark</Label>
                <Switch
                  checked={content.show_watermark ?? false}
                  onCheckedChange={(checked) => onUpdate("show_watermark", checked)}
                />
              </div>

              {content.show_watermark && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipe Watermark</Label>
                    <Select
                      value={content.watermark_type || "text"}
                      onValueChange={(val) => onUpdate("watermark_type", val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="logo">Logo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {content.watermark_type === "text" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Teks Watermark</Label>
                      <Input
                        value={content.watermark_text || "DRAFT"}
                        onChange={(e) => onUpdate("watermark_text", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs">Opacity ({content.watermark_opacity || 10}%)</Label>
                    <Slider
                      value={[content.watermark_opacity || 10]}
                      onValueChange={([val]) => onUpdate("watermark_opacity", val)}
                      min={5}
                      max={50}
                      step={1}
                    />
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* QR Verification Section */}
          <AccordionItem value="verification-qr" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">QR Verifikasi</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Tampilkan QR Verifikasi</Label>
                <Switch
                  checked={content.show_verification_qr ?? true}
                  onCheckedChange={(checked) => onUpdate("show_verification_qr", checked)}
                />
              </div>

              {content.show_verification_qr && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Link Verifikasi</Label>
                    <Input
                      value={content.verification_qr_link || ""}
                      onChange={(e) => onUpdate("verification_qr_link", e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Posisi QR</Label>
                    <Select
                      value={content.qr_position || "bottom-section"}
                      onValueChange={(val) => onUpdate("qr_position", val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-section">Bottom Section</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Ukuran QR ({content.qr_size || 80}px)</Label>
                    <Slider
                      value={[content.qr_size || 80]}
                      onValueChange={([val]) => onUpdate("qr_size", val)}
                      min={50}
                      max={120}
                      step={5}
                    />
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Bank Logo Section - Invoice Only */}
          {documentType === "invoice" && (
            <AccordionItem value="bank-logo" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Logo Bank</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {content.bank_logo_url ? (
                  <div className="space-y-2">
                    <img
                      src={content.bank_logo_url}
                      alt="Bank Logo"
                      className="max-h-12 object-contain border rounded p-2"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate("bank_logo_url", "")}
                      className="gap-1 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={bankLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "bank_logo");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => bankLogoInputRef.current?.click()}
                      className="gap-2 w-full"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Logo Bank
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </ScrollArea>
  );
};

export default ManualDocumentSidebar;
