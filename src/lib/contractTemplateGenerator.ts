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
  unit_mode?: 'pcs' | 'set';
  pcs_per_set?: number;
}

export interface TemplateData {
  lineItems: LineItem[];
  transportDelivery: number;
  transportPickup: number;
  contractTitle?: string;
  discount?: number;
  startDate?: string;
  endDate?: string;
  // New fields for unified pricing mode
  priceMode?: 'pcs' | 'set';
  pricePerUnit?: number;
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

// Calculate total sets for all items (converting pcs to sets if needed)
function calculateTotalSets(lineItems: LineItem[], priceMode: 'pcs' | 'set'): number {
  return lineItems.reduce((sum, item) => {
    if (priceMode === 'set') {
      // Convert pcs to sets if item is in pcs mode
      const pcsPerSet = item.pcs_per_set || 1;
      if (item.unit_mode === 'pcs') {
        return sum + (item.quantity / pcsPerSet);
      }
      return sum + item.quantity;
    } else {
      // Price per pcs - convert sets to pcs
      if (item.unit_mode === 'set') {
        const pcsPerSet = item.pcs_per_set || 1;
        return sum + (item.quantity * pcsPerSet);
      }
      return sum + item.quantity;
    }
  }, 0);
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

// New unified calculation based on price mode
function calculateUnifiedTotal(data: TemplateData): {
  totalUnits: number;
  pricePerDay: number;
  dailyTotal: number;
  durationDays: number;
  rentalSubtotal: number;
} {
  const priceMode = data.priceMode || 'pcs';
  const pricePerUnit = data.pricePerUnit || 0;
  const totalUnits = calculateTotalSets(data.lineItems, priceMode);
  const dailyTotal = totalUnits * pricePerUnit;
  
  // Get duration from dates or from first item
  let durationDays = 0;
  if (data.startDate && data.endDate) {
    durationDays = calculateDurationDays(data.startDate, data.endDate);
  } else if (data.lineItems.length > 0) {
    durationDays = data.lineItems[0].duration_days;
  }
  
  const rentalSubtotal = dailyTotal * durationDays;
  
  return {
    totalUnits,
    pricePerDay: pricePerUnit,
    dailyTotal,
    durationDays,
    rentalSubtotal,
  };
}

// New unified template format - Normal mode
export function generateRincianTemplateNormal(data: TemplateData): string {
  const { lineItems, transportDelivery, transportPickup, contractTitle, discount, startDate, endDate, priceMode, pricePerUnit } = data;
  
  if (lineItems.length === 0) {
    return '';
  }

  const lines: string[] = [];
  const separator = '----------';
  
  // Header with optional title
  const headerTitle = contractTitle 
    ? `📦 Rincian Sewa ${toTitleCase(contractTitle)}`
    : '📦 Rincian Sewa';
  lines.push(headerTitle);
  lines.push(separator);
  
  // Items - new format with dash bullet
  lines.push('Item Sewa:');
  lineItems.forEach((item) => {
    const unitLabel = item.unit_mode === 'set' ? 'Set' : 'Pcs';
    lines.push(`- ${item.quantity} ${unitLabel} ${item.item_name}`);
  });
  lines.push(separator);
  
  // Unified pricing calculation (only if pricePerUnit is set)
  if (pricePerUnit && pricePerUnit > 0) {
    const calc = calculateUnifiedTotal(data);
    const unitLabel = priceMode === 'set' ? 'set' : 'pcs';
    
    lines.push(`Per ${unitLabel} per hari = ${formatRupiah(calc.pricePerDay)}`);
    
    // Format total units - show decimal if needed
    const totalUnitsDisplay = Number.isInteger(calc.totalUnits) 
      ? calc.totalUnits.toString() 
      : calc.totalUnits.toFixed(1);
    
    lines.push(`Total : ${totalUnitsDisplay} ${unitLabel} x ${formatRupiah(calc.pricePerDay)} = ${formatRupiah(calc.dailyTotal)}`);
    lines.push('');
    
    // Periode Sewa
    if (startDate && endDate) {
      lines.push('📅 Periode Sewa:');
      lines.push(`   Mulai: ${formatDateIndo(startDate)}`);
      lines.push(`   Selesai: ${formatDateIndo(endDate)}`);
      lines.push(`   Durasi: ${calc.durationDays} Hari`);
      lines.push('');
      lines.push(`Total : ${formatRupiah(calc.dailyTotal)} x ${calc.durationDays} hari = ${formatRupiah(calc.rentalSubtotal)}`);
    }
    lines.push(separator);
    
    lines.push(`Subtotal Sewa: ${formatRupiah(calc.rentalSubtotal)}`);
  } else {
    // Legacy calculation - per item
    const totalItems = calculateTotalItems(lineItems);
    
    // Periode Sewa
    if (startDate && endDate) {
      const durationDays = calculateDurationDays(startDate, endDate);
      lines.push('📅 Periode Sewa:');
      lines.push(`   Mulai: ${formatDateIndo(startDate)}`);
      lines.push(`   Selesai: ${formatDateIndo(endDate)}`);
      lines.push(`   Durasi: ${durationDays} Hari`);
      lines.push(separator);
    }
    
    lines.push(`Subtotal Sewa: ${formatRupiah(totalItems)}`);
  }
  lines.push('');
  
  // Transport
  if (transportDelivery > 0 || transportPickup > 0) {
    lines.push('🚚 Ongkos Transport:');
    lines.push(`   Pengiriman: ${formatRupiah(transportDelivery)}`);
    lines.push(`   Pengambilan: ${formatRupiah(transportPickup)}`);
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    lines.push(`   Total Transport: ${formatRupiah(totalTransport)}`);
    lines.push('');
  }
  
  // Discount (only if > 0)
  if (discount && discount > 0) {
    lines.push(`🏷 Diskon: -${formatRupiah(discount)}`);
  }
  lines.push(separator);
  
  // Grand Total
  const grandTotal = calculateGrandTotal(data);
  lines.push(`💵 TOTAL TAGIHAN: ${formatRupiah(grandTotal)}`);
  lines.push(separator);
  
  return lines.join('\n');
}

// WhatsApp template - with WhatsApp formatting
export function generateRincianTemplateWhatsApp(data: TemplateData): string {
  const { lineItems, transportDelivery, transportPickup, contractTitle, discount, startDate, endDate, priceMode, pricePerUnit } = data;
  
  if (lineItems.length === 0) {
    return '';
  }

  const lines: string[] = [];
  const separator = '----------';
  
  // Header with optional title
  const headerTitle = contractTitle 
    ? `📦 *Rincian Sewa ${toTitleCase(contractTitle)}*`
    : '📦 *Rincian Sewa*';
  lines.push(headerTitle);
  lines.push(separator);
  
  // Items - new format with dash bullet
  lines.push('*Item Sewa:*');
  lineItems.forEach((item) => {
    const unitLabel = item.unit_mode === 'set' ? 'Set' : 'Pcs';
    lines.push(`- ${item.quantity} ${unitLabel} ${item.item_name}`);
  });
  lines.push(separator);
  
  // Unified pricing calculation (only if pricePerUnit is set)
  if (pricePerUnit && pricePerUnit > 0) {
    const calc = calculateUnifiedTotal(data);
    const unitLabel = priceMode === 'set' ? 'set' : 'pcs';
    
    lines.push(`Per ${unitLabel} per hari = ${formatRupiah(calc.pricePerDay)}`);
    
    const totalUnitsDisplay = Number.isInteger(calc.totalUnits) 
      ? calc.totalUnits.toString() 
      : calc.totalUnits.toFixed(1);
    
    lines.push(`Total : ${totalUnitsDisplay} ${unitLabel} x ${formatRupiah(calc.pricePerDay)} = *${formatRupiah(calc.dailyTotal)}*`);
    lines.push('');
    
    // Periode Sewa
    if (startDate && endDate) {
      lines.push('📅 *Periode Sewa:*');
      lines.push(`   Mulai: ${formatDateIndo(startDate)}`);
      lines.push(`   Selesai: ${formatDateIndo(endDate)}`);
      lines.push(`   Durasi: ${calc.durationDays} Hari`);
      lines.push('');
      lines.push(`Total : *${formatRupiah(calc.dailyTotal)}* x ${calc.durationDays} hari = *${formatRupiah(calc.rentalSubtotal)}*`);
    }
    lines.push(separator);
    
    lines.push(`Subtotal Sewa: *${formatRupiah(calc.rentalSubtotal)}*`);
  } else {
    // Legacy calculation - per item
    const totalItems = calculateTotalItems(lineItems);
    
    // Periode Sewa
    if (startDate && endDate) {
      const durationDays = calculateDurationDays(startDate, endDate);
      lines.push('📅 *Periode Sewa:*');
      lines.push(`   Mulai: ${formatDateIndo(startDate)}`);
      lines.push(`   Selesai: ${formatDateIndo(endDate)}`);
      lines.push(`   Durasi: ${durationDays} Hari`);
      lines.push(separator);
    }
    
    lines.push(`Subtotal Sewa: *${formatRupiah(totalItems)}*`);
  }
  lines.push('');
  
  // Transport
  if (transportDelivery > 0 || transportPickup > 0) {
    lines.push('🚚 *Ongkos Transport:*');
    lines.push(`   Pengiriman: ${formatRupiah(transportDelivery)}`);
    lines.push(`   Pengambilan: ${formatRupiah(transportPickup)}`);
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    lines.push(`   Total Transport: *${formatRupiah(totalTransport)}*`);
    lines.push('');
  }
  
  // Discount (only if > 0)
  if (discount && discount > 0) {
    lines.push(`🏷 *Diskon:* -${formatRupiah(discount)}`);
  }
  lines.push(separator);
  
  // Grand Total
  const grandTotal = calculateGrandTotal(data);
  lines.push(`💵 *TOTAL TAGIHAN:* ${formatRupiah(grandTotal)}`);
  lines.push(separator);
  
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
