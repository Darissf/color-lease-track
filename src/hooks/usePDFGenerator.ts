import { useCallback, useState, createElement, ReactElement } from "react";
import { pdf, DocumentProps } from "@react-pdf/renderer";
import { toast } from "sonner";
import QRCode from "qrcode";
import { InvoicePDFTemplate } from "@/components/documents/pdf/InvoicePDFTemplate";
import { ReceiptPDFTemplate } from "@/components/documents/pdf/ReceiptPDFTemplate";
import { TemplateSettings } from "@/components/template-settings/types";
import { CustomTextElement } from "@/components/custom-text/types";

interface LineItem {
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  subtotal?: number;
  unit_mode?: string | null;
}

interface InvoicePDFData {
  documentNumber: string;
  verificationCode: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  description: string;
  amount: number;
  contractInvoice?: string;
  period?: string;
  contractBankInfo?: {
    bank_name: string;
    account_number: string;
    account_holder_name?: string;
  };
  accessCode?: string;
  customTextElements?: CustomTextElement[];
  // Page 2: Rincian Tagihan
  lineItems?: LineItem[];
  transportDelivery?: number;
  transportPickup?: number;
  discount?: number;
}

interface ReceiptPDFData {
  documentNumber: string;
  verificationCode: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  description: string;
  amount: number;
  invoiceNumber?: string;
  paymentDate?: Date;
  customTextElements?: CustomTextElement[];
  period?: string;
  // Page 2: Rincian Sewa
  lineItems?: LineItem[];
  transportDelivery?: number;
  transportPickup?: number;
  discount?: number;
  fullRincian?: boolean;
}

// Generate QR code as data URL
async function generateQRDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return "";
  }
}

export function usePDFGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateInvoicePDF = useCallback(
    async (data: InvoicePDFData, settings: TemplateSettings, fileName: string) => {
      setIsGenerating(true);
      const toastId = toast.loading("Membuat PDF...");

      try {
        const verificationUrl = `https://sewascaffoldingbali.com/verify/${data.verificationCode}`;
        const paymentUrl = data.accessCode
          ? `https://sewascaffoldingbali.com/contract/${data.accessCode}`
          : verificationUrl;

        const [qrCodeDataUrl, verificationQrDataUrl] = await Promise.all([
          generateQRDataUrl(paymentUrl),
          generateQRDataUrl(verificationUrl),
        ]);

        const doc = createElement(InvoicePDFTemplate, {
          ...data,
          settings,
          qrCodeDataUrl,
          verificationQrDataUrl,
        }) as unknown as ReactElement<DocumentProps>;

        const blob = await pdf(doc).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("PDF berhasil dibuat!", { id: toastId });
        return true;
      } catch (error) {
        console.error("Error generating invoice PDF:", error);
        toast.error("Gagal membuat PDF", { id: toastId });
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const generateReceiptPDF = useCallback(
    async (data: ReceiptPDFData, settings: TemplateSettings, fileName: string) => {
      setIsGenerating(true);
      const toastId = toast.loading("Membuat PDF...");

      try {
        const verificationUrl = `https://sewascaffoldingbali.com/verify/${data.verificationCode}`;
        const verificationQrDataUrl = await generateQRDataUrl(verificationUrl);

        const doc = createElement(ReceiptPDFTemplate, {
          ...data,
          settings,
          verificationQrDataUrl,
        }) as unknown as ReactElement<DocumentProps>;

        const blob = await pdf(doc).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("PDF berhasil dibuat!", { id: toastId });
        return true;
      } catch (error) {
        console.error("Error generating receipt PDF:", error);
        toast.error("Gagal membuat PDF", { id: toastId });
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const printInvoicePDF = useCallback(
    async (data: InvoicePDFData, settings: TemplateSettings) => {
      setIsGenerating(true);
      const toastId = toast.loading("Menyiapkan cetak...");

      try {
        const verificationUrl = `https://sewascaffoldingbali.com/verify/${data.verificationCode}`;
        const paymentUrl = data.accessCode
          ? `https://sewascaffoldingbali.com/contract/${data.accessCode}`
          : verificationUrl;

        const [qrCodeDataUrl, verificationQrDataUrl] = await Promise.all([
          generateQRDataUrl(paymentUrl),
          generateQRDataUrl(verificationUrl),
        ]);

        const doc = createElement(InvoicePDFTemplate, {
          ...data,
          settings,
          qrCodeDataUrl,
          verificationQrDataUrl,
        }) as unknown as ReactElement<DocumentProps>;

        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }

        toast.success("Siap untuk dicetak!", { id: toastId });
        return true;
      } catch (error) {
        console.error("Error printing invoice PDF:", error);
        toast.error("Gagal mencetak dokumen", { id: toastId });
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const printReceiptPDF = useCallback(
    async (data: ReceiptPDFData, settings: TemplateSettings) => {
      setIsGenerating(true);
      const toastId = toast.loading("Menyiapkan cetak...");

      try {
        const verificationUrl = `https://sewascaffoldingbali.com/verify/${data.verificationCode}`;
        const verificationQrDataUrl = await generateQRDataUrl(verificationUrl);

        const doc = createElement(ReceiptPDFTemplate, {
          ...data,
          settings,
          verificationQrDataUrl,
        }) as unknown as ReactElement<DocumentProps>;

        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);

        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }

        toast.success("Siap untuk dicetak!", { id: toastId });
        return true;
      } catch (error) {
        console.error("Error printing receipt PDF:", error);
        toast.error("Gagal mencetak dokumen", { id: toastId });
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return {
    isGenerating,
    generateInvoicePDF,
    generateReceiptPDF,
    printInvoicePDF,
    printReceiptPDF,
  };
}
