import { formatRupiah } from './currency';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface LineItem {
  id?: string;
  item_name: string;
  quantity: number;
  unit_price_per_day: number;
  duration_days: number;
  subtotal?: number;
}

export interface TemplateData {
  lineItems: LineItem[];
  transportDelivery: number;
  transportPickup: number;
  contractTitle?: string;
  discount?: number;
  startDate?: string;
  endDate?: string;
}

// Helper function to convert string to title case
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to format date in Indonesian
function formatDateIndo(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: localeId });
  } catch {
    return dateString;
  }
}

// Helper function to calculate rental duration in days
function calculateDurationDays(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 karena hari mulai dihitung
  } catch {
    return 0;
  }
}

// Helper: check if all items have zero pricing (price = 0 AND duration = 0)
function isZeroPricingMode(lineItems: LineItem[]): boolean {
  return lineItems.every(item => 
    item.unit_price_per_day === 0 && item.duration_days === 0
  );
}

export function calculateLineItemSubtotal(item: LineItem): number {
  return item.quantity * item.unit_price_per_day * item.duration_days;
}

export function calculateTotalItems(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + calculateLineItemSubtotal(item), 0);
}

export function calculateTotalTransport(transportDelivery: number, transportPickup: number): number {
  return transportDelivery + transportPickup;
}

export function calculateSubtotal(data: TemplateData): number {
  return calculateTotalItems(data.lineItems) + calculateTotalTransport(data.transportDelivery, data.transportPickup);
}

export function calculateGrandTotal(data: TemplateData): number {
  const subtotal = calculateSubtotal(data);
  return subtotal - (data.discount || 0);
}

