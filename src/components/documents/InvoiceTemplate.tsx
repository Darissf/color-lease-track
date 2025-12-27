import { forwardRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
import { DynamicStamp } from "./DynamicStamp";
import QRCode from "react-qr-code";

interface InvoiceTemplateProps {
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
  contractInvoice?: string;
  period?: string;
}

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
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
      contractInvoice,
      period,
    },
    ref
  ) => {
    const verificationUrl = `https://sewascaffoldingbali.com/verify/${verificationCode}`;
    const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });
    const stampDate = format(issuedAt, "dd/MM/yyyy");

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-lg"
        style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-300 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
              {companyAddress && (
                <p className="text-sm text-gray-600">{companyAddress}</p>
              )}
              {companyPhone && (
                <p className="text-sm text-gray-600">Telp: {companyPhone}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700 border border-orange-300">
              ⏳ BELUM LUNAS
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-wide">INVOICE</h2>
          <p className="text-lg font-semibold text-gray-700">No: {documentNumber}</p>
          <p className="text-sm text-gray-500">Tanggal: {formattedDate}</p>
        </div>

        {/* Client Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Kepada Yth:</p>
          <p className="font-semibold text-lg">{clientName}</p>
          {clientAddress && <p className="text-sm text-gray-600">{clientAddress}</p>}
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
                  <div className="font-medium">{description}</div>
                  {contractInvoice && (
                    <div className="text-sm text-gray-500 mt-1">Ref: {contractInvoice}</div>
                  )}
                  {period && (
                    <div className="text-sm text-gray-500">Periode: {period}</div>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                  {formatRupiah(amount)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-orange-50">
                <td className="border border-gray-300 px-4 py-3 text-right font-bold">
                  Total
                </td>
                <td className="border border-gray-300 px-4 py-3 text-right font-bold text-lg">
                  {formatRupiah(amount)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-sm italic text-gray-600">
            Terbilang: <span className="font-medium">{terbilang(amount)}</span>
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
            status="BELUM_LUNAS"
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

InvoiceTemplate.displayName = "InvoiceTemplate";
