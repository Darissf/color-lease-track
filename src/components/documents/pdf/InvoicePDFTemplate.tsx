import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TemplateSettings, defaultSettings } from "@/components/template-settings/types";
import { CustomTextElement } from "@/components/custom-text/types";

// Use built-in Helvetica font (no remote fetch = no Buffer error)
// react-pdf has these fonts built-in: Courier, Helvetica, Times-Roman
// We avoid remote font registration which causes "Buffer is not defined" in browser

// Prevent hyphenation issues that can cause render failures
Font.registerHyphenationCallback((word) => [word]);

// A4 dimensions in points (72 points = 1 inch, A4 = 210mm x 297mm)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  headerStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 15,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#bfdbfe",
  },
  headerLeft: {
    flexDirection: "row",
    gap: 15,
    alignItems: "flex-start",
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  companyInfo: {
    gap: 2,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginBottom: 3,
  },
  tagline: {
    fontSize: 8,
    fontStyle: "italic",
    color: "#6b7280",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8,
    color: "#4b5563",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  documentTitle: {
    fontSize: 14,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginBottom: 8,
  },
  documentNumberBox: {
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  documentNumberLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  documentNumber: {
    fontSize: 12,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  documentDate: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 6,
  },
  clientSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  clientLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 3,
  },
  clientName: {
    fontSize: 12,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 9,
    color: "#4b5563",
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
  },
  tableHeaderCell: {
    padding: 8,
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#374151",
  },
  tableHeaderCellDesc: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  tableHeaderCellAmount: {
    width: 120,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    padding: 10,
    fontSize: 9,
  },
  tableCellDesc: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  tableCellAmount: {
    width: 120,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  tableFooter: {
    flexDirection: "row",
  },
  tableFooterLabelCell: {
    flex: 1,
    padding: 10,
    textAlign: "right",
    fontFamily: "Helvetica",
    fontWeight: 700,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  tableFooterAmountCell: {
    width: 120,
    padding: 10,
    textAlign: "right",
    fontFamily: "Helvetica",
    fontWeight: 700,
    fontSize: 11,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  terbilang: {
    fontSize: 8,
    fontStyle: "italic",
    color: "#4b5563",
    marginTop: 6,
  },
  paymentSection: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  paymentTitle: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginBottom: 8,
  },
  paymentContent: {
    flexDirection: "row",
    gap: 15,
  },
  qrCode: {
    width: 60,
    height: 60,
  },
  paymentDetails: {
    flex: 1,
    fontSize: 8,
  },
  paymentInstruction: {
    color: "#4b5563",
    marginBottom: 8,
  },
  bankInfo: {
    marginTop: 6,
  },
  bankName: {
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  termsSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginBottom: 4,
  },
  termsText: {
    fontSize: 7,
    color: "#4b5563",
  },
  customNote: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#fefce8",
    borderWidth: 1,
    borderColor: "#fde047",
    borderRadius: 4,
  },
  customNoteText: {
    fontSize: 7,
    color: "#854d0e",
  },
  signatureSection: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  signatureBox: {
    minWidth: 150,
    alignItems: "center",
  },
  signatureLabel: {
    fontSize: 8,
    color: "#4b5563",
    marginBottom: 40,
  },
  signerName: {
    fontSize: 10,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  signerTitle: {
    fontSize: 8,
    color: "#6b7280",
  },
  footer: {
    textAlign: "center",
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 15,
  },
  // Absolute positioned elements
  watermark: {
    position: "absolute",
    opacity: 0.1,
  },
  stamp: {
    position: "absolute",
  },
  stampImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
  signatureImage: {
    position: "absolute",
    width: 100,
    height: 50,
    objectFit: "contain",
  },
  qrVerification: {
    position: "absolute",
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  qrVerificationQR: {
    width: 50,
    height: 50,
  },
  qrVerificationText: {
    fontSize: 7,
    color: "#6b7280",
  },
  qrVerificationCode: {
    fontSize: 6,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#9ca3af",
    marginTop: 2,
  },
  qrVerificationUrl: {
    fontSize: 5,
    color: "#2563eb",
    marginTop: 2,
    maxWidth: 100,
  },
  // Page 2: Rincian Tagihan Styles
  page2Title: {
    fontSize: 14,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginBottom: 5,
    textAlign: "center",
  },
  page2Subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 20,
    textAlign: "center",
  },
  rincianTable: {
    marginBottom: 15,
  },
  rincianTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
  },
  rincianTableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#374151",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  rincianTableRow: {
    flexDirection: "row",
  },
  rincianTableCell: {
    padding: 6,
    fontSize: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  rincianSectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    fontWeight: 700,
    marginTop: 15,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  rincianSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  rincianSummaryLabel: {
    fontSize: 9,
    color: "#4b5563",
  },
  rincianSummaryValue: {
    fontSize: 9,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  rincianTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f3f4f6",
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#374151",
  },
  rincianTotalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  rincianTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
});

interface LineItem {
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  subtotal?: number;
  unit_mode?: string | null;
}

export interface InvoicePDFTemplateProps {
  documentNumber: string;
  verificationCode: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  description: string;
  amount: number;
  contractInvoice?: string;
  period?: string;
  settings?: TemplateSettings;
  contractBankInfo?: {
    bank_name: string;
    account_number: string;
    account_holder_name?: string;
  };
  accessCode?: string;
  qrCodeDataUrl?: string; // Pre-generated QR code as data URL
  verificationQrDataUrl?: string; // Pre-generated verification QR
  customTextElements?: CustomTextElement[];
  // Page 2: Rincian Tagihan
  lineItems?: LineItem[];
  transportDelivery?: number;
  transportPickup?: number;
  discount?: number;
}

// Helper function to format currency
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function for terbilang
const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function terbilangHelper(n: number): string {
  n = Math.floor(n);
  if (n < 12) return satuan[n];
  if (n < 20) return satuan[n - 10] + " Belas";
  if (n < 100) {
    const satu = Math.floor(n / 10);
    const sisa = n % 10;
    return satuan[satu] + " Puluh" + (sisa > 0 ? " " + satuan[sisa] : "");
  }
  if (n < 200) return "Seratus" + (n > 100 ? " " + terbilangHelper(n - 100) : "");
  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return satuan[ratus] + " Ratus" + (sisa > 0 ? " " + terbilangHelper(sisa) : "");
  }
  if (n < 2000) return "Seribu" + (n > 1000 ? " " + terbilangHelper(n - 1000) : "");
  if (n < 1000000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    return terbilangHelper(ribu) + " Ribu" + (sisa > 0 ? " " + terbilangHelper(sisa) : "");
  }
  if (n < 1000000000) {
    const juta = Math.floor(n / 1000000);
    const sisa = n % 1000000;
    return terbilangHelper(juta) + " Juta" + (sisa > 0 ? " " + terbilangHelper(sisa) : "");
  }
  if (n < 1000000000000) {
    const miliar = Math.floor(n / 1000000000);
    const sisa = n % 1000000000;
    return terbilangHelper(miliar) + " Miliar" + (sisa > 0 ? " " + terbilangHelper(sisa) : "");
  }
  return "";
}

