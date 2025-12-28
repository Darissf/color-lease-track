import { forwardRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
import { DynamicStamp } from "./DynamicStamp";
import QRCode from "react-qr-code";
import { MapPin, Phone } from "lucide-react";

interface ReceiptTemplateProps {
  documentNumber: string;
  verificationCode: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  description: string;
  amount: number;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  ownerName?: string;
  signatureUrl?: string;
  logoUrl?: string;
  invoiceNumber?: string;
  paymentDate?: Date;
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  (
    {
      documentNumber,
      verificationCode,
      issuedAt,
      clientName,
      clientAddress,
      description,
      amount,
      companyName,
      companyAddress,
      companyPhone,
      ownerName,
      signatureUrl,
      logoUrl,
      invoiceNumber,
      paymentDate,
    },
    ref
  ) => {
    const verificationUrl = `https://sewascaffoldingbali.com/verify/${verificationCode}`;
    const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });
    const stampDate = format(issuedAt, "dd/MM/yyyy");
    const paymentDateFormatted = paymentDate
      ? format(paymentDate, "dd MMMM yyyy", { locale: localeId })
      : formattedDate;

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-lg"
        style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
      >
        {/* Blue Stripe Bar */}
        <div className="h-3 bg-gradient-to-r from-cyan-500 to-blue-600 -mx-8 -mt-8 mb-6" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 mb-6 border-b-2 border-blue-200">
          <div className="flex items-start gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-cyan-600 tracking-wide">{companyName}</h1>
              {companyAddress && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-cyan-500 flex-shrink-0" />
                  {companyAddress}
                </p>
              )}
              {companyPhone && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3 text-green-500 flex-shrink-0" />
                  {companyPhone}
                </p>
              )}
            </div>
          </div>
          
          {/* Document Type & Number */}
          <div className="text-right">
            <h2 className="text-xl font-bold text-cyan-600 mb-2">KWITANSI</h2>
            <div className="border-2 border-cyan-500 px-4 py-1 inline-block">
              <span className="text-sm text-gray-500">NO.</span>
              <span className="text-lg font-bold ml-2">{documentNumber}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{formattedDate}</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Telah diterima dari:</p>
          <p className="font-semibold text-lg">{clientName}</p>
          {clientAddress && <p className="text-sm text-gray-600">{clientAddress}</p>}
        </div>

        {/* Payment Details */}
        <div className="mb-8 p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-3">Untuk Pembayaran:</h3>
          
          {invoiceNumber && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">Invoice</span>
              <span className="font-medium">{invoiceNumber}</span>
            </div>
          )}
          
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Keterangan</span>
            <span className="font-medium text-right max-w-[60%]">{description}</span>
          </div>
          
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Tanggal Pembayaran</span>
            <span className="font-medium">{paymentDateFormatted}</span>
          </div>
          
          <div className="flex justify-between py-3 mt-2 bg-emerald-50 -mx-4 px-4 rounded-b-lg">
            <span className="text-lg font-bold text-gray-700">Jumlah</span>
            <span className="text-lg font-bold text-emerald-700">{formatRupiah(amount)}</span>
          </div>
        </div>

        {/* Terbilang */}
        <div className="mb-8 p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            Terbilang: <span className="font-semibold italic">{terbilang(amount)}</span>
          </p>
        </div>

        {/* Signature and Stamp Section */}
        <div className="flex justify-between items-end mb-8">
          {/* Signature */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Hormat Kami,</p>
            {signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Tanda Tangan"
                className="h-20 w-32 object-contain mx-auto"
              />
            ) : (
              <div className="h-20 w-32 border-b border-gray-400" />
            )}
            <p className="font-semibold mt-2">{ownerName || companyName}</p>
          </div>

          {/* Dynamic Stamp */}
          <DynamicStamp
            status="LUNAS"
            documentNumber={documentNumber}
            companyName={companyName}
            date={stampDate}
          />
        </div>

        {/* QR Verification */}
        <div className="border-t-2 border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-4">
            <QRCode value={verificationUrl} size={80} />
            <div className="text-sm">
              <p className="text-gray-500">Scan untuk verifikasi dokumen</p>
              <p className="font-mono text-xs text-gray-400 mt-1">
                Kode: {verificationCode}
              </p>
              <p className="text-xs text-blue-600 break-all">{verificationUrl}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";
