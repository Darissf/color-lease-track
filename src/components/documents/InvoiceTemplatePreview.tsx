import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
import { MapPin, Phone } from "lucide-react";
import QRCode from "react-qr-code";

interface TemplateSettings {
  template_style: string;
  header_color_primary: string;
  header_color_secondary: string;
  border_color: string;
  accent_color: string;
  show_qr_code: boolean;
  show_terbilang: boolean;
  footer_text: string;
  terms_conditions: string;
  paper_size: string;
  logo_position: string;
}

interface InvoiceTemplatePreviewProps {
  settings: TemplateSettings;
}

export function InvoiceTemplatePreview({ settings }: InvoiceTemplatePreviewProps) {
  const sampleData = {
    documentNumber: "INV-2025-0001",
    verificationCode: "ABC123XYZ",
    issuedAt: new Date(),
    clientName: "PT. Contoh Klien",
    clientAddress: "Jl. Contoh Alamat No. 123, Denpasar",
    description: "Sewa Scaffolding 50 Set",
    amount: 15000000,
    companyName: "Sewa Scaffolding Bali",
    companyAddress: "Jl. Raya Denpasar No. 99",
    companyPhone: "081234567890",
    ownerName: "John Doe",
    contractInvoice: "INV-2025-0001",
    period: "01 Jan 2025 - 31 Jan 2025",
  };

  const formattedDate = format(sampleData.issuedAt, "dd MMMM yyyy", { locale: localeId });
  const verificationUrl = `https://sewascaffoldingbali.com/verify/${sampleData.verificationCode}`;

  const getLogoJustify = () => {
    switch (settings.logo_position) {
      case "center": return "justify-center";
      case "right": return "justify-end";
      default: return "justify-start";
    }
  };

  return (
    <div
      className="bg-white text-gray-900 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-lg"
      style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
    >
      {/* Blue Stripe Bar */}
      <div
        className="h-3 -mx-8 -mt-8 mb-6"
        style={{ background: `linear-gradient(to right, ${settings.header_color_primary}, ${settings.header_color_secondary})` }}
      />

      {/* Header */}
      <div className={`flex items-start justify-between pb-4 mb-6 border-b-2`} style={{ borderColor: settings.border_color }}>
        <div className={`flex items-start gap-4 ${getLogoJustify()}`}>
          <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
            Logo
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ color: settings.header_color_primary }}>
              {sampleData.companyName}
            </h1>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
              {sampleData.companyAddress}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Phone className="h-3 w-3 flex-shrink-0 text-green-500" />
              {sampleData.companyPhone}
            </p>
          </div>
        </div>
        
        {/* Document Type & Number */}
        <div className="text-right">
          <h2 className="text-xl font-bold mb-2" style={{ color: settings.header_color_primary }}>INVOICE</h2>
          <div className="px-4 py-1 inline-block border-2" style={{ borderColor: settings.header_color_primary }}>
            <span className="text-sm text-gray-500">NO.</span>
            <span className="text-lg font-bold ml-2">{sampleData.documentNumber}</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">{formattedDate}</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 mb-1">Kepada Yth:</p>
        <p className="font-semibold text-lg">{sampleData.clientName}</p>
        <p className="text-sm text-gray-600">{sampleData.clientAddress}</p>
      </div>

      {/* Invoice Details */}
      <div className="mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Keterangan</th>
              <th className="border border-gray-300 px-4 py-2 text-right w-48">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-4 py-3">
                <div className="font-medium">{sampleData.description}</div>
                <div className="text-sm text-gray-500 mt-1">Ref: {sampleData.contractInvoice}</div>
                <div className="text-sm text-gray-500">Periode: {sampleData.period}</div>
              </td>
              <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                {formatRupiah(sampleData.amount)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: `${settings.accent_color}15` }}>
              <td className="border border-gray-300 px-4 py-3 text-right font-bold">
                Total
              </td>
              <td className="border border-gray-300 px-4 py-3 text-right font-bold text-lg">
                {formatRupiah(sampleData.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
        {settings.show_terbilang && (
          <p className="mt-2 text-sm italic text-gray-600">
            Terbilang: <span className="font-medium">{terbilang(sampleData.amount)}</span>
          </p>
        )}
      </div>

      {/* Terms & Conditions */}
      {settings.terms_conditions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Syarat & Ketentuan:</h3>
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{settings.terms_conditions}</p>
        </div>
      )}

      {/* Signature Section */}
      <div className="flex justify-between items-end mb-8">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Hormat Kami,</p>
          <div className="h-20 w-32 border-b border-gray-400" />
          <p className="font-semibold mt-2">{sampleData.ownerName}</p>
        </div>

        {/* Stamp placeholder */}
        <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400 text-xs">
          Stempel
        </div>
      </div>

      {/* Footer */}
      {settings.footer_text && (
        <div className="text-center text-sm text-gray-500 mb-4">
          {settings.footer_text}
        </div>
      )}

      {/* QR Verification */}
      {settings.show_qr_code && (
        <div className="border-t-2 border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-4">
            <QRCode value={verificationUrl} size={80} />
            <div className="text-sm">
              <p className="text-gray-500">Scan untuk verifikasi dokumen</p>
              <p className="font-mono text-xs text-gray-400 mt-1">
                Kode: {sampleData.verificationCode}
              </p>
              <p className="text-xs text-blue-600 break-all">{verificationUrl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
