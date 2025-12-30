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
  accessCode?: string; // For public contract link (payment QR)
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
      accessCode,
    },
    ref
  ) => {
    // Merge with defaults
    const settings = { ...defaultSettings, ...propSettings };

    const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });
    const verificationUrl = `https://sewascaffoldingbali.com/verify/${verificationCode}`;
    // Payment URL for QR in Payment Transfer section - links to public contract page
    const paymentUrl = accessCode 
      ? `https://sewascaffoldingbali.com/contract/${accessCode}` 
      : verificationUrl;

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
        {/* Watermark - uses invoice_layout_settings */}
        {settings.show_watermark && (
          <div 
            className="absolute pointer-events-none z-50"
            style={{ 
              left: `${settings.invoice_layout_settings?.watermark_position_x ?? settings.watermark_position_x ?? 50}%`,
              top: `${settings.invoice_layout_settings?.watermark_position_y ?? settings.watermark_position_y ?? 50}%`,
              transform: `translate(-50%, -50%) rotate(${settings.invoice_layout_settings?.watermark_rotation ?? settings.watermark_rotation ?? -45}deg)`,
              opacity: (settings.invoice_layout_settings?.watermark_opacity ?? settings.watermark_opacity ?? 10) / 100
            }}
          >
            {settings.watermark_type === 'logo' && settings.invoice_logo_url ? (
              <img 
                src={settings.invoice_logo_url} 
                alt="" 
                style={{ 
                  width: `${settings.invoice_layout_settings?.watermark_size ?? settings.watermark_size ?? 300}px`,
                  height: 'auto'
                }}
                className="object-contain" 
              />
            ) : (
              <span 
                className="font-bold text-gray-300 whitespace-nowrap"
                style={{ 
                  fontFamily: getHeadingFontFamily(),
                  fontSize: `${settings.invoice_layout_settings?.watermark_size ?? settings.watermark_size ?? 300}px`
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

          {/* Payment Transfer Section - prioritize contract bank info over settings */}
          {settings.show_payment_section !== false && (
            <div 
              className="mb-6 p-4 rounded-lg"
              style={{ 
                backgroundColor: `${settings.accent_color}08`,
                border: `1px solid ${settings.border_color}` 
              }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: settings.header_color_primary }}>
                Pembayaran Transfer
              </h3>
              <div className="flex gap-4">
              {/* QR Code for Payment - links to public contract page for payment */}
                {settings.payment_qr_enabled !== false && (
                  <div className="flex-shrink-0 text-center">
                    <QRCode value={paymentUrl} size={80} />
                    <p className="text-xs mt-1 text-gray-500">
                      {accessCode ? 'Scan untuk pembayaran' : 'Scan untuk verifikasi'}
                    </p>
                  </div>
                )}
                {/* Instructions */}
                <div className="flex-1 text-sm">
                  <p className="text-gray-600 mb-2">
                    {settings.payment_instruction_text || 'Silahkan scan barcode ini atau buka link untuk pengecekan pembayaran otomatis. Apabila transfer manual, silahkan transfer ke rekening berikut dan konfirmasi via WhatsApp.'}
                  </p>
                  <div className="mt-2">
                    <p className="font-medium">Bank {contractBankInfo?.bank_name || settings.bank_name || 'BCA'}</p>
                    <p>No. Rek: {contractBankInfo?.account_number || settings.bank_account_number}</p>
                    <p>a.n {contractBankInfo?.account_holder_name || settings.bank_account_name}</p>
                  </div>
                  {settings.payment_wa_hyperlink_enabled !== false && settings.payment_wa_number && (
                    <p className="mt-2">
                      Konfirmasi: 
                      <a 
                        href={`https://wa.me/${settings.payment_wa_number.replace(/\D/g, '')}`} 
                        className="text-blue-600 underline ml-1"
                      >
                        {settings.payment_wa_number}
                      </a>
                    </p>
                  )}
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

          {/* Signature & Stamp Section - Relative container with absolute stamp */}
          {settings.show_signature !== false && (
            <div 
              className={`mb-8 relative ${settings.signature_position === 'left' ? 'text-left' : 'text-right'}`}
              style={{ minHeight: '150px' }}
            >
              {/* Stamp - Absolute positioning inside signature container */}
              {settings.show_stamp && settings.show_stamp_on_invoice && (
                <div 
                  className="absolute pointer-events-none z-40"
                  style={{
                    // Position relative to signature container with offset
                    left: settings.signature_position === 'left' 
                      ? `${settings.invoice_layout_settings?.stamp_position_x ?? 10}%`
                      : `${Math.max(0, (settings.invoice_layout_settings?.stamp_position_x ?? 50) - 30)}%`,
                    top: `${Math.max(0, Math.min(100, (settings.invoice_layout_settings?.stamp_position_y ?? 70) - 60))}%`,
                    transform: `rotate(${settings.invoice_layout_settings?.stamp_rotation ?? settings.stamp_rotation ?? 0}deg) scale(${settings.invoice_layout_settings?.stamp_scale ?? settings.stamp_scale ?? 1})`
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

              {/* Signature */}
              <div className={`inline-block text-center ${settings.signature_position === 'left' ? '' : 'ml-auto'}`}>
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
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = "InvoiceTemplate";
