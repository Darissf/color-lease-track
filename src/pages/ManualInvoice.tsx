import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, RotateCcw, Download, Loader2 } from "lucide-react";
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
  stamp_text: "LUNAS",
  stamp_color: "#22c55e",
  show_footer: true,
  footer_text: "Terima kasih atas kepercayaan Anda",
  terms_text: "",
  custom_note: "",
  logo_url: "",
  custom_qr_codes: [],
  primary_color: "#0369a1",
  secondary_color: "#f0f9ff",
  border_color: "#e2e8f0",
};

const ManualInvoice = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();
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

  if (!isSuperAdmin) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-104px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/vip/settings/invoice")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Manual Invoice
              </h1>
              <p className="text-xs text-muted-foreground">
                Klik langsung pada teks untuk mengedit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Simpan
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Preview */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30">
          <div className="max-w-[210mm] mx-auto">
            <Card className="bg-white shadow-lg">
              <div
                ref={documentRef}
                className="p-8 min-h-[297mm]"
                style={{ backgroundColor: "white" }}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6 pb-4 border-b-2" style={{ borderColor: content.primary_color }}>
                  <div className="flex items-start gap-4">
                    {content.logo_url && (
                      <img src={content.logo_url} alt="Logo" className="h-16 object-contain" />
                    )}
                    <div>
                      <InlineEditableText
                        value={content.company_name}
                        onSave={(val) => updateField("company_name", val)}
                        className="text-xl font-bold block"
                        style={{ color: content.primary_color }}
                        as="h1"
                      />
                      <InlineEditableText
                        value={content.company_tagline}
                        onSave={(val) => updateField("company_tagline", val)}
                        className="text-sm text-muted-foreground"
                        placeholder="Tagline..."
                      />
                      <div className="mt-2 text-sm space-y-0.5">
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          <InlineEditableText
                            value={content.company_address}
                            onSave={(val) => updateField("company_address", val)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📞</span>
                          <InlineEditableText
                            value={content.company_phone}
                            onSave={(val) => updateField("company_phone", val)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span>✉️</span>
                          <InlineEditableText
                            value={content.company_email}
                            onSave={(val) => updateField("company_email", val)}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🌐</span>
                          <InlineEditableText
                            value={content.company_website}
                            onSave={(val) => updateField("company_website", val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <InlineEditableText
                      value={content.document_title}
                      onSave={(val) => updateField("document_title", val)}
                      className="text-2xl font-bold"
                      style={{ color: content.primary_color }}
                      as="h2"
                    />
                    <div className="mt-2 text-sm space-y-1">
                      <div>
                        No: <InlineEditableText
                          value={content.document_number}
                          onSave={(val) => updateField("document_number", val)}
                          className="font-medium"
                        />
                      </div>
                      <div>
                        Tanggal: <InlineEditableText
                          value={content.document_date}
                          onSave={(val) => updateField("document_date", val)}
                        />
                      </div>
                      {content.due_date && (
                        <div>
                          Jatuh Tempo: <InlineEditableText
                            value={content.due_date}
                            onSave={(val) => updateField("due_date", val)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: content.secondary_color }}>
                  <InlineEditableText
                    value={content.client_label}
                    onSave={(val) => updateField("client_label", val)}
                    className="text-sm text-muted-foreground"
                  />
                  <InlineEditableText
                    value={content.client_name}
                    onSave={(val) => updateField("client_name", val)}
                    className="text-lg font-semibold block"
                    as="div"
                  />
                  <InlineEditableText
                    value={content.client_address}
                    onSave={(val) => updateField("client_address", val)}
                    className="text-sm"
                    multiline
                  />
                </div>

                {/* Table */}
                <table className="w-full mb-6 border-collapse" style={{ borderColor: content.border_color }}>
                  <thead>
                    <tr style={{ backgroundColor: content.primary_color }}>
                      <th className="p-3 text-left text-white border" style={{ borderColor: content.border_color }}>
                        <InlineEditableText
                          value={content.table_header_description}
                          onSave={(val) => updateField("table_header_description", val)}
                          style={{ color: "white" }}
                        />
                      </th>
                      <th className="p-3 text-right text-white border w-40" style={{ borderColor: content.border_color }}>
                        <InlineEditableText
                          value={content.table_header_amount}
                          onSave={(val) => updateField("table_header_amount", val)}
                          style={{ color: "white" }}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border align-top" style={{ borderColor: content.border_color }}>
                        <InlineEditableText
                          value={content.description_text}
                          onSave={(val) => updateField("description_text", val)}
                          className="font-medium block"
                          as="div"
                        />
                        <InlineEditableText
                          value={content.description_details}
                          onSave={(val) => updateField("description_details", val)}
                          className="text-sm text-muted-foreground whitespace-pre-wrap"
                          multiline
                          placeholder="Detail keterangan..."
                        />
                      </td>
                      <td className="p-3 border text-right align-top" style={{ borderColor: content.border_color }}>
                        <InlineEditableNumber
                          value={content.amount_value}
                          onSave={(val) => updateField("amount_value", val)}
                          className="font-medium"
                        />
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: content.secondary_color }}>
                      <td className="p-3 border text-right font-bold" style={{ borderColor: content.border_color }}>
                        <InlineEditableText
                          value={content.total_label}
                          onSave={(val) => updateField("total_label", val)}
                        />
                      </td>
                      <td className="p-3 border text-right font-bold" style={{ borderColor: content.border_color, color: content.primary_color }}>
                        <InlineEditableNumber
                          value={content.amount_value}
                          onSave={(val) => updateField("amount_value", val)}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Terbilang */}
                <div className="mb-6 p-3 rounded-lg italic text-sm" style={{ backgroundColor: content.secondary_color }}>
                  <InlineEditableText
                    value={content.terbilang_label}
                    onSave={(val) => updateField("terbilang_label", val)}
                    className="font-medium"
                  />{" "}
                  <span className="font-semibold">{terbilang(content.amount_value)}</span>
                </div>

                {/* Payment Section */}
                {content.show_payment_section && (
                  <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: content.border_color, backgroundColor: `${content.primary_color}08` }}>
                    <InlineEditableText
                      value={content.payment_section_title}
                      onSave={(val) => updateField("payment_section_title", val)}
                      className="font-bold mb-3 block"
                      style={{ color: content.primary_color }}
                      as="h3"
                    />
                    <div className="flex gap-4">
                      {content.show_payment_qr && content.payment_qr_link && (
                        <div className="flex-shrink-0">
                          <QRCode value={content.payment_qr_link} size={80} />
                        </div>
                      )}
                      <div className="flex-1 text-sm space-y-2">
                        <InlineEditableText
                          value={content.payment_instruction}
                          onSave={(val) => updateField("payment_instruction", val)}
                          className="text-muted-foreground"
                          multiline
                        />
                        <div className="font-medium">
                          <InlineEditableText
                            value={content.bank_name}
                            onSave={(val) => updateField("bank_name", val)}
                          />
                        </div>
                        <div>
                          No. Rek: <InlineEditableText
                            value={content.bank_account_number}
                            onSave={(val) => updateField("bank_account_number", val)}
                            className="font-medium"
                          />
                        </div>
                        <div>
                          a.n <InlineEditableText
                            value={content.bank_account_name}
                            onSave={(val) => updateField("bank_account_name", val)}
                            className="font-medium"
                          />
                        </div>
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Signature & Stamp */}
                <div className="flex justify-end items-end relative mt-8">
                  {content.show_stamp && (
                    <div
                      className="absolute right-40 top-0 px-4 py-2 border-4 rounded-lg font-bold text-xl transform rotate-[-15deg] opacity-80"
                      style={{
                        borderColor: content.stamp_color,
                        color: content.stamp_color,
                      }}
                    >
                      {content.stamp_text}
                    </div>
                  )}
                  
                  {content.show_signature && (
                    <div className="text-center">
                      <InlineEditableText
                        value={content.signature_label}
                        onSave={(val) => updateField("signature_label", val)}
                        className="text-sm"
                      />
                      <div className="h-16 flex items-center justify-center my-2">
                        {content.signature_image_url ? (
                          <img src={content.signature_image_url} alt="Signature" className="max-h-16" />
                        ) : (
                          <div className="text-muted-foreground text-sm">[Tanda Tangan]</div>
                        )}
                      </div>
                      <InlineEditableText
                        value={content.signer_name}
                        onSave={(val) => updateField("signer_name", val)}
                        className="font-semibold block"
                        as="div"
                      />
                      <InlineEditableText
                        value={content.signer_title}
                        onSave={(val) => updateField("signer_title", val)}
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                  )}
                </div>

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

                {/* Footer */}
                {content.show_footer && (
                  <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground" style={{ borderColor: content.border_color }}>
                    <InlineEditableText
                      value={content.footer_text}
                      onSave={(val) => updateField("footer_text", val)}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-background shrink-0">
          <ManualDocumentSidebar
            content={content}
            onUpdate={updateField}
            documentType="invoice"
          />
        </div>
      </div>
    </div>
  );
};

export default ManualInvoice;
