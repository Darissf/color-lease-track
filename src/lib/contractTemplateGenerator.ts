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

export interface LineItemGroup {
  billing_quantity: number;
  billing_unit_price_per_day: number;
  billing_duration_days: number;
  billing_unit_mode: 'pcs' | 'set';
  item_indices: number[]; // Indices of items in this group
}

export interface TemplateData {
  lineItems: LineItem[];
  groups?: LineItemGroup[]; // Billing groups data
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
  const groups = data.groups || [];
  
  // If there are groups, calculate based on groups + non-grouped items
  if (groups.length > 0) {
    // CRITICAL: Only consider groups that have valid item_indices (filter orphan groups)
    const validGroups = groups.filter(g => g.item_indices && g.item_indices.length > 0);
    
    // Collect all indices that are in valid groups
    const indicesInGroups = new Set<number>();
    validGroups.forEach(group => {
      group.item_indices.forEach(idx => indicesInGroups.add(idx));
    });
    
    // Calculate grouped items subtotal (from valid group billing only)
    const groupedSubtotal = validGroups.reduce((sum, group) => {
      return sum + (group.billing_quantity * group.billing_unit_price_per_day * group.billing_duration_days);
    }, 0);
    
    // Calculate non-grouped items subtotal
    let nonGroupedSubtotal = 0;
    data.lineItems.forEach((item, idx) => {
      if (!indicesInGroups.has(idx)) {
        nonGroupedSubtotal += calculateLineItemSubtotal(item);
      }
    });
    
    const rentalSubtotal = groupedSubtotal + nonGroupedSubtotal;
    const totalTransport = calculateTotalTransport(data.transportDelivery, data.transportPickup);
    
    return rentalSubtotal + totalTransport - (data.discount || 0);
  }
  
  // No groups - use legacy calculation
  const subtotal = calculateSubtotal(data);
  return subtotal - (data.discount || 0);
}

