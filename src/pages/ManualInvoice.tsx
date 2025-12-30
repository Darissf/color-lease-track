import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, RotateCcw, Download, Loader2, MapPin, Phone, Mail, Globe, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { terbilang } from "@/lib/terbilang";
import InlineEditableText from "@/components/inline-edit/InlineEditableText";
import InlineEditableNumber from "@/components/inline-edit/InlineEditableNumber";
import ManualDocumentSidebar from "@/components/inline-edit/ManualDocumentSidebar";
import { CustomQR } from "@/components/inline-edit/CustomQRManager";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DocumentWrapper } from "@/components/documents/DocumentWrapper";

interface ManualInvoiceContent {
  id?: string;
  user_id?: string;
  company_name: string;
  company_tagline: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_npwp: string;
  document_title: string;
  document_number: string;
  document_date: string;
  due_date: string;
  client_label: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  table_header_description: string;
  table_header_amount: string;
  description_text: string;
  description_details: string;
  amount_value: number;
  total_label: string;
  terbilang_label: string;
  show_payment_section: boolean;
  payment_section_title: string;
  payment_instruction: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  wa_confirmation_text: string;
  wa_number: string;
  payment_qr_link: string;
  show_payment_qr: boolean;
  show_signature: boolean;
  signature_label: string;
  signer_name: string;
  signer_title: string;
  signature_image_url: string;
  show_stamp: boolean;
  stamp_text: string;
  stamp_color: string;
  show_footer: boolean;
  footer_text: string;
  terms_text: string;
  custom_note: string;
  logo_url: string;
  custom_qr_codes: CustomQR[];
  primary_color: string;
  secondary_color: string;
  border_color: string;
  // New template-matching fields
  header_color_primary: string;
  header_color_secondary: string;
  show_header_stripe: boolean;
  header_stripe_height: number;
  icon_maps_url: string;
  icon_whatsapp_url: string;
  icon_email_url: string;
  icon_website_url: string;
  bank_logo_url: string;
  show_watermark: boolean;
  watermark_text: string;
  watermark_opacity: number;
  watermark_type: string;
  verification_qr_link: string;
  qr_position: string;
  qr_size: number;
  show_verification_qr: boolean;
  stamp_position_x: number;
  stamp_position_y: number;
  stamp_rotation: number;
  stamp_scale: number;
  stamp_opacity: number;
  signature_position: string;
  show_terbilang: boolean;
  company_info_color: string;
  table_header_bg: string;
  table_header_text_color: string;
  font_family: string;
  heading_font_family: string;
  font_size_base: number;
}

const defaultContent: ManualInvoiceContent = {
  company_name: "Nama Perusahaan",
  company_tagline: "Tagline Perusahaan",
  company_address: "Alamat Perusahaan",
  company_phone: "08123456789",
  company_email: "email@company.com",
  company_website: "www.company.com",
  company_npwp: "",
  document_title: "INVOICE",
  document_number: "INV-2025-0001",
  document_date: new Date().toLocaleDateString("id-ID"),
  due_date: "",
  client_label: "Kepada Yth:",
  client_name: "Nama Klien",
  client_address: "Alamat Klien",
  client_phone: "",
  table_header_description: "Keterangan",
  table_header_amount: "Jumlah",
  description_text: "Deskripsi layanan/produk",
  description_details: "",
  amount_value: 0,
  total_label: "Total",
  terbilang_label: "Terbilang:",
  show_payment_section: true,
  payment_section_title: "Pembayaran Transfer",
  payment_instruction: "Silahkan scan barcode atau transfer ke rekening berikut:",
  bank_name: "Bank BCA",
  bank_account_number: "7445130885",
  bank_account_name: "Daris Farostian",
  wa_confirmation_text: "Konfirmasi WA:",
  wa_number: "+6289666666632",
  payment_qr_link: "",
  show_payment_qr: true,
  show_signature: true,
  signature_label: "Hormat Kami,",
  signer_name: "Nama Penandatangan",
  signer_title: "Jabatan",
  signature_image_url: "",
  show_stamp: false,
  stamp_text: "BELUM LUNAS",
  stamp_color: "#ef4444",
  show_footer: true,
  footer_text: "Terima kasih atas kepercayaan Anda",
  terms_text: "",
  custom_note: "",
  logo_url: "",
  custom_qr_codes: [],
  primary_color: "#0369a1",
  secondary_color: "#f0f9ff",
  border_color: "#e2e8f0",
  // New template-matching defaults
  header_color_primary: "#0369a1",
  header_color_secondary: "#0ea5e9",
  show_header_stripe: true,
  header_stripe_height: 12,
  icon_maps_url: "",
  icon_whatsapp_url: "",
  icon_email_url: "",
  icon_website_url: "",
  bank_logo_url: "",
  show_watermark: false,
  watermark_text: "DRAFT",
  watermark_opacity: 10,
  watermark_type: "text",
  verification_qr_link: "",
  qr_position: "bottom-section",
  qr_size: 80,
  show_verification_qr: true,
  stamp_position_x: 10,
  stamp_position_y: 70,
  stamp_rotation: -15,
  stamp_scale: 1,
  stamp_opacity: 80,
  signature_position: "right",
  show_terbilang: true,
  company_info_color: "#4b5563",
  table_header_bg: "#f3f4f6",
  table_header_text_color: "#374151",
  font_family: "default",
  heading_font_family: "default",
  font_size_base: 14,
};