// Normal template (default) - clean format for display
export function generateRincianTemplateNormal(data: TemplateData): string {
  const { lineItems, transportDelivery, transportPickup, contractTitle, discount, startDate, endDate } = data;
  
  if (lineItems.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  // Header with optional title
  const headerTitle = contractTitle 
    ? `📦 Rincian Sewa Scaffolding ${toTitleCase(contractTitle)}`
    : '📦 Rincian Sewa Scaffolding';
  lines.push(headerTitle);
  lines.push('');
  
  // Items
  const zeroPricing = isZeroPricingMode(lineItems);
  lines.push('🔧 Item Sewa:');
  lineItems.forEach((item, index) => {
    if (zeroPricing) {
      // Simplified format: only name × qty pcs
      lines.push(`${index + 1}. ${item.item_name} × ${item.quantity} pcs`);
    } else {
      // Full format: name + price/duration details
      const subtotal = calculateLineItemSubtotal(item);
      lines.push(`${index + 1}. ${item.item_name} × ${item.quantity} pcs`);
      lines.push(`   ${formatRupiah(item.unit_price_per_day)}/hari × ${item.duration_days} hari = ${formatRupiah(subtotal)}`);
    }
  });
  lines.push('');
  
  // Subtotal Items
  const totalItems = calculateTotalItems(lineItems);
  lines.push(`Subtotal Sewa: ${formatRupiah(totalItems)}`);
  lines.push('');
  
  // Transport
  if (transportDelivery > 0 || transportPickup > 0) {
    lines.push('🚚 Ongkos Transport:');
    if (transportDelivery > 0) {
      lines.push(`   Pengiriman: ${formatRupiah(transportDelivery)}`);
    }
    if (transportPickup > 0) {
      lines.push(`   Pengambilan: ${formatRupiah(transportPickup)}`);
    }
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    lines.push(`   Total Transport: ${formatRupiah(totalTransport)}`);
    lines.push('');
  }
  
  // Periode Sewa
  if (startDate && endDate) {
    const durationDays = calculateDurationDays(startDate, endDate);
    lines.push('📅 Periode Sewa:');
    lines.push(`   Mulai: ${formatDateIndo(startDate)}`);
    lines.push(`   Selesai: ${formatDateIndo(endDate)}`);
    lines.push(`   Durasi: ${durationDays} Hari`);
    lines.push('');
  }
  
  // Discount (only if filled)
  if (discount && discount > 0) {
    lines.push(`🏷️ Diskon: -${formatRupiah(discount)}`);
    lines.push('');
  }
  
  // Grand Total
  const grandTotal = calculateGrandTotal(data);
  lines.push(`💵 TOTAL TAGIHAN: ${formatRupiah(grandTotal)}`);
  lines.push('');
  lines.push('🙏 Terima kasih!');
  
  return lines.join('\n');
}

// WhatsApp template - clean format with WhatsApp formatting (no box lines)
export function generateRincianTemplateWhatsApp(data: TemplateData): string {
  const { lineItems, transportDelivery, transportPickup, contractTitle, discount, startDate, endDate } = data;
  
  if (lineItems.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  // Header with optional title
  const headerTitle = contractTitle 
    ? `📦 *Rincian Sewa Scaffolding ${toTitleCase(contractTitle)}*`
    : '📦 *Rincian Sewa Scaffolding*';
  lines.push(headerTitle);
  lines.push('');
  
  // Items - tanpa garis box, format mobile-friendly
  const zeroPricing = isZeroPricingMode(lineItems);
  lines.push('🔧 *Item Sewa:*');
  lineItems.forEach((item, index) => {
    if (zeroPricing) {
      // Simplified format: name on first line, qty on second
      lines.push(`${index + 1}. ${item.item_name}`);
      lines.push(`   × ${item.quantity} pcs`);
    } else {
      // Full format: split into 3 lines for mobile readability
      const subtotal = calculateLineItemSubtotal(item);
      lines.push(`${index + 1}. ${item.item_name}`);
      lines.push(`   ${item.quantity} pcs × ${formatRupiah(item.unit_price_per_day)} × ${item.duration_days} hari`);
      lines.push(`   = *${formatRupiah(subtotal)}*`);
    }
  });
  lines.push('');
  
  // Subtotal Items
  const totalItems = calculateTotalItems(lineItems);
  lines.push(`📊 *Subtotal Sewa:* ${formatRupiah(totalItems)}`);
  lines.push('');
  
  // Transport
  if (transportDelivery > 0 || transportPickup > 0) {
    lines.push('🚚 *Ongkos Transport:*');
    if (transportDelivery > 0) {
      lines.push(`   • Pengiriman: ${formatRupiah(transportDelivery)}`);
    }
    if (transportPickup > 0) {
      lines.push(`   • Pengambilan: ${formatRupiah(transportPickup)}`);
    }
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    lines.push(`   *Total Transport:* ${formatRupiah(totalTransport)}`);
    lines.push('');
  }
  
  // Periode Sewa
  if (startDate && endDate) {
    const durationDays = calculateDurationDays(startDate, endDate);
    lines.push('📅 *Periode Sewa:*');
    lines.push(`   • Mulai: ${formatDateIndo(startDate)}`);
    lines.push(`   • Selesai: ${formatDateIndo(endDate)}`);
    lines.push(`   • Durasi: ${durationDays} Hari`);
    lines.push('');
  }
  
  // Discount (only if filled)
  if (discount && discount > 0) {
    lines.push(`🏷️ *Diskon:* -${formatRupiah(discount)}`);
    lines.push('');
  }
  
  // Grand Total - tanpa garis
  const grandTotal = calculateGrandTotal(data);
  lines.push(`💵 *TOTAL TAGIHAN:* ${formatRupiah(grandTotal)}`);
  lines.push('');
  lines.push('🙏 Terima kasih atas kepercayaan Anda!');
  
  return lines.join('\n');
}

// Default export - uses Normal template
export function generateRincianTemplate(data: TemplateData, whatsappMode: boolean = false): string {
  return whatsappMode 
    ? generateRincianTemplateWhatsApp(data) 
    : generateRincianTemplateNormal(data);
}

// Parse template back to structured data (for editing)
export function parseRincianTemplate(template: string): TemplateData | null {
  // This is a simple implementation - could be enhanced for more complex parsing
  // For now, we store the structured data separately and only use template for display
  return null;
}
