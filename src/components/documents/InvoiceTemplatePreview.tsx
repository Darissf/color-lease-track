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

interface InvoiceTemplatePreviewProps {
  settings: TemplateSettings;
  customTextElements?: CustomTextElement[];
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: Partial<CustomTextElement>) => void;
}

export function InvoiceTemplatePreview({ 
  settings,
  customTextElements = [],
  selectedElementId,
  onSelectElement,
  onUpdateElement
}: InvoiceTemplatePreviewProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const sampleData = {
    documentNumber: `${settings.invoice_prefix || 'INV'}-2025-0001`,
    verificationCode: "ABC123XYZ",
    issuedAt: new Date(),
    clientName: "PT. Contoh Klien",
    clientAddress: "Jl. Contoh Alamat No. 123, Denpasar",
    description: "Sewa Scaffolding 50 Set",
    amount: 15000000,
    companyName: settings.company_name || "Sewa Scaffolding Bali",
    companyAddress: settings.company_address || "Jl. Raya Denpasar No. 99",
    companyPhone: settings.company_phone || "081234567890",
    companyEmail: settings.company_email || "info@example.com",
    companyWebsite: settings.company_website || "www.example.com",
    ownerName: settings.signer_name || "John Doe",
    signerTitle: settings.signer_title || "Direktur",
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
      ref={documentRef}
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
                  {settings.document_title || 'INVOICE'}
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
              {settings.label_client || 'Kepada Yth:'}
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
                  <div className="font-medium">{sampleData.description}</div>
                  <div className="text-sm text-gray-500 mt-1">Ref: {sampleData.contractInvoice}</div>
                  <div className="text-sm text-gray-500">Periode: {sampleData.period}</div>
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
                  {settings.label_total || 'Total'}
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

        {/* Bank Info Section OR Payment Link */}
        {settings.use_payment_link ? (
          <div 
            className="mb-6 p-4 rounded-lg text-center"
            style={{ 
              backgroundColor: `${settings.accent_color}10`,
              border: `1px solid ${settings.border_color}` 
            }}
          >
            <p className="text-sm text-gray-600 mb-2">Untuk melakukan pembayaran, klik tombol di bawah:</p>
            <div 
              className="inline-block px-6 py-2 rounded-lg font-semibold text-white cursor-pointer"
              style={{ backgroundColor: settings.accent_color }}
            >
              {settings.payment_link_text || 'Generate Pembayaran'}
            </div>
            <p className="text-xs text-gray-500 mt-2">Link pembayaran akan expired setelah invoice lunas</p>
          </div>
        ) : settings.show_bank_info && settings.bank_name && (
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

        {/* Payment Transfer Section */}
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
              {/* QR Code for Payment */}
              {settings.payment_qr_enabled !== false && (
                <div className="flex-shrink-0 text-center">
                  <QRCode value={verificationUrl} size={80} />
                  <p className="text-xs mt-1 text-gray-500">Scan untuk verifikasi</p>
                </div>
              )}
              {/* Instructions */}
              <div className="flex-1 text-sm">
                <p className="text-gray-600 mb-2">
                  {settings.payment_instruction_text || 'Silahkan scan barcode ini atau buka link untuk pengecekan pembayaran otomatis. Apabila transfer manual, silahkan transfer ke rekening berikut dan konfirmasi via WhatsApp.'}
                </p>
                <div className="mt-2">
                  <p className="font-medium">Bank {settings.bank_name || 'BCA'}</p>
                  <p>No. Rek: {settings.bank_account_number || '7445130885'}</p>
                  <p>a.n {settings.bank_account_name || 'Daris Farostian'}</p>
                </div>
                {settings.payment_wa_hyperlink_enabled !== false && (
                  <p className="mt-2">
                    Konfirmasi: 
                    <a 
                      href={`https://wa.me/${(settings.payment_wa_number || '+6289666666632').replace(/\D/g, '')}`} 
                      className="text-blue-600 underline ml-1"
                    >
                      {settings.payment_wa_number || '+62 896 6666 6632'}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {settings.show_terms !== false && settings.terms_conditions && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Syarat & Ketentuan:</h3>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{settings.terms_conditions}</p>
          </div>
        )}

        {/* Custom Note */}
        {settings.show_custom_note && settings.custom_note && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 whitespace-pre-wrap">{settings.custom_note}</p>
          </div>
        )}

        {/* Signature & Stamp Section - Stamp position locked relative to signature */}
        {settings.show_signature !== false && (
          <div className="flex justify-end items-end mb-8 relative">
            {/* Stamp - positioned relative to signature section */}
            {settings.show_stamp_on_invoice && (
              <div 
                className="absolute pointer-events-none z-40"
                style={{
                  right: '140px',
                  top: '0px',
                  transform: `rotate(${settings.invoice_layout_settings?.stamp_rotation ?? settings.stamp_rotation ?? 0}deg) scale(${settings.invoice_layout_settings?.stamp_scale ?? settings.stamp_scale ?? 1})`
                }}
              >
                {settings.stamp_source === 'custom' ? (
                  <CustomStampRenderer
                    documentNumber={sampleData.documentNumber}
                    companyName={settings.company_name || ''}
                    date={format(new Date(), 'dd/MM/yyyy')}
                    opacity={settings.stamp_opacity}
                  />
                ) : (
                  <DynamicStamp
                    status={settings.stamp_use_custom_text ? 'CUSTOM' : 'BELUM_LUNAS'}
                    customText={settings.stamp_custom_text}
                    documentNumber={sampleData.documentNumber}
                    companyName={settings.company_name || ''}
                    date={format(new Date(), 'dd/MM/yyyy')}
                    settings={settings}
                  />
                )}
              </div>
            )}

            {/* Signature on RIGHT */}
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
              <p className="font-semibold mt-2">{sampleData.ownerName}</p>
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

        {/* QR Verification */}
        {settings.show_qr_code && settings.qr_position === 'bottom-section' && (
          <div className="border-t-2 border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-4">
              <QRCode value={verificationUrl} size={settings.invoice_layout_settings?.qr_size ?? settings.qr_size ?? 80} />
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

        {/* Positioned QR Code */}
        {settings.show_qr_code && settings.qr_position !== 'bottom-section' && (
          <div className={getQRPosition()}>
            <QRCode value={verificationUrl} size={settings.invoice_layout_settings?.qr_size ?? settings.qr_size ?? 80} />
          </div>
        )}

        {/* Custom Text Elements */}
        {customTextElements.filter(el => el.is_visible).map(element => (
          <DraggableTextBox
            key={element.id}
            element={element}
            isSelected={selectedElementId === element.id}
            onSelect={() => onSelectElement?.(element.id)}
            onUpdate={(updates) => onUpdateElement?.(element.id, updates)}
            onDelete={() => {}}
            containerRef={documentRef}
          />
        ))}
      </div>
    </div>
  );
}
