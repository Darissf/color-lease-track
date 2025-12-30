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

interface InvoiceTemplateProps {
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
      contractInvoice,
      period,
      settings: propSettings,
      contractBankInfo,
    },
    ref
  ) => {
    // Merge with defaults
    const settings = { ...defaultSettings, ...propSettings };

    const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });
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

    const getQRPosition = () => {
      switch (settings.qr_position) {
        case "top-right": return "absolute top-8 right-8";
        case "bottom-right": return "absolute bottom-8 right-8";
        case "bottom-left": return "absolute bottom-8 left-8";
        default: return "";
      }
    };

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-lg relative overflow-hidden"
        style={{ 
          fontFamily: getFontFamily(),
          fontSize: `${settings.font_size_base || 14}px`
        }}
      >
        {/* Watermark */}
        {settings.show_watermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            style={{ opacity: (settings.watermark_opacity || 10) / 100 }}
          >
            {settings.watermark_type === 'logo' && settings.invoice_logo_url ? (
              <img 
                src={settings.invoice_logo_url} 
                alt="" 
                className="w-96 h-96 object-contain transform rotate-[-15deg]" 
              />
            ) : (
              <span 
                className="text-9xl font-bold text-gray-300 transform rotate-[-45deg] whitespace-nowrap"
                style={{ fontFamily: getHeadingFontFamily() }}
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
                    {settings.document_title || 'INVOICE'}
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
                Kepada:
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

          {/* Invoice Details Table */}
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
                    <div className="font-medium">{description}</div>
                    {contractInvoice && (
                      <div className="text-sm text-gray-500 mt-1">No. Invoice: {contractInvoice}</div>
                    )}
                    {period && (
                      <div className="text-sm text-gray-500">Periode: {period}</div>
                    )}
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
                    Total
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

          {/* Payment Link Section */}
          {settings.use_payment_link && settings.payment_link_text && (
            <div 
              className="mb-6 p-4 rounded-lg"
              style={{ 
                backgroundColor: `${settings.accent_color}08`,
                border: `1px solid ${settings.border_color}` 
              }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: settings.header_color_primary }}>
                {settings.payment_link_text || 'Bayar Online'}
              </h3>
            </div>
          )}

        {/* Bank Info Section - prioritize contract bank info over settings */}
          {settings.show_bank_info && (contractBankInfo?.bank_name || settings.bank_name) && !settings.use_payment_link && (
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
                  <p className="font-medium">{contractBankInfo?.bank_name || settings.bank_name}</p>
                  <p className="text-sm font-mono">{contractBankInfo?.account_number || settings.bank_account_number}</p>
                  <p className="text-sm text-gray-600">a/n {contractBankInfo?.account_holder_name || settings.bank_account_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {settings.show_terms && settings.terms_conditions && (
            <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold mb-1" style={{ color: settings.header_color_primary }}>
                Syarat & Ketentuan:
              </h4>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{settings.terms_conditions}</p>
            </div>
          )}

          {/* Custom Note */}
          {settings.show_custom_note && settings.custom_note && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 whitespace-pre-wrap">{settings.custom_note}</p>
            </div>
          )}

          {/* Signature & Stamp Section */}
          {settings.show_signature !== false && (
            <div className={`flex items-end mb-8 ${settings.signature_position === 'left' ? 'justify-start' : 'justify-end'}`}>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">{settings.signature_label || 'Hormat Kami,'}</p>
                {settings.signature_url ? (
                  <img 
                    src={settings.signature_url} 
                    alt="Signature" 
                    className="h-16 w-auto mx-auto object-contain"
                  />
                ) : (
                  <div className="h-16 w-32 border-b border-gray-400" />
                )}
                <p className="font-semibold mt-2">{settings.signer_name || settings.company_name}</p>
                {settings.signer_title && (
                  <p className="text-sm text-gray-500">{settings.signer_title}</p>
                )}
              </div>
            </div>
          )}

          {/* Free-positioned Stamp - uses invoice_layout_settings */}
          {settings.show_stamp && settings.show_stamp_on_invoice && (
            <div 
              className="absolute pointer-events-none"
              style={{
                left: `${settings.invoice_layout_settings?.stamp_position_x ?? settings.stamp_position_x ?? 10}%`,
                top: `${settings.invoice_layout_settings?.stamp_position_y ?? settings.stamp_position_y ?? 70}%`,
                transform: `translate(-50%, -50%) rotate(${settings.invoice_layout_settings?.stamp_rotation ?? settings.stamp_rotation ?? 0}deg) scale(${settings.invoice_layout_settings?.stamp_scale ?? settings.stamp_scale ?? 1})`
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
                  status={settings.stamp_use_custom_text ? 'CUSTOM' : 'BELUM_LUNAS'}
                  customText={settings.stamp_custom_text}
                  documentNumber={documentNumber}
                  companyName={settings.company_name || ''}
                  date={format(issuedAt, 'dd/MM/yyyy')}
                  settings={settings}
                />
              )}
            </div>
          )}

          {/* Footer */}
          {settings.show_footer !== false && settings.footer_text && (
            <div className="text-center text-sm text-gray-500 mb-4">
              {settings.footer_text}
            </div>
          )}

          {/* QR Verification */}
          {settings.show_qr_code && settings.qr_position === 'bottom-section' && (
            <div className="border-t-2 border-gray-200 pt-4 mt-4">
              <div className="flex items-center gap-4">
                <QRCode value={verificationUrl} size={settings.invoice_layout_settings?.qr_size ?? settings.qr_size ?? 80} />
                <div className="text-sm">
                  <p className="text-gray-500">Scan untuk verifikasi dokumen</p>
                  <p className="font-mono text-xs text-gray-400 mt-1">
                    Kode: {verificationCode}
                  </p>
                  <p className="text-xs text-blue-600 break-all">{verificationUrl}</p>
                </div>
              </div>
            </div>
          )}

          {/* Positioned QR Code */}
          {settings.show_qr_code && settings.qr_position !== 'bottom-section' && (
            <div className={getQRPosition()}>
              <QRCode value={verificationUrl} size={settings.invoice_layout_settings?.qr_size ?? settings.qr_size ?? 80} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = "InvoiceTemplate";