const ManualInvoice = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [content, setContent] = useState<ManualInvoiceContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
      return;
    }
    fetchContent();
  }, [isSuperAdmin]);

  const fetchContent = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("manual_invoice_content")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setContent({
          ...defaultContent,
          ...data,
          custom_qr_codes: (data.custom_qr_codes as unknown as CustomQR[]) || [],
        });
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = async (key: string, value: any) => {
    const newContent = { ...content, [key]: value };
    setContent(newContent);

    // Auto-save to database
    if (!user) return;

    try {
      const { error } = await supabase
        .from("manual_invoice_content")
        .upsert({
          user_id: user.id,
          ...newContent,
          custom_qr_codes: newContent.custom_qr_codes as unknown as Record<string, unknown>[],
        } as any, {
          onConflict: "user_id",
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("manual_invoice_content")
        .upsert({
          user_id: user.id,
          ...content,
          custom_qr_codes: content.custom_qr_codes as unknown as Record<string, unknown>[],
        } as any, {
          onConflict: "user_id",
        });

      if (error) throw error;
      toast.success("Berhasil disimpan!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setContent(defaultContent);
    toast.info("Reset ke default");
  };

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;

    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${content.document_number || "invoice"}.pdf`);
      toast.success("PDF berhasil diunduh!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal generate PDF");
    }
  };

  const getQRPosition = () => {
    switch (content.qr_position) {
      case "top-right": return "absolute top-8 right-8";
      case "bottom-right": return "absolute bottom-8 right-8";
      case "bottom-left": return "absolute bottom-8 left-8";
      default: return "";
    }
  };

  if (!isSuperAdmin) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-104px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const verificationUrl = content.verification_qr_link || `https://sewascaffoldingbali.com/verify/${content.document_number}`;

  return (
    <div className="h-[calc(100vh-104px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-2 sm:px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/invoice")} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                Manual Invoice
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Klik langsung pada teks untuk mengedit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile: Settings Sheet Trigger */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Pengaturan Invoice</SheetTitle>
                  </SheetHeader>
                  <div className="h-[calc(100vh-60px)]">
                    <ManualDocumentSidebar
                      content={content}
                      onUpdate={updateField}
                      documentType="invoice"
                    />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Simpan</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Preview */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 bg-muted/30">
          <DocumentWrapper>
            <Card className="bg-white shadow-lg">
              <div
                ref={documentRef}
                className="p-8 min-h-[297mm] relative overflow-hidden"
                style={{ 
                  backgroundColor: "white",
                  fontSize: `${content.font_size_base || 14}px`
                }}
              >
                {/* Watermark */}
                {content.show_watermark && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                    style={{ opacity: (content.watermark_opacity || 10) / 100 }}
                  >
                    {content.watermark_type === 'logo' && content.logo_url ? (
                      <img 
                        src={content.logo_url} 
                        alt="" 
                        className="w-96 h-96 object-contain transform rotate-[-15deg]" 
                      />
                    ) : (
                      <span className="text-9xl font-bold text-gray-300 transform rotate-[-45deg] whitespace-nowrap">
                        {content.watermark_text || 'DRAFT'}
                      </span>
                    )}
                  </div>
                )}

                {/* Content wrapper */}
                <div className="relative z-10">
                  {/* Header Stripe Bar */}
                  {content.show_header_stripe && (
                    <div
                      className="-mx-8 -mt-8 mb-6"
                      style={{ 
                        height: `${content.header_stripe_height || 12}px`,
                        background: `linear-gradient(to right, ${content.header_color_primary}, ${content.header_color_secondary})` 
                      }}
                    />
                  )}

                  {/* Header */}
                  <div 
                    className="flex items-start justify-between pb-4 mb-6 border-b-2"
                    style={{ borderColor: content.border_color }}
                  >
                    <div className="flex items-start gap-4">
                      {content.logo_url ? (
                        <img 
                          src={content.logo_url} 
                          alt="Company Logo" 
                          className="h-20 w-20 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          Logo
                        </div>
                      )}
                      <div>
                        <InlineEditableText
                          value={content.company_name}
                          onSave={(val) => updateField("company_name", val)}
                          className="text-2xl font-bold tracking-wide block"
                          style={{ color: content.header_color_primary }}
                          as="h1"
                        />
                        <InlineEditableText
                          value={content.company_tagline}
                          onSave={(val) => updateField("company_tagline", val)}
                          className="text-sm italic"
                          style={{ color: '#6b7280' }}
                          placeholder="Tagline..."
                        />
                        <div className="mt-2 text-sm space-y-1">
                          <div className="flex items-center gap-1" style={{ color: content.company_info_color }}>
                            {content.icon_maps_url ? (
                              <img src={content.icon_maps_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                            ) : (
                              <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: content.header_color_primary }} />
                            )}
                            <InlineEditableText
                              value={content.company_address}
                              onSave={(val) => updateField("company_address", val)}
                            />
                          </div>
                          <div className="flex items-center gap-1" style={{ color: content.company_info_color }}>
                            {content.icon_whatsapp_url ? (
                              <img src={content.icon_whatsapp_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                            ) : (
                              <Phone className="h-3 w-3 flex-shrink-0 text-green-500" />
                            )}
                            <InlineEditableText
                              value={content.company_phone}
                              onSave={(val) => updateField("company_phone", val)}
                            />
                          </div>
                          <div className="flex items-center gap-1" style={{ color: content.company_info_color }}>
                            {content.icon_email_url ? (
                              <img src={content.icon_email_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                            ) : (
                              <Mail className="h-3 w-3 flex-shrink-0" style={{ color: content.header_color_primary }} />
                            )}
                            <InlineEditableText
                              value={content.company_email}
                              onSave={(val) => updateField("company_email", val)}
                            />
                          </div>
                          <div className="flex items-center gap-1" style={{ color: content.company_info_color }}>
                            {content.icon_website_url ? (
                              <img src={content.icon_website_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                            ) : (
                              <Globe className="h-3 w-3 flex-shrink-0" style={{ color: content.header_color_primary }} />
                            )}
                            <InlineEditableText
                              value={content.company_website}
                              onSave={(val) => updateField("company_website", val)}
                            />
                          </div>
                          {content.company_npwp && (
                            <div style={{ color: content.company_info_color }}>
                              NPWP: <InlineEditableText
                                value={content.company_npwp}
                                onSave={(val) => updateField("company_npwp", val)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Document Type & Number */}
                    <div className="text-right">
                      <InlineEditableText
                        value={content.document_title}
                        onSave={(val) => updateField("document_title", val)}
                        className="text-xl font-bold mb-2"
                        style={{ color: content.header_color_primary }}
                        as="h2"
                      />
                      <div 
                        className="px-4 py-1 inline-block border-2"
                        style={{ borderColor: content.header_color_primary }}
                      >
                        <span className="text-sm text-gray-500">NO.</span>
                        <InlineEditableText
                          value={content.document_number}
                          onSave={(val) => updateField("document_number", val)}
                          className="text-lg font-bold ml-2"
                        />
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        <InlineEditableText
                          value={content.document_date}
                          onSave={(val) => updateField("document_date", val)}
                        />
                      </div>
                      {content.due_date && (
                        <div className="text-sm text-gray-500">
                          Jatuh Tempo: <InlineEditableText
                            value={content.due_date}
                            onSave={(val) => updateField("due_date", val)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <InlineEditableText
                      value={content.client_label}
                      onSave={(val) => updateField("client_label", val)}
                      className="text-sm mb-1"
                      style={{ color: '#6b7280' }}
                    />
                    <InlineEditableText
                      value={content.client_name}
                      onSave={(val) => updateField("client_name", val)}
                      className="font-semibold text-lg block"
                      as="div"
                    />
                    <InlineEditableText
                      value={content.client_address}
                      onSave={(val) => updateField("client_address", val)}
                      className="text-sm"
                      style={{ color: content.company_info_color }}
                      multiline
                    />
                  </div>

                  {/* Invoice Details Table */}
                  <div className="mb-8">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr style={{ 
                          backgroundColor: content.table_header_bg,
                          color: content.table_header_text_color
                        }}>
                          <th 
                            className="px-4 py-2 text-left border"
                            style={{ borderColor: content.border_color }}
                          >
                            <InlineEditableText
                              value={content.table_header_description}
                              onSave={(val) => updateField("table_header_description", val)}
                            />
                          </th>
                          <th 
                            className="px-4 py-2 text-right w-48 border"
                            style={{ borderColor: content.border_color }}
                          >
                            <InlineEditableText
                              value={content.table_header_amount}
                              onSave={(val) => updateField("table_header_amount", val)}
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td 
                            className="px-4 py-3 border"
                            style={{ borderColor: content.border_color }}
                          >
                            <InlineEditableText
                              value={content.description_text}
                              onSave={(val) => updateField("description_text", val)}
                              className="font-medium block"
                              as="div"
                            />
                            <InlineEditableText
                              value={content.description_details}
                              onSave={(val) => updateField("description_details", val)}
                              className="text-sm text-gray-500 whitespace-pre-wrap"
                              multiline
                              placeholder="Detail keterangan..."
                            />
                          </td>
                          <td 
                            className="px-4 py-3 text-right font-semibold border"
                            style={{ borderColor: content.border_color }}
                          >
                            <InlineEditableNumber
                              value={content.amount_value}
                              onSave={(val) => updateField("amount_value", val)}
                            />
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr style={{ backgroundColor: `${content.primary_color}15` }}>
                          <td 
                            className="px-4 py-3 text-right font-bold border"
                            style={{ borderColor: content.border_color }}
                          >
                            <InlineEditableText
                              value={content.total_label}
                              onSave={(val) => updateField("total_label", val)}
                            />
                          </td>
                          <td 
                            className="px-4 py-3 text-right font-bold text-lg border"
                            style={{ borderColor: content.border_color }}
                          >
                            <InlineEditableNumber
                              value={content.amount_value}
                              onSave={(val) => updateField("amount_value", val)}
                            />
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Terbilang */}
                    {content.show_terbilang && (
                      <p className="mt-2 text-sm italic text-gray-600">
                        <InlineEditableText
                          value={content.terbilang_label}
                          onSave={(val) => updateField("terbilang_label", val)}
                          className="font-medium"
                        />{" "}
                        <span className="font-medium">{terbilang(content.amount_value)}</span>
                      </p>
                    )}
                  </div>

                  {/* Payment Section */}
                  {content.show_payment_section && (
                    <div 
                      className="mb-6 p-4 rounded-lg"
                      style={{ 
                        backgroundColor: `${content.primary_color}08`,
                        border: `1px solid ${content.border_color}` 
                      }}
                    >
                      <InlineEditableText
                        value={content.payment_section_title}
                        onSave={(val) => updateField("payment_section_title", val)}
                        className="text-sm font-semibold mb-2 block"
                        style={{ color: content.header_color_primary }}
                        as="h3"
                      />
                      <div className="flex items-center gap-3">
                        {content.bank_logo_url && (
                          <img src={content.bank_logo_url} alt="" className="h-10 object-contain" />
                        )}
                        {content.show_payment_qr && content.payment_qr_link && (
                          <div className="flex-shrink-0">
                            <QRCode value={content.payment_qr_link} size={80} />
                          </div>
                        )}
                        <div className="flex-1 text-sm space-y-1">
                          <InlineEditableText
                            value={content.payment_instruction}
                            onSave={(val) => updateField("payment_instruction", val)}
                            className="text-gray-600"
                            multiline
                          />
                          <p className="font-medium">
                            <InlineEditableText
                              value={content.bank_name}
                              onSave={(val) => updateField("bank_name", val)}
                            />
                          </p>
                          <p className="font-mono">
                            <InlineEditableText
                              value={content.bank_account_number}
                              onSave={(val) => updateField("bank_account_number", val)}
                            />
                          </p>
                          <p className="text-gray-600">
                            a/n <InlineEditableText
                              value={content.bank_account_name}
                              onSave={(val) => updateField("bank_account_name", val)}
                            />
                          </p>
                          {content.wa_number && (
                            <div>
                              <InlineEditableText
                                value={content.wa_confirmation_text}
                                onSave={(val) => updateField("wa_confirmation_text", val)}
                              />{" "}
                              <a
                                href={`https://wa.me/${content.wa_number.replace(/\D/g, "")}`}
                                className="text-primary underline"
                              >
                                <InlineEditableText
                                  value={content.wa_number}
                                  onSave={(val) => updateField("wa_number", val)}
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Signature Section */}
                  {content.show_signature && (
                    <div className={`flex items-end mb-8 ${content.signature_position === 'left' ? 'justify-start' : 'justify-end'}`}>
                      <div className="text-center">
                        <InlineEditableText
                          value={content.signature_label}
                          onSave={(val) => updateField("signature_label", val)}
                          className="text-sm text-gray-600 mb-2"
                        />
                        {content.signature_image_url ? (
                          <img 
                            src={content.signature_image_url} 
                            alt="Signature" 
                            className="h-16 w-auto mx-auto object-contain"
                          />
                        ) : (
                          <div className="h-16 w-32 border-b border-gray-400" />
                        )}
                        <InlineEditableText
                          value={content.signer_name}
                          onSave={(val) => updateField("signer_name", val)}
                          className="font-semibold mt-2 block"
                          as="div"
                        />
                        <InlineEditableText
                          value={content.signer_title}
                          onSave={(val) => updateField("signer_title", val)}
                          className="text-sm text-gray-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Free-positioned Stamp */}
                  {content.show_stamp && (
                    <div 
                      className="absolute pointer-events-none"
                      style={{
                        left: `${content.stamp_position_x}%`,
                        top: `${content.stamp_position_y}%`,
                        transform: `translate(-50%, -50%) rotate(${content.stamp_rotation}deg) scale(${content.stamp_scale})`,
                        opacity: (content.stamp_opacity || 80) / 100
                      }}
                    >
                      <div 
                        className="px-6 py-3 border-4 rounded-lg font-bold text-2xl"
                        style={{
                          borderColor: content.stamp_color,
                          color: content.stamp_color,
                        }}
                      >
                        {content.stamp_text}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  {content.show_footer && (
                    <div className="text-center text-sm text-gray-500 mb-4">
                      <InlineEditableText
                        value={content.footer_text}
                        onSave={(val) => updateField("footer_text", val)}
                      />
                    </div>
                  )}

                  {/* QR Verification - Bottom Section */}
                  {content.show_verification_qr && content.qr_position === 'bottom-section' && (
                    <div className="border-t-2 border-gray-200 pt-4 mt-4">
                      <div className="flex items-center gap-4">
                        <QRCode value={verificationUrl} size={content.qr_size || 80} />
                        <div className="text-sm">
                          <p className="text-gray-500">Scan untuk verifikasi dokumen</p>
                          <p className="font-mono text-xs text-gray-400 mt-1">
                            Kode: {content.document_number}
                          </p>
                          <p className="text-xs text-blue-600 break-all">{verificationUrl}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Positioned QR Code */}
                  {content.show_verification_qr && content.qr_position !== 'bottom-section' && (
                    <div className={getQRPosition()}>
                      <QRCode value={verificationUrl} size={content.qr_size || 80} />
                    </div>
                  )}

                  {/* Custom QR Codes */}
                  {content.custom_qr_codes?.map((qr) => (
                    qr.url && (
                      <div
                        key={qr.id}
                        className="absolute"
                        style={{
                          left: `${qr.position_x}%`,
                          top: `${qr.position_y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div className="text-center">
                          <QRCode value={qr.url} size={qr.size} />
                          <p className="text-xs mt-1">{qr.label}</p>
                        </div>
                      </div>
                    )
                  ))}
              </div>
            </Card>
          </DocumentWrapper>
        </div>

        {/* Sidebar - Desktop only */}
        {!isMobile && (
          <div className="w-80 border-l bg-background shrink-0">
            <ManualDocumentSidebar
              content={content}
              onUpdate={updateField}
              documentType="invoice"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualInvoice;