// New unified calculation based on price mode - now supports groups
function calculateUnifiedTotal(data: TemplateData): {
  totalUnits: number;
  pricePerDay: number;
  dailyTotal: number;
  durationDays: number;
  rentalSubtotal: number;
} {
  const groups = data.groups || [];
  const priceMode = data.priceMode || 'pcs';
  const pricePerUnit = data.pricePerUnit || 0;
  
  // Get duration from dates or from first item
  let durationDays = 0;
  if (data.startDate && data.endDate) {
    durationDays = calculateDurationDays(data.startDate, data.endDate);
  } else if (data.lineItems.length > 0) {
    durationDays = data.lineItems[0].duration_days;
  }
  
  // If there are groups, calculate based on groups + non-grouped items
  if (groups.length > 0) {
    // CRITICAL: Only consider groups that have valid item_indices (filter orphan groups)
    const validGroups = groups.filter(g => g.item_indices && g.item_indices.length > 0);
    
    // Collect all indices that are in valid groups
    const indicesInGroups = new Set<number>();
    validGroups.forEach(group => {
      group.item_indices.forEach(idx => indicesInGroups.add(idx));
    });
    
    // Calculate grouped items subtotal (from valid group billing only)
    const groupedSubtotal = validGroups.reduce((sum, group) => {
      return sum + (group.billing_quantity * group.billing_unit_price_per_day * group.billing_duration_days);
    }, 0);
    
    // Calculate non-grouped items subtotal
    let nonGroupedSubtotal = 0;
    data.lineItems.forEach((item, idx) => {
      if (!indicesInGroups.has(idx)) {
        nonGroupedSubtotal += item.quantity * item.unit_price_per_day * item.duration_days;
      }
    });
    
    // Calculate total units for display: sum of valid group billing quantities + non-grouped quantities
    let totalUnits = validGroups.reduce((sum, group) => sum + group.billing_quantity, 0);
    data.lineItems.forEach((item, idx) => {
      if (!indicesInGroups.has(idx)) {
        totalUnits += item.quantity;
      }
    });
    
    const rentalSubtotal = groupedSubtotal + nonGroupedSubtotal;
    const dailyTotal = durationDays > 0 ? rentalSubtotal / durationDays : 0;
    
    return {
      totalUnits,
      pricePerDay: pricePerUnit || (totalUnits > 0 ? dailyTotal / totalUnits : 0),
      dailyTotal,
      durationDays,
      rentalSubtotal,
    };
  }
  
  // No groups - use legacy calculation
  const totalUnits = calculateTotalSets(data.lineItems, priceMode);
  const dailyTotal = totalUnits * pricePerUnit;
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
    lines.push(`    - ${item.quantity} ${unitLabel} ${item.item_name}`);
  });
  lines.push(separator);
  
  // Calculate based on groups if available, otherwise use unified pricing
  const groups = data.groups || [];
  const hasGroups = groups.length > 0;
  
  if (hasGroups || (pricePerUnit && pricePerUnit > 0)) {
    const calc = calculateUnifiedTotal(data);
    const unitLabel = priceMode === 'set' ? 'set' : 'pcs';
    
    // Use group's price if available, otherwise use pricePerUnit
    const displayPricePerDay = hasGroups && groups[0] 
      ? groups[0].billing_unit_price_per_day 
      : calc.pricePerDay;
    
    lines.push(`Per ${unitLabel} per hari = ${formatRupiah(displayPricePerDay)}`);
    
    // Format total units - show decimal if needed
    const totalUnitsDisplay = Number.isInteger(calc.totalUnits) 
      ? calc.totalUnits.toString() 
      : calc.totalUnits.toFixed(1);
    
    lines.push(`Total : ${totalUnitsDisplay} ${unitLabel} x ${formatRupiah(displayPricePerDay)} = ${formatRupiah(calc.dailyTotal)}`);
    lines.push('');
    
    // Periode Sewa
    if (startDate && endDate) {
      lines.push('📅 Periode Sewa:');
      lines.push(`    Mulai   : ${formatDateIndo(startDate)}`);
      lines.push(`    Selesai : ${formatDateIndo(endDate)}`);
      lines.push(`    Durasi  : ${calc.durationDays} Hari`);
      lines.push('');
      lines.push(`Total : ${formatRupiah(calc.dailyTotal)} x ${calc.durationDays} hari = ${formatRupiah(calc.rentalSubtotal)}`);
    }
    lines.push(separator);
    
    // Transport
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    if (transportDelivery > 0 || transportPickup > 0) {
      lines.push('🚚 Ongkos Transport:');
      lines.push(`    Pengiriman  : ${formatRupiah(transportDelivery)}`);
      lines.push(`    Pengambilan : ${formatRupiah(transportPickup)}`);
      lines.push('');
    }
    
    lines.push(`Subtotal Sewa: ${formatRupiah(calc.rentalSubtotal)}`);
    if (totalTransport > 0) {
      lines.push(`Total Transport: ${formatRupiah(totalTransport)}`);
    }
    lines.push('');
  } else {
    // Legacy calculation - per item
    const totalItems = calculateTotalItems(lineItems);
    
    // Periode Sewa
    if (startDate && endDate) {
      const durationDays = calculateDurationDays(startDate, endDate);
      lines.push('📅 Periode Sewa:');
      lines.push(`    Mulai   : ${formatDateIndo(startDate)}`);
      lines.push(`    Selesai : ${formatDateIndo(endDate)}`);
      lines.push(`    Durasi  : ${durationDays} Hari`);
      lines.push(separator);
    }
    
    // Transport
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    if (transportDelivery > 0 || transportPickup > 0) {
      lines.push('🚚 Ongkos Transport:');
      lines.push(`    Pengiriman  : ${formatRupiah(transportDelivery)}`);
      lines.push(`    Pengambilan : ${formatRupiah(transportPickup)}`);
      lines.push('');
    }
    
    lines.push(`Subtotal Sewa: ${formatRupiah(totalItems)}`);
    if (totalTransport > 0) {
      lines.push(`Total Transport: ${formatRupiah(totalTransport)}`);
    }
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
    lines.push(`    - ${item.quantity} ${unitLabel} ${item.item_name}`);
  });
  lines.push(separator);
  
  // Calculate based on groups if available, otherwise use unified pricing
  const groups = data.groups || [];
  const hasGroups = groups.length > 0;
  
  if (hasGroups || (pricePerUnit && pricePerUnit > 0)) {
    const calc = calculateUnifiedTotal(data);
    const unitLabel = priceMode === 'set' ? 'set' : 'pcs';
    
    // Use group's price if available, otherwise use pricePerUnit
    const displayPricePerDay = hasGroups && groups[0] 
      ? groups[0].billing_unit_price_per_day 
      : calc.pricePerDay;
    
    lines.push(`Per ${unitLabel} per hari = ${formatRupiah(displayPricePerDay)}`);
    
    const totalUnitsDisplay = Number.isInteger(calc.totalUnits) 
      ? calc.totalUnits.toString() 
      : calc.totalUnits.toFixed(1);
    
    lines.push(`Total : ${totalUnitsDisplay} ${unitLabel} x ${formatRupiah(displayPricePerDay)} = *${formatRupiah(calc.dailyTotal)}*`);
    lines.push('');
    
    // Periode Sewa
    if (startDate && endDate) {
      lines.push('📅 *Periode Sewa:*');
      lines.push(`    Mulai   : ${formatDateIndo(startDate)}`);
      lines.push(`    Selesai : ${formatDateIndo(endDate)}`);
      lines.push(`    Durasi  : ${calc.durationDays} Hari`);
      lines.push('');
      lines.push(`Total : *${formatRupiah(calc.dailyTotal)}* x ${calc.durationDays} hari = *${formatRupiah(calc.rentalSubtotal)}*`);
    }
    lines.push(separator);
    
    // Transport
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    if (transportDelivery > 0 || transportPickup > 0) {
      lines.push('🚚 *Ongkos Transport:*');
      lines.push(`    Pengiriman  : ${formatRupiah(transportDelivery)}`);
      lines.push(`    Pengambilan : ${formatRupiah(transportPickup)}`);
      lines.push('');
    }
    
    lines.push(`Subtotal Sewa: *${formatRupiah(calc.rentalSubtotal)}*`);
    if (totalTransport > 0) {
      lines.push(`Total Transport: *${formatRupiah(totalTransport)}*`);
    }
    lines.push('');
  } else {
    // Legacy calculation - per item
    const totalItems = calculateTotalItems(lineItems);
    
    // Periode Sewa
    if (startDate && endDate) {
      const durationDays = calculateDurationDays(startDate, endDate);
      lines.push('📅 *Periode Sewa:*');
      lines.push(`    Mulai   : ${formatDateIndo(startDate)}`);
      lines.push(`    Selesai : ${formatDateIndo(endDate)}`);
      lines.push(`    Durasi  : ${durationDays} Hari`);
      lines.push(separator);
    }
    
    // Transport
    const totalTransport = calculateTotalTransport(transportDelivery, transportPickup);
    if (transportDelivery > 0 || transportPickup > 0) {
      lines.push('🚚 *Ongkos Transport:*');
      lines.push(`    Pengiriman  : ${formatRupiah(transportDelivery)}`);
      lines.push(`    Pengambilan : ${formatRupiah(transportPickup)}`);
      lines.push('');
    }
    
    lines.push(`Subtotal Sewa: *${formatRupiah(totalItems)}*`);
    if (totalTransport > 0) {
      lines.push(`Total Transport: *${formatRupiah(totalTransport)}*`);
    }
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