function terbilang(amount: number): string {
  if (amount === 0) return "Nol Rupiah";
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  const text = terbilangHelper(absoluteAmount);
  return (isNegative ? "Minus " : "") + text.trim() + " Rupiah";
}

export const InvoicePDFTemplate = ({
  documentNumber,
  verificationCode,
  issuedAt,
  clientName,
  clientAddress,
  description,
  amount,
  contractInvoice,
  period,
  settings: propSettings,
  contractBankInfo,
  accessCode,
  qrCodeDataUrl,
  verificationQrDataUrl,
  customTextElements = [],
  lineItems = [],
  transportDelivery = 0,
  transportPickup = 0,
  discount = 0,
}: InvoicePDFTemplateProps) => {
  // Debug logging
  console.log("=== InvoicePDFTemplate Debug ===");
  console.log("lineItems received:", lineItems);
  console.log("lineItems.length:", lineItems?.length);
  console.log("transportDelivery:", transportDelivery);
  console.log("transportPickup:", transportPickup);
  console.log("discount:", discount);
  
  const settings = { ...defaultSettings, ...propSettings };
  const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });
  const verificationUrl = `https://sewascaffoldingbali.com/verify/${verificationCode}`;
  const layoutSettings = settings.invoice_layout_settings;

  // Calculate subtotals for Page 2
  const subtotalSewa = lineItems.reduce((sum, item) => {
    const subtotal = item.subtotal || (item.quantity * item.unit_price_per_day * item.duration_days);
    return sum + subtotal;
  }, 0);
  const totalTransport = (transportDelivery || 0) + (transportPickup || 0);
  const grandTotal = subtotalSewa + totalTransport - (discount || 0);
  const showPage2 = lineItems.length > 0;
  
  console.log("showPage2:", showPage2);
  console.log("subtotalSewa:", subtotalSewa);
  console.log("grandTotal:", grandTotal);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Stripe */}
        {settings.show_header_stripe && (
          <View
            style={[
              styles.headerStripe,
              {
                height: settings.header_stripe_height || 12,
                backgroundColor: settings.header_color_primary,
              },
            ]}
          />
        )}

        {/* Content starts after stripe */}
        <View style={{ paddingTop: settings.show_header_stripe ? 15 : 0 }}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: settings.border_color }]}>
            <View style={styles.headerLeft}>
              {/* Logo */}
              {settings.invoice_logo_url ? (
                <Image src={settings.invoice_logo_url} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={{ fontSize: 6, color: "#9ca3af" }}>Logo</Text>
                </View>
              )}

              {/* Company Info */}
              <View style={styles.companyInfo}>
                {settings.show_company_name !== false && (
                  <Text
                    style={[
                      styles.companyName,
                      { color: settings.company_name_color || settings.header_color_primary },
                    ]}
                  >
                    {settings.company_name || "Perusahaan"}
                  </Text>
                )}

                {settings.show_company_tagline && settings.company_tagline && (
                  <Text style={[styles.tagline, { color: settings.tagline_color || "#6b7280" }]}>
                    {settings.company_tagline}
                  </Text>
                )}

                {settings.show_company_address !== false && settings.company_address && (
                  <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                    {settings.company_address}
                  </Text>
                )}

                {settings.show_company_phone !== false && settings.company_phone && (
                  <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                    Tel: {settings.company_phone}
                  </Text>
                )}

                {settings.show_company_email !== false && settings.company_email && (
                  <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                    Email: {settings.company_email}
                  </Text>
                )}

                {settings.show_company_website !== false && settings.company_website && (
                  <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                    Web: {settings.company_website}
                  </Text>
                )}

                {settings.show_npwp && settings.company_npwp && (
                  <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                    NPWP: {settings.company_npwp}
                  </Text>
                )}
              </View>
            </View>

            {/* Document Type & Number */}
            <View style={styles.headerRight}>
              {settings.show_document_number !== false && (
                <>
                  <Text
                    style={[
                      styles.documentTitle,
                      { color: settings.document_title_color || settings.header_color_primary },
                    ]}
                  >
                    {settings.document_title || "INVOICE"}
                  </Text>
                  <View style={[styles.documentNumberBox, { borderColor: settings.header_color_primary }]}>
                    <Text style={styles.documentNumberLabel}>NO.</Text>
                    <Text style={styles.documentNumber}>{documentNumber}</Text>
                  </View>
                </>
              )}
              {settings.show_document_date !== false && (
                <Text style={styles.documentDate}>{formattedDate}</Text>
              )}
            </View>
          </View>

          {/* Client Info */}
          {settings.show_client_info !== false && (
            <View style={styles.clientSection}>
              <Text style={[styles.clientLabel, { color: settings.label_color || "#6b7280" }]}>
                Kepada:
              </Text>
              <Text style={[styles.clientName, { color: settings.value_color || "#1f2937" }]}>
                {clientName}
              </Text>
              {clientAddress && (
                <Text style={[styles.clientAddress, { color: settings.company_info_color || "#4b5563" }]}>
                  {clientAddress}
                </Text>
              )}
            </View>
          )}

          {/* Table */}
          <View style={styles.table}>
            {settings.show_table_header !== false && (
              <View style={[styles.tableHeader, { backgroundColor: settings.table_header_bg || "#f3f4f6" }]}>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.tableHeaderCellDesc,
                    { color: settings.table_header_text_color || "#374151", borderColor: settings.border_color },
                  ]}
                >
                  {settings.label_description || "Keterangan"}
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.tableHeaderCellAmount,
                    { color: settings.table_header_text_color || "#374151", borderColor: settings.border_color },
                  ]}
                >
                  {settings.label_amount || "Jumlah"}
                </Text>
              </View>
            )}

            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.tableCellDesc, { borderColor: settings.border_color }]}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontWeight: 700 }}>{description}</Text>
                {period && (
                  <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 3 }}>Periode: {period}</Text>
                )}
                <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>
                  Rincian spesifikasi item mengacu pada Lampiran Halaman 2
                </Text>
              </View>
              <Text style={[styles.tableCell, styles.tableCellAmount, { borderColor: settings.border_color }]}>
                {formatRupiah(amount)}
              </Text>
            </View>

            <View style={[styles.tableFooter, { backgroundColor: `${settings.accent_color}15` }]}>
              <Text style={[styles.tableFooterLabelCell, { borderColor: settings.border_color }]}>
                Total
              </Text>
              <Text style={[styles.tableFooterAmountCell, { borderColor: settings.border_color }]}>
                {formatRupiah(amount)}
              </Text>
            </View>

            {settings.show_terbilang && (
              <Text style={styles.terbilang}>
                {settings.label_terbilang || "Terbilang:"} {terbilang(amount)}
              </Text>
            )}
          </View>

          {/* Payment Transfer Section */}
          {settings.show_payment_section !== false && (
            <View style={[styles.paymentSection, { borderColor: settings.border_color }]}>
              <Text style={[styles.paymentTitle, { color: settings.header_color_primary }]}>
                Pembayaran Transfer
              </Text>
              <View style={styles.paymentContent}>
                {settings.payment_qr_enabled !== false && qrCodeDataUrl && (
                  <View>
                    <Image src={qrCodeDataUrl} style={styles.qrCode} />
                    <Text style={{ fontSize: 6, color: "#6b7280", textAlign: "center", marginTop: 3 }}>
                      {accessCode ? "Scan untuk pembayaran" : "Scan untuk verifikasi"}
                    </Text>
                  </View>
                )}
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentInstruction}>
                    {settings.payment_instruction_text ||
                      "Silahkan scan barcode ini atau buka link untuk pengecekan pembayaran otomatis. Apabila transfer manual, silahkan transfer ke rekening berikut dan konfirmasi via WhatsApp."}
                  </Text>
                  <View style={styles.bankInfo}>
                    <Text style={styles.bankName}>
                      Bank {contractBankInfo?.bank_name || settings.bank_name || "BCA"}
                    </Text>
                    <Text>No. Rek: {contractBankInfo?.account_number || settings.bank_account_number}</Text>
                    <Text>a.n {contractBankInfo?.account_holder_name || settings.bank_account_name}</Text>
                  </View>
                  {settings.payment_wa_hyperlink_enabled !== false && settings.payment_wa_number && (
                    <Text style={{ marginTop: 6 }}>Konfirmasi: {settings.payment_wa_number}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Terms & Conditions */}
          {settings.show_terms && settings.terms_conditions && (
            <View style={styles.termsSection}>
              <Text style={[styles.termsTitle, { color: settings.header_color_primary }]}>
                Syarat & Ketentuan:
              </Text>
              <Text style={styles.termsText}>{settings.terms_conditions}</Text>
            </View>
          )}

          {/* Custom Note */}
          {settings.show_custom_note && settings.custom_note && (
            <View style={styles.customNote}>
              <Text style={styles.customNoteText}>{settings.custom_note}</Text>
            </View>
          )}

          {/* Signature Label & Signer Info */}
          {settings.show_signature !== false && (
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>{settings.signature_label || "Hormat Kami,"}</Text>
                <Text style={styles.signerName}>{settings.signer_name || settings.company_name}</Text>
                {settings.signer_title && <Text style={styles.signerTitle}>{settings.signer_title}</Text>}
              </View>
            </View>
          )}

          {/* Footer */}
          {settings.show_footer !== false && settings.footer_text && (
            <Text style={styles.footer}>{settings.footer_text}</Text>
          )}
        </View>

        {/* QR Verification - Absolute positioned */}
        {settings.show_qr_code && verificationQrDataUrl && (
          <View
            style={[
              styles.qrVerification,
              {
                left: ((layoutSettings?.qr_verification_position_x ?? 85) / 100) * A4_WIDTH - 60,
                top: ((layoutSettings?.qr_verification_position_y ?? 92) / 100) * A4_HEIGHT - 40,
              },
            ]}
          >
            <Image src={verificationQrDataUrl} style={styles.qrVerificationQR} />
            <View>
              <Text style={styles.qrVerificationText}>
                {settings.qr_verification_title || "Scan untuk verifikasi dokumen"}
              </Text>
              <Text style={styles.qrVerificationCode}>
                {settings.qr_verification_label || "Kode:"} {verificationCode}
              </Text>
              {settings.show_qr_verification_url !== false && (
                <Text style={styles.qrVerificationUrl}>{verificationUrl}</Text>
              )}
            </View>
          </View>
        )}

        {/* Signature Image - Absolute positioned */}
        {settings.show_signature !== false && settings.signature_url && (
          <Image
            src={settings.signature_url}
            style={[
              styles.signatureImage,
              {
                left: ((layoutSettings?.signature_position_x ?? 80) / 100) * A4_WIDTH - 50,
                top: ((layoutSettings?.signature_position_y ?? 85) / 100) * A4_HEIGHT - 25,
                opacity: (layoutSettings?.signature_opacity ?? 100) / 100,
              },
            ]}
          />
        )}

        {/* Stamp - Absolute positioned */}
        {settings.show_stamp && settings.show_stamp_on_invoice && settings.custom_stamp_url && (
          <Image
            src={settings.custom_stamp_url}
            style={[
              styles.stamp,
              styles.stampImage,
              {
                left: ((layoutSettings?.stamp_position_x ?? settings.stamp_position_x ?? 10) / 100) * A4_WIDTH - 40,
                top: ((layoutSettings?.stamp_position_y ?? 70) / 100) * A4_HEIGHT - 40,
                opacity: (settings.stamp_opacity || 80) / 100,
              },
            ]}
          />
        )}

        {/* Custom Text Elements */}
        {customTextElements.filter(el => el.is_visible).map(element => (
          <Text
            key={element.id}
            style={{
              position: 'absolute',
              left: (element.position_x / 100) * A4_WIDTH,
              top: (element.position_y / 100) * A4_HEIGHT,
              fontSize: element.font_size,
              color: element.font_color,
              fontWeight: element.font_weight === 'bold' ? 700 : 400,
              fontFamily: 'Helvetica',
              textAlign: element.text_align as 'left' | 'center' | 'right',
              transform: `rotate(${element.rotation}deg)`,
            }}
          >
            {element.content}
          </Text>
        ))}
      </Page>

      {/* Page 2: Rincian Tagihan */}
      {showPage2 && (
        <Page size="A4" style={styles.page}>
          {/* Header Stripe */}
          {settings.show_header_stripe && (
            <View
              style={[
                styles.headerStripe,
                {
                  height: settings.header_stripe_height || 12,
                  backgroundColor: settings.header_color_primary,
                },
              ]}
            />
          )}

          {/* Content starts after stripe */}
          <View style={{ paddingTop: settings.show_header_stripe ? 15 : 0 }}>
            {/* Header - Same as Page 1 */}
            <View style={[styles.header, { borderBottomColor: settings.border_color }]}>
              <View style={styles.headerLeft}>
                {/* Logo */}
                {settings.invoice_logo_url ? (
                  <Image src={settings.invoice_logo_url} style={styles.logo} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={{ fontSize: 6, color: "#9ca3af" }}>Logo</Text>
                  </View>
                )}

                {/* Company Info */}
                <View style={styles.companyInfo}>
                  {settings.show_company_name !== false && (
                    <Text
                      style={[
                        styles.companyName,
                        { color: settings.company_name_color || settings.header_color_primary },
                      ]}
                    >
                      {settings.company_name || "Perusahaan"}
                    </Text>
                  )}

                  {settings.show_company_tagline && settings.company_tagline && (
                    <Text style={[styles.tagline, { color: settings.tagline_color || "#6b7280" }]}>
                      {settings.company_tagline}
                    </Text>
                  )}

                  {settings.show_company_address !== false && settings.company_address && (
                    <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                      {settings.company_address}
                    </Text>
                  )}

                  {settings.show_company_phone !== false && settings.company_phone && (
                    <Text style={[styles.companyDetail, { color: settings.company_info_color || "#4b5563" }]}>
                      Tel: {settings.company_phone}
                    </Text>
                  )}
                </View>
              </View>

              {/* Document Info */}
              <View style={styles.headerRight}>
                <Text
                  style={[
                    styles.documentTitle,
                    { color: settings.document_title_color || settings.header_color_primary },
                  ]}
                >
                  RINCIAN SEWA
                </Text>
                <View style={[styles.documentNumberBox, { borderColor: settings.header_color_primary }]}>
                  <Text style={styles.documentNumberLabel}>NO.</Text>
                  <Text style={styles.documentNumber}>{documentNumber}</Text>
                </View>
                <Text style={styles.documentDate}>{formattedDate}</Text>
              </View>
            </View>

            {/* Client Info */}
            <View style={[styles.clientSection, { marginBottom: 15 }]}>
              <Text style={[styles.clientLabel, { color: settings.label_color || "#6b7280" }]}>
                Kepada:
              </Text>
              <Text style={[styles.clientName, { color: settings.value_color || "#1f2937" }]}>
                {clientName}
              </Text>
              {period && (
                <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 4 }}>
                  Periode: {period}
                </Text>
              )}
            </View>

            {/* Section A: Item Sewa */}
            <Text style={[styles.rincianSectionTitle, { color: settings.header_color_primary }]}>
              A. ITEM SEWA
            </Text>

            {/* Rincian Table */}
            <View style={styles.rincianTable}>
              {/* Table Header */}
              <View style={[styles.rincianTableHeader, { backgroundColor: settings.table_header_bg || "#f3f4f6" }]}>
                <Text style={[styles.rincianTableHeaderCell, { width: 25, textAlign: "center", borderColor: settings.border_color }]}>No</Text>
                <Text style={[styles.rincianTableHeaderCell, { flex: 1, borderColor: settings.border_color }]}>Nama Item</Text>
                <Text style={[styles.rincianTableHeaderCell, { width: 40, textAlign: "center", borderColor: settings.border_color }]}>Qty</Text>
                <Text style={[styles.rincianTableHeaderCell, { width: 75, textAlign: "right", borderColor: settings.border_color }]}>Harga/Hari</Text>
                <Text style={[styles.rincianTableHeaderCell, { width: 50, textAlign: "center", borderColor: settings.border_color }]}>Durasi</Text>
                <Text style={[styles.rincianTableHeaderCell, { width: 90, textAlign: "right", borderColor: settings.border_color }]}>Subtotal</Text>
              </View>

              {/* Table Rows */}
              {lineItems.map((item, index) => {
                const itemSubtotal = item.subtotal || (item.quantity * item.unit_price_per_day * item.duration_days);
                return (
                  <View key={index} style={styles.rincianTableRow}>
                    <Text style={[styles.rincianTableCell, { width: 25, textAlign: "center", borderColor: settings.border_color }]}>{index + 1}</Text>
                    <Text style={[styles.rincianTableCell, { flex: 1, borderColor: settings.border_color }]}>{item.item_name}</Text>
                    <Text style={[styles.rincianTableCell, { width: 40, textAlign: "center", borderColor: settings.border_color }]}>{item.quantity} {(item.unit_mode || 'pcs').charAt(0).toUpperCase() + (item.unit_mode || 'pcs').slice(1)}</Text>
                    <Text style={[styles.rincianTableCell, { width: 75, textAlign: "right", borderColor: settings.border_color }]}>{formatRupiah(item.unit_price_per_day)}</Text>
                    <Text style={[styles.rincianTableCell, { width: 50, textAlign: "center", borderColor: settings.border_color }]}>{item.duration_days} hari</Text>
                    <Text style={[styles.rincianTableCell, { width: 90, textAlign: "right", fontFamily: "Helvetica", fontWeight: 700, borderColor: settings.border_color }]}>{formatRupiah(itemSubtotal)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Subtotal Sewa */}
            <View style={[styles.rincianSummaryRow, { backgroundColor: "#f9fafb" }]}>
              <Text style={styles.rincianSummaryLabel}>Subtotal Sewa</Text>
              <Text style={styles.rincianSummaryValue}>{formatRupiah(subtotalSewa)}</Text>
            </View>

            {/* Section B: Ongkos Transport */}
            {(transportDelivery > 0 || transportPickup > 0) && (
              <>
                <Text style={[styles.rincianSectionTitle, { color: settings.header_color_primary }]}>
                  B. ONGKOS TRANSPORT
                </Text>

                {transportDelivery > 0 && (
                  <View style={styles.rincianSummaryRow}>
                    <Text style={styles.rincianSummaryLabel}>Pengiriman</Text>
                    <Text style={styles.rincianSummaryValue}>{formatRupiah(transportDelivery)}</Text>
                  </View>
                )}

                {transportPickup > 0 && (
                  <View style={styles.rincianSummaryRow}>
                    <Text style={styles.rincianSummaryLabel}>Pengambilan</Text>
                    <Text style={styles.rincianSummaryValue}>{formatRupiah(transportPickup)}</Text>
                  </View>
                )}

                <View style={[styles.rincianSummaryRow, { backgroundColor: "#f9fafb" }]}>
                  <Text style={styles.rincianSummaryLabel}>Total Transport</Text>
                  <Text style={styles.rincianSummaryValue}>{formatRupiah(totalTransport)}</Text>
                </View>
              </>
            )}

            {/* Section C: Diskon */}
            {discount > 0 && (
              <>
                <Text style={[styles.rincianSectionTitle, { color: settings.header_color_primary }]}>
                  C. DISKON
                </Text>

                <View style={styles.rincianSummaryRow}>
                  <Text style={styles.rincianSummaryLabel}>Potongan Harga</Text>
                  <Text style={[styles.rincianSummaryValue, { color: "#dc2626" }]}>-{formatRupiah(discount)}</Text>
                </View>
              </>
            )}

            {/* Grand Total */}
            <View style={[styles.rincianTotalRow, { backgroundColor: `${settings.accent_color}15` }]}>
              <Text style={styles.rincianTotalLabel}>GRAND TOTAL</Text>
              <Text style={[styles.rincianTotalValue, { color: settings.header_color_primary }]}>{formatRupiah(grandTotal)}</Text>
            </View>

            {/* Terbilang */}
            {settings.show_terbilang && (
              <Text style={[styles.terbilang, { marginTop: 10 }]}>
                {settings.label_terbilang || "Terbilang:"} {terbilang(grandTotal)}
              </Text>
            )}

            {/* Footer */}
            {settings.show_footer !== false && settings.footer_text && (
              <Text style={[styles.footer, { marginTop: 30 }]}>{settings.footer_text}</Text>
            )}
          </View>

          {/* Watermark - SAME AS PAGE 1 */}
          {settings.show_watermark && settings.watermark_type === 'logo' && settings.invoice_logo_url && (
            <Image
              src={settings.invoice_logo_url}
              style={[
                styles.watermark,
                {
                  left: ((layoutSettings?.watermark_position_x ?? settings.watermark_position_x ?? 50) / 100) * A4_WIDTH - ((layoutSettings?.watermark_size ?? settings.watermark_size ?? 200) / 2),
                  top: ((layoutSettings?.watermark_position_y ?? settings.watermark_position_y ?? 50) / 100) * A4_HEIGHT - ((layoutSettings?.watermark_size ?? settings.watermark_size ?? 200) / 2),
                  width: layoutSettings?.watermark_size ?? settings.watermark_size ?? 200,
                  height: layoutSettings?.watermark_size ?? settings.watermark_size ?? 200,
                  opacity: (layoutSettings?.watermark_opacity ?? settings.watermark_opacity ?? 10) / 100,
                  transform: `rotate(${layoutSettings?.watermark_rotation ?? settings.watermark_rotation ?? -45}deg)`,
                },
              ]}
            />
          )}
          {settings.show_watermark && settings.watermark_type !== 'logo' && (
            <Text
              style={[
                styles.watermark,
                {
                  left: ((layoutSettings?.watermark_position_x ?? settings.watermark_position_x ?? 50) / 100) * A4_WIDTH,
                  top: ((layoutSettings?.watermark_position_y ?? settings.watermark_position_y ?? 50) / 100) * A4_HEIGHT,
                  fontSize: layoutSettings?.watermark_size ?? settings.watermark_size ?? 60,
                  opacity: (layoutSettings?.watermark_opacity ?? settings.watermark_opacity ?? 10) / 100,
                  transform: `rotate(${layoutSettings?.watermark_rotation ?? settings.watermark_rotation ?? -45}deg) translateX(-50%) translateY(-50%)`,
                  color: "#9ca3af",
                  fontWeight: 700,
                },
              ]}
            >
              {settings.watermark_text || 'DRAFT'}
            </Text>
          )}
        </Page>
      )}
    </Document>
  );
};

export default InvoicePDFTemplate;
