import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
import { MapPin, Phone, Mail, Globe } from "lucide-react";
import QRCode from "react-qr-code";
import { TemplateSettings } from "@/components/template-settings/types";
import { DynamicStamp } from "./DynamicStamp";
import { CustomStampRenderer } from "./CustomStampRenderer";
import { DraggableTextBox } from "@/components/custom-text/DraggableTextBox";
import { CustomTextElement } from "@/components/custom-text/types";
import { useRef } from "react";

interface ReceiptTemplatePreviewProps {
  settings: TemplateSettings;
  customTextElements?: CustomTextElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: Partial<CustomTextElement>) => void;
  isEditing?: boolean;
}

export function ReceiptTemplatePreview({ 
  settings,
  customTextElements = [],
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  isEditing = false
}: ReceiptTemplatePreviewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const sampleData = {
    documentNumber: `${settings.receipt_prefix || 'KWT'}-2025-0001`,
    verificationCode: "XYZ789ABC",
    issuedAt: new Date(),
    clientName: "PT. Contoh Klien",
    clientAddress: "Jl. Contoh Alamat No. 123, Denpasar",
    description: "Pembayaran Sewa Scaffolding - Invoice INV-2025-0001",
    amount: 15000000,
    companyName: settings.company_name || "Sewa Scaffolding Bali",
    companyAddress: settings.company_address || "Jl. Raya Denpasar No. 99",
    companyPhone: settings.company_phone || "081234567890",
    companyEmail: settings.company_email || "info@example.com",
    companyWebsite: settings.company_website || "www.example.com",
    ownerName: settings.signer_name || "John Doe",
    signerTitle: settings.signer_title || "Direktur",
    invoiceNumber: "INV-2025-0001",
    paymentDate: new Date(),
  };

  const formattedDate = format(sampleData.issuedAt, "dd MMMM yyyy", { locale: localeId });
  const formattedPaymentDate = format(sampleData.paymentDate, "dd MMMM yyyy", { locale: localeId });
  const verificationUrl = `https://sewascaffoldingbali.com/verify/${sampleData.verificationCode}`;

  const getLogoJustify = () => {
    switch (settings.logo_position) {
      case "center": return "justify-center";
      case "right": return "justify-end";
      default: return "justify-start";
    }
  };

  const getFontFamily = () => {
    switch (settings.font_family) {
      case "inter": return "'Inter', sans-serif";
      case "roboto": return "'Roboto', sans-serif";
      case "poppins": return "'Poppins', sans-serif";
      case "open-sans": return "'Open Sans', sans-serif";
      case "lato": return "'Lato', sans-serif";
      case "montserrat": return "'Montserrat', sans-serif";
      case "playfair": return "'Playfair Display', serif";
      case "merriweather": return "'Merriweather', serif";
      default: return "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    }
  };

  const getHeadingFontFamily = () => {
    switch (settings.heading_font_family) {
      case "inter": return "'Inter', sans-serif";
      case "roboto": return "'Roboto', sans-serif";
      case "poppins": return "'Poppins', sans-serif";
      case "open-sans": return "'Open Sans', sans-serif";
      case "lato": return "'Lato', sans-serif";
      case "montserrat": return "'Montserrat', sans-serif";
      case "playfair": return "'Playfair Display', serif";
      case "merriweather": return "'Merriweather', serif";
      default: return getFontFamily();
    }
  };

  // Get layout settings for QR verification
  const layoutSettings = settings.receipt_layout_settings;

  return (
    <div
      ref={documentRef}
      className="bg-white text-gray-900 p-8 pb-12 w-[210mm] h-[297mm] mx-auto shadow-lg relative overflow-visible"
      style={{ 
        fontFamily: getFontFamily(),
        fontSize: `${settings.font_size_base || 14}px`
      }}
    >
      {/* Watermark - uses receipt_layout_settings */}
      {settings.show_watermark && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{ 
            left: `${settings.receipt_layout_settings?.watermark_position_x ?? settings.watermark_position_x ?? 50}%`,
            top: `${settings.receipt_layout_settings?.watermark_position_y ?? settings.watermark_position_y ?? 50}%`,
            transform: `translate(-50%, -50%) rotate(${settings.receipt_layout_settings?.watermark_rotation ?? settings.watermark_rotation ?? -45}deg)`,
            opacity: (settings.receipt_layout_settings?.watermark_opacity ?? settings.watermark_opacity ?? 10) / 100
          }}
        >
          {settings.watermark_type === 'logo' && settings.invoice_logo_url ? (
            <img 
              src={settings.invoice_logo_url} 
              alt="" 
              style={{ 
                width: `${settings.receipt_layout_settings?.watermark_size ?? settings.watermark_size ?? 300}px`,
                height: 'auto'
              }}
              className="object-contain" 
            />
          ) : (
            <span 
              className="font-bold text-gray-300 whitespace-nowrap"
              style={{ 
                fontFamily: getHeadingFontFamily(),
                fontSize: `${settings.receipt_layout_settings?.watermark_size ?? settings.watermark_size ?? 300}px`
              }}
            >
              {settings.watermark_text || 'DRAFT'}
            </span>
          )}
        </div>
      )}

      {/* Content wrapper with z-index above watermark */}
      <div className="relative z-10">
        {/* Header Stripe Bar */}
        {settings.show_header_stripe && (
          <div
            className="-mx-8 -mt-8 mb-6"
            style={{ 
              height: `${settings.header_stripe_height || 12}px`,
              background: `linear-gradient(to right, ${settings.header_color_primary}, ${settings.header_color_secondary})` 
            }}
          />
        )}

        {/* Header */}
        <div 
          className={`flex items-start justify-between pb-4 mb-6 border-b-2`} 
          style={{ borderColor: settings.border_color }}
        >
          <div className={`flex items-start gap-4 ${getLogoJustify()}`}>
            {settings.invoice_logo_url ? (
              <img 
                src={settings.invoice_logo_url} 
                alt="Company Logo" 
                className="h-20 w-20 object-contain rounded-lg"
              />
            ) : (
              <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                Logo
              </div>
            )}
            <div>
              {/* Company Name */}
              {settings.show_company_name !== false && (
                <h1 
                  className="text-2xl font-bold tracking-wide" 
                  style={{ 
                    color: settings.company_name_color || settings.header_color_primary,
                    fontFamily: getHeadingFontFamily()
                  }}
                >
                  {sampleData.companyName}
                </h1>
              )}
              
              {/* Company Tagline */}
              {settings.show_company_tagline && settings.company_tagline && (
                <p 
                  className="text-sm italic mt-0.5"
                  style={{ color: settings.tagline_color || '#6b7280' }}
                >
                  {settings.company_tagline}
                </p>
              )}

              {/* Address */}
              {settings.show_company_address !== false && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_maps_url ? (
                    <img src={settings.icon_maps_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                  ) : (
                    <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                  )}
                  {sampleData.companyAddress}
                </p>
              )}

              {/* Phone */}
              {settings.show_company_phone !== false && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_whatsapp_url ? (
                    <img src={settings.icon_whatsapp_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                  ) : (
                    <Phone className="h-3 w-3 flex-shrink-0 text-green-500" />
                  )}
                  {sampleData.companyPhone}
                </p>
              )}
              
              {/* Email */}
              {settings.show_company_email !== false && sampleData.companyEmail && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_email_url ? (
                    <img src={settings.icon_email_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                  ) : (
                    <Mail className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                  )}
                  {sampleData.companyEmail}
                </p>
              )}
              
              {/* Website */}
              {settings.show_company_website !== false && sampleData.companyWebsite && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_website_url ? (
                    <img src={settings.icon_website_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                  ) : (
                    <Globe className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                  )}
                  {sampleData.companyWebsite}
                </p>
              )}

              {/* NPWP */}
              {settings.show_npwp && settings.company_npwp && (
                <p 
                  className="text-sm mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  NPWP: {settings.company_npwp}
                </p>
              )}
            </div>
          </div>
          
          {/* Document Type & Number */}
          <div className="text-right">
            {settings.show_document_number !== false && (
              <>
                <h2 
                  className="text-xl font-bold mb-2" 
                  style={{ 
                    color: settings.document_title_color || settings.header_color_primary,
                    fontFamily: getHeadingFontFamily()
                  }}
                >
                  {settings.receipt_title || 'KWITANSI'}
                </h2>
                <div 
                  className="px-4 py-1 inline-block border-2" 
                  style={{ borderColor: settings.header_color_primary }}
                >
                  <span className="text-sm text-gray-500">NO.</span>
                  <span className="text-lg font-bold ml-2">{sampleData.documentNumber}</span>
                </div>
              </>
            )}
            {settings.show_document_date !== false && (
              <p className="text-sm text-gray-500 mt-2">{formattedDate}</p>
            )}
          </div>
        </div>

        {/* Client Info */}
        {settings.show_client_info !== false && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p 
              className="text-sm mb-1"
              style={{ color: settings.label_color || '#6b7280' }}
            >
              Telah diterima dari:
            </p>
            <p 
              className="font-semibold text-lg"
              style={{ color: settings.value_color || '#1f2937' }}
            >
              {sampleData.clientName}
            </p>
            <p 
              className="text-sm"
              style={{ color: settings.company_info_color || '#4b5563' }}
            >
              {sampleData.clientAddress}
            </p>
          </div>
        )}

        {/* Receipt Details Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            {settings.show_table_header !== false && (
              <thead>
                <tr 
                  style={{ 
                    backgroundColor: settings.table_header_bg || '#f3f4f6',
                    color: settings.table_header_text_color || '#374151'
                  }}
                >
                  <th 
                    className="px-4 py-2 text-left"
                    style={{ 
                      border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                      borderColor: settings.border_color 
                    }}
                  >
                    {settings.label_description || 'Keterangan'}
                  </th>
                  <th 
                    className="px-4 py-2 text-right w-48"
                    style={{ 
                      border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                      borderColor: settings.border_color 
                    }}
                  >
                    {settings.label_amount || 'Jumlah'}
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              <tr style={{ backgroundColor: settings.table_alternating_color ? `${settings.table_alternating_color}40` : 'transparent' }}>
                <td 
                  className="px-4 py-3"
                  style={{ 
                    border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                    borderColor: settings.border_color 
                  }}
                >
                  <div className="font-medium">{sampleData.description}</div>
                  <div className="text-sm text-gray-500 mt-1">No. Invoice: {sampleData.invoiceNumber}</div>
                  <div className="text-sm text-gray-500">Tanggal Bayar: {formattedPaymentDate}</div>
                </td>
                <td 
                  className="px-4 py-3 text-right font-semibold"
                  style={{ 
                    border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                    borderColor: settings.border_color 
                  }}
                >
                  {formatRupiah(sampleData.amount)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: `${settings.accent_color}15` }}>
                <td 
                  className="px-4 py-3 text-right font-bold"
                  style={{ 
                    border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                    borderColor: settings.border_color 
                  }}
                >
                  Total Diterima
                </td>
                <td 
                  className="px-4 py-3 text-right font-bold text-lg"
                  style={{ 
                    border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                    borderColor: settings.border_color 
                  }}
                >
                  {formatRupiah(sampleData.amount)}
                </td>
              </tr>
            </tfoot>
          </table>
          {settings.show_terbilang && (
            <p className="mt-2 text-sm italic text-gray-600">
              {settings.label_terbilang || 'Terbilang:'} <span className="font-medium">{terbilang(sampleData.amount)}</span>
            </p>
          )}
        </div>

        {/* Bank Info Section */}
        {settings.show_bank_info && settings.bank_name && !settings.use_payment_link && (
          <div 
            className="mb-6 p-4 rounded-lg"
            style={{ 
              backgroundColor: `${settings.accent_color}08`,
              border: `1px solid ${settings.border_color}` 
            }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: settings.header_color_primary }}>
              {settings.label_bank_transfer || 'Transfer ke:'}
            </h3>
            <div className="flex items-center gap-3">
              {settings.bank_logo_url && (
                <img src={settings.bank_logo_url} alt="" className="h-10 object-contain" />
              )}
              <div>
                <p className="font-medium">{settings.bank_name}</p>
                <p className="text-sm font-mono">{settings.bank_account_number || '1234567890'}</p>
                <p className="text-sm text-gray-600">a/n {settings.bank_account_name || 'Nama Pemilik'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Note */}
        {settings.show_custom_note && settings.custom_note && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 whitespace-pre-wrap">{settings.custom_note}</p>
          </div>
        )}

        {/* Signature Label & Signer Info - Fixed Position */}
        {settings.show_signature !== false && (
          <div className="flex justify-end mb-8">
            <div className="text-center" style={{ minWidth: '200px' }}>
              <p className="text-sm text-gray-600 mb-12">{settings.signature_label || 'Hormat Kami,'}</p>
              <p className="font-semibold">{sampleData.ownerName}</p>
              {sampleData.signerTitle && (
                <p className="text-sm text-gray-500">{sampleData.signerTitle}</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {settings.show_footer !== false && settings.footer_text && (
          <div className="text-center text-sm text-gray-500 mb-4">
            {settings.footer_text}
          </div>
        )}

        </div>

        {/* QR Verification - Positioned relative to content bottom */}
        {settings.show_qr_code && (
          <div 
            className="absolute pointer-events-none z-20"
            style={{
              left: `${layoutSettings?.qr_verification_position_x ?? 85}%`,
              bottom: layoutSettings?.qr_verification_position_y !== undefined 
                ? `${100 - layoutSettings.qr_verification_position_y}%` 
                : '8%',
              transform: `translate(-50%, 50%) scale(${layoutSettings?.qr_verification_scale ?? 1})`,
            }}
          >
            <div className="flex items-center gap-3 bg-white/95 p-3 rounded-lg shadow-sm border border-gray-100">
              <QRCode 
                value={verificationUrl} 
                size={layoutSettings?.qr_size ?? settings.qr_size ?? 80} 
              />
              <div className="text-sm">
                <p className="text-gray-500">
                  {settings.qr_verification_title || 'Scan untuk verifikasi dokumen'}
                </p>
                <p className="font-mono text-xs text-gray-400 mt-1">
                  {settings.qr_verification_label || 'Kode:'} {sampleData.verificationCode}
                </p>
                {settings.show_qr_verification_url !== false && (
                  <p className="text-xs text-blue-600 break-all max-w-[150px]">
                    {verificationUrl}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Signature Image Only - Positioned relative to content bottom */}
        {settings.show_signature !== false && settings.signature_url && (
          <div 
            className="absolute pointer-events-none z-30"
            style={{
              left: `${settings.receipt_layout_settings?.signature_position_x ?? 80}%`,
              bottom: settings.receipt_layout_settings?.signature_position_y !== undefined 
                ? `${100 - settings.receipt_layout_settings.signature_position_y}%` 
                : '15%',
              transform: `translate(-50%, 50%) scale(${settings.receipt_layout_settings?.signature_scale ?? 1})`,
              opacity: (settings.receipt_layout_settings?.signature_opacity ?? 100) / 100,
            }}
          >
            <img 
              src={settings.signature_url} 
              alt="Signature" 
              className="max-w-[200px] max-h-[100px] object-contain"
            />
          </div>
        )}

        {/* Fixed-positioned Stamp - Positioned relative to content bottom */}
        {settings.show_stamp && settings.show_stamp_on_receipt !== false && (
          <div 
            className="absolute pointer-events-none z-40"
            style={{
              left: `${settings.receipt_layout_settings?.stamp_position_x ?? settings.stamp_position_x ?? 10}%`,
              bottom: settings.receipt_layout_settings?.stamp_position_y !== undefined 
                ? `${100 - settings.receipt_layout_settings.stamp_position_y}%` 
                : '30%',
              transform: `translate(-50%, 50%) rotate(${settings.receipt_layout_settings?.stamp_rotation ?? settings.stamp_rotation ?? 0}deg) scale(${settings.receipt_layout_settings?.stamp_scale ?? settings.stamp_scale ?? 1})`
            }}
          >
            {settings.stamp_source === 'custom' ? (
              <CustomStampRenderer
                documentNumber={sampleData.documentNumber}
                companyName={settings.company_name || ''}
                date={format(new Date(), 'dd/MM/yyyy')}
                opacity={settings.stamp_opacity}
              />
            ) : settings.custom_stamp_url ? (
              <img 
                src={settings.custom_stamp_url} 
                alt="Stamp" 
                className="h-24 w-24 object-contain"
                style={{ opacity: (settings.stamp_opacity || 80) / 100 }}
              />
            ) : (
              <DynamicStamp
                status="LUNAS"
                documentNumber={sampleData.documentNumber}
                companyName={settings.company_name || 'Perusahaan'}
                date={format(new Date(), 'dd/MM/yyyy')}
                settings={settings}
              />
            )}
          </div>
        )}

        {/* Custom Text Elements */}
        {customTextElements.filter(el => el.is_visible).map(element => (
          <DraggableTextBox
            key={element.id}
            element={element}
            isSelected={selectedElementId === element.id}
            isEditing={isEditing}
            onSelect={() => onSelectElement?.(element.id)}
            onUpdate={(updates) => onUpdateElement?.(element.id, updates)}
            onDelete={() => {}}
            containerRef={documentRef}
          />
        ))}
    </div>
  );
}
