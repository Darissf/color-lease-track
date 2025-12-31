import { forwardRef } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatRupiah } from "@/lib/currency";
import { terbilang } from "@/lib/terbilang";
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
        className="bg-white relative overflow-hidden"
        style={{
          width: '793px',
          minHeight: '1122px',
          fontFamily: getFontFamily(),
          fontSize: `${settings.font_size_base || 12}px`,
          padding: '30px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header Stripe */}
        {settings.show_header_stripe && (
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: `${settings.header_stripe_height || 12}px`,
              backgroundColor: settings.header_color_primary,
            }}
          />
        )}

        {/* Content Container */}
        <div style={{ paddingTop: settings.show_header_stripe ? '15px' : '0' }}>
          {/* Header - Same as Page 1 */}
          <div
            className="flex justify-between pb-4 mb-5"
            style={{ 
              borderBottom: `2px solid ${settings.border_color}`,
            }}
          >
            {/* Left: Logo + Company Info */}
            <div className="flex items-start gap-4">
              {settings.invoice_logo_url ? (
                <img
                  src={settings.invoice_logo_url}
                  alt="Logo"
                  className="object-contain"
                  style={{ width: '60px', height: '60px' }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="bg-gray-200 flex items-center justify-center" style={{ width: '60px', height: '60px' }}>
                  <span className="text-gray-400 text-xs">Logo</span>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                {settings.show_company_name !== false && (
                  <h1
                    className="font-bold mb-1"
                    style={{
                      fontSize: '16px',
                      fontFamily: getHeadingFontFamily(),
                      color: settings.company_name_color || settings.header_color_primary,
                    }}
                  >
                    {settings.company_name || "Perusahaan"}
                  </h1>
                )}

                {settings.show_company_tagline && settings.company_tagline && (
                  <p className="italic text-xs" style={{ color: settings.tagline_color || '#6b7280' }}>
                    {settings.company_tagline}
                  </p>
                )}

                {settings.show_company_address !== false && settings.company_address && (
                  <p className="text-xs" style={{ color: settings.company_info_color || '#4b5563' }}>
                    {settings.company_address}
                  </p>
                )}

                {settings.show_company_phone !== false && settings.company_phone && (
                  <p className="text-xs" style={{ color: settings.company_info_color || '#4b5563' }}>
                    Tel: {settings.company_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Document Title & Number */}
            <div className="text-right flex flex-col items-end">
              <h2
                className="font-bold mb-2"
                style={{
                  fontSize: '14px',
                  fontFamily: getHeadingFontFamily(),
                  color: settings.document_title_color || settings.header_color_primary,
                }}
              >
                RINCIAN TAGIHAN
              </h2>
              <div
                className="flex items-center gap-2 px-3 py-1"
                style={{ border: `2px solid ${settings.header_color_primary}` }}
              >
                <span className="text-xs text-gray-500">NO.</span>
                <span className="font-bold text-sm">{documentNumber}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">{formattedDate}</p>
            </div>
          </div>

          {/* Client Info */}
          <div 
            className="mb-4 p-3 rounded"
            style={{ backgroundColor: '#f9fafb' }}
          >
            <p className="text-xs mb-0.5" style={{ color: settings.label_color || '#6b7280' }}>Kepada:</p>
            <p className="font-bold text-sm" style={{ color: settings.value_color || '#1f2937' }}>{clientName}</p>
            {period && (
              <p className="text-xs text-gray-500 mt-1">Periode: {period}</p>
            )}
          </div>

          {/* Section A: Item Sewa */}
          <h3
            className="font-bold text-sm mt-4 mb-2 pb-1"
            style={{ 
              color: settings.header_color_primary,
              borderBottom: `1px solid #e5e7eb`,
            }}
          >
            A. ITEM SEWA
          </h3>

          {/* Rincian Table */}
          <table className="w-full mb-3" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: settings.table_header_bg || '#f3f4f6' }}>
                <th
                  className="p-1.5 text-center text-xs font-bold"
                  style={{ 
                    width: '30px',
                    border: `1px solid ${settings.border_color}`,
                    color: settings.table_header_text_color || '#374151',
                  }}
                >
                  No
                </th>
                <th
                  className="p-1.5 text-left text-xs font-bold"
                  style={{ 
                    border: `1px solid ${settings.border_color}`,
                    color: settings.table_header_text_color || '#374151',
                  }}
                >
                  Nama Item
                </th>
                <th
                  className="p-1.5 text-center text-xs font-bold"
                  style={{ 
                    width: '50px',
                    border: `1px solid ${settings.border_color}`,
                    color: settings.table_header_text_color || '#374151',
                  }}
                >
                  Qty
                </th>
                <th
                  className="p-1.5 text-right text-xs font-bold"
                  style={{ 
                    width: '90px',
                    border: `1px solid ${settings.border_color}`,
                    color: settings.table_header_text_color || '#374151',
                  }}
                >
                  Harga/Hari
                </th>
                <th
                  className="p-1.5 text-center text-xs font-bold"
                  style={{ 
                    width: '60px',
                    border: `1px solid ${settings.border_color}`,
                    color: settings.table_header_text_color || '#374151',
                  }}
                >
                  Durasi
                </th>
                <th
                  className="p-1.5 text-right text-xs font-bold"
                  style={{ 
                    width: '110px',
                    border: `1px solid ${settings.border_color}`,
                    color: settings.table_header_text_color || '#374151',
                  }}
                >
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => {
                const itemSubtotal = item.subtotal || (item.quantity * item.unit_price_per_day * item.duration_days);
                return (
                  <tr key={index}>
                    <td
                      className="p-1.5 text-center text-xs"
                      style={{ border: `1px solid ${settings.border_color}` }}
                    >
                      {index + 1}
                    </td>
                    <td
                      className="p-1.5 text-left text-xs"
                      style={{ border: `1px solid ${settings.border_color}` }}
                    >
                      {item.item_name}
                    </td>
                    <td
                      className="p-1.5 text-center text-xs"
                      style={{ border: `1px solid ${settings.border_color}` }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      className="p-1.5 text-right text-xs"
                      style={{ border: `1px solid ${settings.border_color}` }}
                    >
                      {formatRupiah(item.unit_price_per_day)}
                    </td>
                    <td
                      className="p-1.5 text-center text-xs"
                      style={{ border: `1px solid ${settings.border_color}` }}
                    >
                      {item.duration_days} hari
                    </td>
                    <td
                      className="p-1.5 text-right text-xs font-bold"
                      style={{ border: `1px solid ${settings.border_color}` }}
                    >
                      {formatRupiah(itemSubtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Subtotal Sewa */}
          <div className="flex justify-between py-1 px-2" style={{ backgroundColor: '#f9fafb' }}>
            <span className="text-sm" style={{ color: '#4b5563' }}>Subtotal Sewa</span>
            <span className="text-sm font-bold">{formatRupiah(subtotalSewa)}</span>
          </div>

          {/* Section B: Ongkos Transport */}
          {(transportDelivery > 0 || transportPickup > 0) && (
            <>
              <h3
                className="font-bold text-sm mt-4 mb-2 pb-1"
                style={{ 
                  color: settings.header_color_primary,
                  borderBottom: `1px solid #e5e7eb`,
                }}
              >
                B. ONGKOS TRANSPORT
              </h3>

              {transportDelivery > 0 && (
                <div className="flex justify-between py-1 px-2">
                  <span className="text-sm" style={{ color: '#4b5563' }}>Pengiriman</span>
                  <span className="text-sm font-bold">{formatRupiah(transportDelivery)}</span>
                </div>
              )}

              {transportPickup > 0 && (
                <div className="flex justify-between py-1 px-2">
                  <span className="text-sm" style={{ color: '#4b5563' }}>Pengambilan</span>
                  <span className="text-sm font-bold">{formatRupiah(transportPickup)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 px-2" style={{ backgroundColor: '#f9fafb' }}>
                <span className="text-sm" style={{ color: '#4b5563' }}>Total Transport</span>
                <span className="text-sm font-bold">{formatRupiah(totalTransport)}</span>
              </div>
            </>
          )}

          {/* Section C: Diskon */}
          {discount > 0 && (
            <>
              <h3
                className="font-bold text-sm mt-4 mb-2 pb-1"
                style={{ 
                  color: settings.header_color_primary,
                  borderBottom: `1px solid #e5e7eb`,
                }}
              >
                C. DISKON
              </h3>

              <div className="flex justify-between py-1 px-2">
                <span className="text-sm" style={{ color: '#4b5563' }}>Potongan Harga</span>
                <span className="text-sm font-bold" style={{ color: '#dc2626' }}>-{formatRupiah(discount)}</span>
              </div>
            </>
          )}

          {/* Grand Total */}
          <div 
            className="flex justify-between py-2 px-2 mt-2"
            style={{ 
              backgroundColor: `${settings.accent_color}15`,
              borderTop: `2px solid ${settings.header_color_primary}`,
            }}
          >
            <span className="text-base font-bold">GRAND TOTAL</span>
            <span 
              className="text-base font-bold"
              style={{ color: settings.header_color_primary }}
            >
              {formatRupiah(grandTotal)}
            </span>
          </div>

          {/* Terbilang */}
          {settings.show_terbilang && (
            <p className="text-xs italic mt-2" style={{ color: '#4b5563' }}>
              {settings.label_terbilang || "Terbilang:"} {terbilang(grandTotal)}
            </p>
          )}

          {/* Footer */}
          {settings.show_footer !== false && settings.footer_text && (
            <p className="text-xs text-center text-gray-500 mt-8">
              {settings.footer_text}
            </p>
          )}
        </div>
      </div>
    );
  }
);

InvoiceRincianTemplate.displayName = "InvoiceRincianTemplate";

export default InvoiceRincianTemplate;
