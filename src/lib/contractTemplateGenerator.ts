import { formatRupiah } from './currency';

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
}

// Helper function to convert string to title case
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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

export function generateRincianTemplate(data: TemplateData): string {
  const { lineItems, transportDelivery, transportPickup, contractTitle, discount } = data;
  
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
  lines.push('🔧 *Item Sewa:*');
  lines.push('┌──────────────────────────');
  lineItems.forEach((item, index) => {
    const subtotal = calculateLineItemSubtotal(item);
    lines.push(`│ ${index + 1}. ${item.item_name} × ${item.quantity} pcs`);
    lines.push(`│    ${formatRupiah(item.unit_price_per_day)}/hari × ${item.duration_days} hari`);
    lines.push(`│    ▸ ${formatRupiah(subtotal)}`);
    if (index < lineItems.length - 1) {
      lines.push('├──────────────────────────');
    }
  });
  lines.push('└──────────────────────────');
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
    lines.push(`   ▸ Total: ${formatRupiah(totalTransport)}`);
    lines.push('');
  }
  
  // Discount (only if filled)
  if (discount && discount > 0) {
    lines.push(`🏷️ *Diskon:* -${formatRupiah(discount)}`);
    lines.push('');
  }
  
  // Grand Total
  lines.push('════════════════════════');
  const grandTotal = calculateGrandTotal(data);
  lines.push(`💵 *TOTAL TAGIHAN:* ${formatRupiah(grandTotal)}`);
  lines.push('════════════════════════');
  lines.push('');
  lines.push('🙏 Terima kasih atas kepercayaan Anda!');
  
  return lines.join('\n');
}

// Parse template back to structured data (for editing)
export function parseRincianTemplate(template: string): TemplateData | null {
  // This is a simple implementation - could be enhanced for more complex parsing
  // For now, we store the structured data separately and only use template for display
  return null;
}
