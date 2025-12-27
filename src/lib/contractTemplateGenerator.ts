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

export function calculateGrandTotal(data: TemplateData): number {
  return calculateTotalItems(data.lineItems) + calculateTotalTransport(data.transportDelivery, data.transportPickup);
}

export function generateRincianTemplate(data: TemplateData): string {
  const { lineItems, transportDelivery, transportPickup } = data;
  
  if (lineItems.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  // Header
  lines.push('📦 RINCIAN SEWA SCAFFOLDING');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  
  // Items
  lines.push('🔧 Item Sewa:');
  lineItems.forEach((item, index) => {
    const subtotal = calculateLineItemSubtotal(item);
    lines.push(`   ${index + 1}. ${item.item_name} × ${item.quantity} pcs`);
    lines.push(`      💰 ${formatRupiah(item.unit_price_per_day)}/hari × ${item.duration_days} hari = ${formatRupiah(subtotal)}`);
    lines.push('');
  });
  
  // Subtotal Items
  const totalItems = calculateTotalItems(lineItems);
  lines.push(`📊 Subtotal Sewa: ${formatRupiah(totalItems)}`);
  lines.push('');
  
  // Transport
  if (transportDelivery > 0 || transportPickup > 0) {
    lines.push('🚚 Ongkos Transport:');
    if (transportDelivery > 0) {
      lines.push(`   • Pengiriman: ${formatRupiah(transportDelivery)}`);
    }
    if (transportPickup > 0) {
      lines.push(`   • Pengambilan: ${formatRupiah(transportPickup)}`);
    }
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    lines.push(`   💰 Total Transport: ${formatRupiah(totalTransport)}`);
    lines.push('');
  }
  
  // Grand Total
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const grandTotal = calculateGrandTotal(data);
  lines.push(`💵 TOTAL TAGIHAN: ${formatRupiah(grandTotal)}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return lines.join('\n');
}

// Parse template back to structured data (for editing)
export function parseRincianTemplate(template: string): TemplateData | null {
  // This is a simple implementation - could be enhanced for more complex parsing
  // For now, we store the structured data separately and only use template for display
  return null;
}
