import { forwardRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
import { MapPin, Phone, Mail, Globe } from "lucide-react";
import { TemplateSettings, defaultSettings } from "@/components/template-settings/types";

interface LineItem {
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  subtotal?: number;
}

interface InvoiceRincianTemplateProps {
  documentNumber: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  period?: string;
  settings?: TemplateSettings;
  lineItems: LineItem[];
  transportDelivery: number;
  transportPickup: number;
  discount: number;
  forPdfCapture?: boolean;
  fullRincian?: boolean; // When false, only show No, Nama Item, Qty
}

export const InvoiceRincianTemplate = forwardRef<HTMLDivElement, InvoiceRincianTemplateProps>(
  (
    {
      documentNumber,
      issuedAt,
      clientName,
      clientAddress,
      period,
      settings: propSettings,
      lineItems,
      transportDelivery,
      transportPickup,
      discount,
      forPdfCapture,
      fullRincian = true, // Default to full details
    },
    ref
  ) => {
    const settings = { ...defaultSettings, ...propSettings };
    const formattedDate = format(issuedAt, "dd MMMM yyyy", { locale: localeId });

    // Calculate totals
    const subtotalSewa = lineItems.reduce((sum, item) => {
      const subtotal = item.subtotal || (item.quantity * item.unit_price_per_day * item.duration_days);
      return sum + subtotal;
    }, 0);
    const totalTransport = (transportDelivery || 0) + (transportPickup || 0);
    const grandTotal = subtotalSewa + totalTransport - (discount || 0);

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

    return (
      <div
        ref={ref}
        className="paper-document bg-white text-gray-900 relative overflow-visible"
        style={{
          fontFamily: getFontFamily(),
          fontSize: `${settings.font_size_base || 14}px`,
        }}
      >
        {/* Watermark - SAME AS PAGE 1 */}
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
              />
            ) : (
              <span 
                className="font-bold text-gray-400 whitespace-nowrap"
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
        {/* Header Stripe Bar - SAME AS PAGE 1 */}
        {settings.show_header_stripe && (
          <div
            className="-mx-8 -mt-8 mb-6"
            style={{ 
              height: `${settings.header_stripe_height || 12}px`,
              background: `linear-gradient(to right, ${settings.header_color_primary}, ${settings.header_color_secondary})` 
            }}
          />
        )}

        {/* Header - EXACT COPY FROM InvoiceTemplate */}
        <div 
          className="flex items-start justify-between pb-4 mb-6 border-b-2"
          style={{ borderColor: settings.border_color }}
        >
          <div className="flex items-start gap-4">
            {settings.invoice_logo_url ? (
              <img 
                src={settings.invoice_logo_url} 
                alt="Company Logo" 
                className="h-20 w-20 object-contain rounded-lg"
                crossOrigin="anonymous"
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

              {/* Address with Icon */}
              {settings.show_company_address !== false && settings.company_address && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_maps_url ? (
                    <img src={settings.icon_maps_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                  )}
                  {settings.company_address}
                </p>
              )}

              {/* Phone with Icon */}
              {settings.show_company_phone !== false && settings.company_phone && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_whatsapp_url ? (
                    <img src={settings.icon_whatsapp_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <Phone className="h-3 w-3 flex-shrink-0 text-green-500" />
                  )}
                  {settings.company_phone}
                </p>
              )}
              
              {/* Email with Icon */}
              {settings.show_company_email !== false && settings.company_email && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_email_url ? (
                    <img src={settings.icon_email_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <Mail className="h-3 w-3 flex-shrink-0" style={{ color: settings.header_color_primary }} />
                  )}
                  {settings.company_email}
                </p>
              )}
              
              {/* Website with Icon */}
              {settings.show_company_website !== false && settings.company_website && (
                <p 
                  className="text-sm flex items-center gap-1 mt-1"
                  style={{ color: settings.company_info_color || '#4b5563' }}
                >
                  {settings.icon_website_url ? (
                    <img src={settings.icon_website_url} alt="" className="h-3 w-3 flex-shrink-0 object-contain" crossOrigin="anonymous" />
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
          
          {/* Document Type & Number - Right Side */}
          <div className="text-right">
            <h2 
              className="text-xl font-bold mb-2" 
              style={{ 
                color: settings.document_title_color || settings.header_color_primary,
                fontFamily: getHeadingFontFamily()
              }}
            >
              RINCIAN SEWA
            </h2>
            <div 
              className="px-4 py-1 inline-block border-2" 
              style={{ borderColor: settings.header_color_primary }}
            >
              <span className="text-sm text-gray-500">NO.</span>
              <span className="text-lg font-bold ml-2">{documentNumber}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{formattedDate}</p>
          </div>
        </div>

        {/* Client Info */}
        <div 
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <p className="text-sm mb-1" style={{ color: settings.label_color || '#6b7280' }}>Kepada:</p>
          <p className="font-semibold text-lg" style={{ color: settings.value_color || '#1f2937' }}>{clientName}</p>
          {period && (
            <p className="text-sm text-gray-500 mt-1">Periode: {period}</p>
          )}
        </div>

        {/* Section A: Item Sewa */}
        <h3
          className="font-bold text-base mt-4 mb-3 pb-1"
          style={{ 
            color: settings.header_color_primary,
            borderBottom: `1px solid #e5e7eb`,
          }}
        >
          A. ITEM SEWA
        </h3>

        {/* Rincian Table - Conditional columns based on fullRincian */}
        <table className="w-full mb-4" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: settings.table_header_bg || '#f3f4f6' }}>
              <th
                className="p-2 text-center text-sm font-bold"
                style={{ 
                  width: '35px',
                  border: `1px solid ${settings.border_color}`,
                  color: settings.table_header_text_color || '#374151',
                }}
              >
                No
              </th>
              <th
                className="p-2 text-left text-sm font-bold"
                style={{ 
                  border: `1px solid ${settings.border_color}`,
                  color: settings.table_header_text_color || '#374151',
                }}
              >
                Nama Item
              </th>
              <th
                className="p-2 text-center text-sm font-bold"
                style={{ 
                  width: '55px',
                  border: `1px solid ${settings.border_color}`,
                  color: settings.table_header_text_color || '#374151',
                }}
              >
                Qty
              </th>
              {fullRincian && (
                <>
                  <th
                    className="p-2 text-right text-sm font-bold"
                    style={{ 
                      width: '100px',
                      border: `1px solid ${settings.border_color}`,
                      color: settings.table_header_text_color || '#374151',
                    }}
                  >
                    Harga/Hari
                  </th>
                  <th
                    className="p-2 text-center text-sm font-bold"
                    style={{ 
                      width: '70px',
                      border: `1px solid ${settings.border_color}`,
                      color: settings.table_header_text_color || '#374151',
                    }}
                  >
                    Durasi
                  </th>
                  <th
                    className="p-2 text-right text-sm font-bold"
                    style={{ 
                      width: '120px',
                      border: `1px solid ${settings.border_color}`,
                      color: settings.table_header_text_color || '#374151',
                    }}
                  >
                    Subtotal
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => {
              const itemSubtotal = item.subtotal || (item.quantity * item.unit_price_per_day * item.duration_days);
              return (
                <tr key={index}>
                  <td
                    className="p-2 text-center text-sm"
                    style={{ border: `1px solid ${settings.border_color}` }}
                  >
                    {index + 1}
                  </td>
                  <td
                    className="p-2 text-left text-sm"
                    style={{ border: `1px solid ${settings.border_color}` }}
                  >
                    {item.item_name}
                  </td>
                  <td
                    className="p-2 text-center text-sm"
                    style={{ border: `1px solid ${settings.border_color}` }}
                  >
                    {item.quantity}
                  </td>
                  {fullRincian && (
                    <>
                      <td
                        className="p-2 text-right text-sm"
                        style={{ border: `1px solid ${settings.border_color}` }}
                      >
                        {formatRupiah(item.unit_price_per_day)}
                      </td>
                      <td
                        className="p-2 text-center text-sm"
                        style={{ border: `1px solid ${settings.border_color}` }}
                      >
                        {item.duration_days} hari
                      </td>
                      <td
                        className="p-2 text-right text-sm font-bold"
                        style={{ border: `1px solid ${settings.border_color}` }}
                      >
                        {formatRupiah(itemSubtotal)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Subtotal Sewa - Only show if fullRincian */}
        {fullRincian && (
          <div className="flex justify-between py-2 px-3" style={{ backgroundColor: '#f9fafb' }}>
            <span className="text-sm" style={{ color: '#4b5563' }}>Subtotal Sewa</span>
            <span className="text-sm font-bold">{formatRupiah(subtotalSewa)}</span>
          </div>
        )}

        {/* Section B: Ongkos Transport - Only show if fullRincian */}
        {fullRincian && (transportDelivery > 0 || transportPickup > 0) && (
          <>
            <h3
              className="font-bold text-base mt-5 mb-3 pb-1"
              style={{ 
                color: settings.header_color_primary,
                borderBottom: `1px solid #e5e7eb`,
              }}
            >
              B. ONGKOS TRANSPORT
            </h3>

            {transportDelivery > 0 && (
              <div className="flex justify-between py-2 px-3">
                <span className="text-sm" style={{ color: '#4b5563' }}>Pengiriman</span>
                <span className="text-sm font-bold">{formatRupiah(transportDelivery)}</span>
              </div>
            )}

            {transportPickup > 0 && (
              <div className="flex justify-between py-2 px-3">
                <span className="text-sm" style={{ color: '#4b5563' }}>Pengambilan</span>
                <span className="text-sm font-bold">{formatRupiah(transportPickup)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 px-3" style={{ backgroundColor: '#f9fafb' }}>
              <span className="text-sm" style={{ color: '#4b5563' }}>Total Transport</span>
              <span className="text-sm font-bold">{formatRupiah(totalTransport)}</span>
            </div>
          </>
        )}

        {/* Section C: Diskon - Only show if fullRincian */}
        {fullRincian && discount > 0 && (
          <>
            <h3
              className="font-bold text-base mt-5 mb-3 pb-1"
              style={{ 
                color: settings.header_color_primary,
                borderBottom: `1px solid #e5e7eb`,
              }}
            >
              C. DISKON
            </h3>

            <div className="flex justify-between py-2 px-3">
              <span className="text-sm" style={{ color: '#4b5563' }}>Potongan Harga</span>
              <span className="text-sm font-bold" style={{ color: '#dc2626' }}>-{formatRupiah(discount)}</span>
            </div>
          </>
        )}

        {/* Grand Total - Only show if fullRincian */}
        {fullRincian && (
          <div 
            className="flex justify-between py-3 px-3 mt-4"
            style={{ 
              backgroundColor: `${settings.accent_color}15`,
              borderTop: `2px solid ${settings.header_color_primary}`,
            }}
          >
            <span className="text-lg font-bold">GRAND TOTAL</span>
            <span 
              className="text-lg font-bold"
              style={{ color: settings.header_color_primary }}
            >
              {formatRupiah(grandTotal)}
            </span>
          </div>
        )}

        {/* Terbilang - Only show if fullRincian */}
        {fullRincian && settings.show_terbilang && (
          <p className="text-sm italic mt-3" style={{ color: '#4b5563' }}>
            {settings.label_terbilang || "Terbilang:"} {terbilang(grandTotal)}
          </p>
        )}

        {/* Footer */}
        {settings.show_footer !== false && settings.footer_text && (
          <p className="text-sm text-center text-gray-500 mt-8">
            {settings.footer_text}
          </p>
        )}
      </div>
    );
  }
);

InvoiceRincianTemplate.displayName = "InvoiceRincianTemplate";

export default InvoiceRincianTemplate;
