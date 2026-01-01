import { forwardRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
import { MapPin, Phone, Mail, Globe } from "lucide-react";
import QRCode from "react-qr-code";
import { TemplateSettings, defaultSettings } from "@/components/template-settings/types";
import { DynamicStamp } from "./DynamicStamp";
import { CustomStampRenderer } from "./CustomStampRenderer";
import { CustomTextElement } from "@/components/custom-text/types";

interface ReceiptTemplateProps {
  documentNumber: string;
  verificationCode: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  description: string;
  period?: string;
  amount: number;
  invoiceNumber?: string;
  paymentDate?: Date;
  settings?: TemplateSettings;
  customTextElements?: CustomTextElement[];
  forPdfCapture?: boolean; // When true, use exact pixel dimensions for PDF
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
      period,
      amount,
      invoiceNumber,
      paymentDate,
      settings: propSettings,
      customTextElements = [],
      forPdfCapture,
    },
    ref
  ) => {
    // Merge with defaults
    const settings = { ...defaultSettings, ...propSettings };

    const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });
    const formattedPaymentDate = paymentDate
      ? format(paymentDate, "dd MMMM yyyy", { locale: localeId })
      : formattedDate;
    const verificationUrl = `https://sewascaffoldingbali.com/verify/${verificationCode}`;

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

    const getLogoJustify = () => {
      switch (settings.logo_position) {
        case "center": return "justify-center";
        case "right": return "justify-end";
        default: return "justify-start";
      }
    };

    // Get layout settings for QR verification
    const layoutSettings = settings.receipt_layout_settings;

    // Override dimensions for PDF capture to ensure exact pixel match
    // ALWAYS use pixel dimensions to ensure preview and PDF are identical
    const containerStyle = {
      fontFamily: getFontFamily(),
      fontSize: `${settings.font_size_base || 14}px`,
      width: '793px',
      minHeight: '1122px',
    };

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 pb-12 mx-auto shadow-lg relative overflow-visible"
        style={containerStyle}
      >
        {/* Watermark - dengan class watermark-centered untuk preserve transform saat print */}
        {settings.show_watermark && (
          <div 
            className="absolute pointer-events-none z-50 watermark-centered"
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
            className="flex items-start justify-between pb-4 mb-6 border-b-2"
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
                    {settings.company_name || 'Perusahaan'}
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
                {settings.show_company_address !== false && settings.company_address && (
                  <p 
                    className="text-sm flex items-center gap-1 mt-1"
                    style={{ color: settings.company_info_color || '#4b5563' }}
                  >
                    {settings.icon_maps_url ? (
                      <img src={settings.icon_maps_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                    ) : (
                      <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                    )}
                    {settings.company_address}
                  </p>
                )}

                {/* Phone */}
                {settings.show_company_phone !== false && settings.company_phone && (
                  <p 
                    className="text-sm flex items-center gap-1 mt-1"
                    style={{ color: settings.company_info_color || '#4b5563' }}
                  >
                    {settings.icon_whatsapp_url ? (
                      <img src={settings.icon_whatsapp_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                    ) : (
                      <Phone className="h-3 w-3 flex-shrink-0 text-green-500" />
                    )}
                    {settings.company_phone}
                  </p>
                )}
                
                {/* Email */}
                {settings.show_company_email !== false && settings.company_email && (
                  <p 
                    className="text-sm flex items-center gap-1 mt-1"
                    style={{ color: settings.company_info_color || '#4b5563' }}
                  >
                    {settings.icon_email_url ? (
                      <img src={settings.icon_email_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                    ) : (
                      <Mail className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                    )}
                    {settings.company_email}
                  </p>
                )}
                
                {/* Website */}
                {settings.show_company_website !== false && settings.company_website && (
                  <p 
                    className="text-sm flex items-center gap-1 mt-1"
                    style={{ color: settings.company_info_color || '#4b5563' }}
                  >
                    {settings.icon_website_url ? (
                      <img src={settings.icon_website_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" />
                    ) : (
                      <Globe className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                    )}
                    {settings.company_website}
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
                    <span className="text-lg font-bold ml-2">{documentNumber}</span>
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
                {clientName}
              </p>
              {clientAddress && (
                <p 
                  className="text-sm"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {clientAddress}
                </p>
              )}
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
                    {/* Judul - Bold & Hitam Pekat */}
                    <div className="font-bold text-black">{description}</div>
                    {/* Sub-teks - Abu-abu Tua, Font Normal */}
                    {invoiceNumber && (
                      <div className="text-sm text-gray-600 mt-1">
                        Mengacu pada Invoice {invoiceNumber}
                      </div>
                    )}
                    {period && (
                      <div className="text-sm text-gray-600">
                        Periode: {period}
                      </div>
                    )}
                    {/* Kalimat Penutup - Italic */}
                    <div className="text-sm text-gray-500 mt-2 italic">
                      Terima kasih, pembayaran telah kami terima dengan baik.
                    </div>
                  </td>
                  <td 
                    className="px-4 py-3 text-right font-semibold"
                    style={{ 
                      border: settings.table_border_style === 'none' ? 'none' : '1px solid',
                      borderColor: settings.border_color 
                    }}
                  >
                    {formatRupiah(amount)}
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
                    {formatRupiah(amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {settings.show_terbilang && (
              <p className="mt-2 text-sm italic text-gray-600">
                {settings.label_terbilang || 'Terbilang:'} <span className="font-medium">{terbilang(amount)}</span>
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
                  <p className="text-sm font-mono">{settings.bank_account_number}</p>
                  <p className="text-sm text-gray-600">a/n {settings.bank_account_name}</p>
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

        </div>
        
        {/* Footer Section - Unified Flex Layout untuk Print Stability */}
        <div className="invoice-footer-section flex justify-between items-end px-8 pb-4 mt-8" style={{ pageBreakInside: 'avoid' }}>
          
          {/* Left Side: QR Verification - IN FLOW, not absolute */}
          {settings.show_qr_code ? (
            <div className="flex items-center gap-3 bg-white/95 p-3 rounded-lg shadow-sm border border-gray-100" data-qr="verification">
              <QRCode 
                value={verificationUrl} 
                size={layoutSettings?.qr_size ?? settings.qr_size ?? 80} 
              />
              <div className="text-sm">
                <p className="text-gray-500">{settings.qr_verification_title || 'Scan untuk verifikasi dokumen'}</p>
                <p className="font-mono text-xs text-gray-400 mt-1">{settings.qr_verification_label || 'Kode:'} {verificationCode}</p>
                {settings.show_qr_verification_url !== false && (
                  <p className="text-xs text-blue-600 break-all max-w-[150px]">{verificationUrl}</p>
                )}
              </div>
            </div>
          ) : (
            <div /> 
          )}
          
          {/* Right Side: Unified Signature Block */}
          {settings.show_signature !== false && (
            <div className="flex flex-col items-center text-center min-w-[200px]">
              {/* 1. Label with individual styling */}
              <p 
                className="mb-2"
                style={{
                  fontSize: `${settings.signature_label_font_size ?? 14}px`,
                  fontFamily: settings.signature_label_font_family === 'inherit' 
                    ? getFontFamily() 
                    : settings.signature_label_font_family,
                  color: settings.signature_label_color ?? '#4b5563',
                  transform: `translate(${settings.signature_label_position_x ?? 0}px, ${settings.signature_label_position_y ?? 0}px)`
                }}
              >
                {settings.signature_label || 'Hormat Kami,'}
              </p>
              
              {/* 2. Image Container - fixed height to hold signature */}
              <div className="relative h-20 w-full flex items-center justify-center my-2">
                {settings.signature_url && (
                  <img 
                    src={settings.signature_url} 
                    alt="Signature" 
                    className="max-h-16 max-w-[150px] object-contain"
                    style={{ opacity: (layoutSettings?.signature_opacity ?? 100) / 100 }}
                  />
                )}
              </div>
              
              {/* 3. Name with individual styling */}
              <p 
                className="mt-2"
                style={{
                  fontSize: `${settings.signer_name_font_size ?? 14}px`,
                  fontFamily: settings.signer_name_font_family === 'inherit' 
                    ? getFontFamily() 
                    : settings.signer_name_font_family,
                  color: settings.signer_name_color ?? '#1f2937',
                  fontWeight: 600,
                  transform: `translate(${settings.signer_name_position_x ?? 0}px, ${settings.signer_name_position_y ?? 0}px)`
                }}
              >
                {settings.signer_name || settings.company_name}
              </p>
              
              {/* 4. Title with individual styling */}
              {settings.signer_title && (
                <p 
                  style={{
                    fontSize: `${settings.signer_title_font_size ?? 12}px`,
                    fontFamily: settings.signer_title_font_family === 'inherit' 
                      ? getFontFamily() 
                      : settings.signer_title_font_family,
                    color: settings.signer_title_color ?? '#6b7280',
                    transform: `translate(${settings.signer_title_position_x ?? 0}px, ${settings.signer_title_position_y ?? 0}px)`
                  }}
                >
                  {settings.signer_title}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Text - Centered below */}
        {settings.show_footer !== false && settings.footer_text && (
          <div className="text-center text-sm text-gray-500 mb-4 px-8">{settings.footer_text}</div>
        )}

        {/* Fixed-positioned Stamp - dengan class stamp-positioned untuk preserve transform saat print */}
        {settings.show_stamp && settings.show_stamp_on_receipt !== false && (
          <div 
            className="absolute pointer-events-none z-40 stamp-positioned"
            style={{
              left: `${settings.receipt_layout_settings?.stamp_position_x ?? settings.stamp_position_x ?? 10}%`,
              top: `${settings.receipt_layout_settings?.stamp_position_y ?? 70}%`,
              transform: `translate(-50%, -50%) rotate(${settings.receipt_layout_settings?.stamp_rotation ?? settings.stamp_rotation ?? 0}deg) scale(${settings.receipt_layout_settings?.stamp_scale ?? settings.stamp_scale ?? 1})`
            }}
          >
            {settings.stamp_source === 'custom' ? (
              <CustomStampRenderer
                documentNumber={documentNumber}
                companyName={settings.company_name || ''}
                date={format(issuedAt, 'dd/MM/yyyy')}
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
                documentNumber={documentNumber}
                companyName={settings.company_name || 'Perusahaan'}
                date={format(issuedAt, 'dd/MM/yyyy')}
                settings={settings}
              />
            )}
          </div>
        )}

        {/* Custom Text Elements */}
        {customTextElements.filter(el => el.is_visible).map(element => (
          <div
            key={element.id}
            className="absolute pointer-events-none"
            style={{
              left: `${element.position_x}%`,
              top: `${element.position_y}%`,
              fontSize: `${element.font_size}px`,
              color: element.font_color,
              fontWeight: element.font_weight,
              fontFamily: element.font_family,
              textAlign: element.text_align as 'left' | 'center' | 'right',
              transform: `rotate(${element.rotation}deg)`,
              zIndex: 35,
            }}
          >
            {element.content}
          </div>
        ))}
      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";
