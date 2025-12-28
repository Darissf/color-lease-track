export interface TemplateSettings {
  // Basic
  header_color_primary: string;
  header_color_secondary: string;
  border_color: string;
  accent_color: string;
  logo_position: string;
  show_qr_code: boolean;
  show_terbilang: boolean;
  footer_text: string;
  terms_conditions: string;
  
  // Media URLs
  invoice_logo_url: string | null;
  icon_maps_url: string | null;
  icon_whatsapp_url: string | null;
  icon_email_url: string | null;
  icon_website_url: string | null;
  
  // Typography
  font_family: string;
  base_font_size: number;
  heading_font: string;
  
  // Header Layout
  header_style: string;
  show_header_stripe: boolean;
  show_tagline: boolean;
  company_tagline: string;
  header_stripe_height: number;
  header_stripe_style: string;
  
  // Company Info
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_npwp: string;
  owner_name: string;
  
  // Bank Account
  show_bank_info: boolean;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_logo_url: string | null;
  
  // Table Styling
  table_header_bg: string;
  table_header_text: string;
  table_border_style: string;
  table_alternating_rows: boolean;
  table_alt_row_bg: string;
  
  // Signature & Stamp
  signature_image_url: string | null;
  signature_url: string | null;
  signer_name: string;
  signer_title: string;
  show_stamp: boolean;
  stamp_image_url: string | null;
  stamp_text: string;
  stamp_color: string;
  stamp_color_lunas: string;
  stamp_color_belum_lunas: string;
  stamp_opacity: number;
  
  // Watermark
  show_watermark: boolean;
  watermark_type: string;
  watermark_text: string;
  watermark_opacity: number;
  
  // QR Code
  qr_size: number;
  qr_position: string;
  qr_include_amount: boolean;
  
  // Document Numbering
  invoice_prefix: string;
  receipt_prefix: string;
  number_format: string;
  
  // Additional
  show_due_date: boolean;
  default_due_days: number;
  late_fee_text: string;
  custom_note: string;
  
  // Color Preset
  color_preset: string;
  
  // Legacy/Additional
  template_style: string;
  paper_size: string;
}

export const defaultSettings: TemplateSettings = {
  header_color_primary: '#06b6d4',
  header_color_secondary: '#2563eb',
  border_color: '#bfdbfe',
  accent_color: '#f97316',
  logo_position: 'left',
  show_qr_code: true,
  show_terbilang: true,
  footer_text: 'Terima kasih atas kepercayaan Anda',
  terms_conditions: 'Pembayaran dalam waktu 7 hari setelah invoice diterima',
  
  invoice_logo_url: null,
  icon_maps_url: null,
  icon_whatsapp_url: null,
  icon_email_url: null,
  icon_website_url: null,
  
  font_family: 'Segoe UI',
  base_font_size: 14,
  heading_font: 'inherit',
  
  header_style: 'modern',
  show_header_stripe: true,
  show_tagline: false,
  company_tagline: '',
  header_stripe_height: 12,
  header_stripe_style: 'gradient',
  
  company_name: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  company_website: '',
  company_npwp: '',
  owner_name: '',
  
  show_bank_info: false,
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  bank_logo_url: null,
  
  table_header_bg: '#f3f4f6',
  table_header_text: '#374151',
  table_border_style: 'solid',
  table_alternating_rows: false,
  table_alt_row_bg: '#f9fafb',
  
  signature_image_url: null,
  signature_url: null,
  signer_name: '',
  signer_title: '',
  show_stamp: true,
  stamp_image_url: null,
  stamp_text: 'LUNAS',
  stamp_color: '#22c55e',
  stamp_color_lunas: '#047857',
  stamp_color_belum_lunas: '#b91c1c',
  stamp_opacity: 80,
  
  show_watermark: false,
  watermark_type: 'logo',
  watermark_text: 'DRAFT',
  watermark_opacity: 10,
  
  qr_size: 80,
  qr_position: 'bottom-section',
  qr_include_amount: false,
  
  invoice_prefix: 'INV',
  receipt_prefix: 'KWT',
  number_format: 'PREFIX-YYYY-NNNN',
  
  show_due_date: true,
  default_due_days: 7,
  late_fee_text: '',
  custom_note: '',
  
  color_preset: 'cyan-blue',
  
  template_style: 'modern',
  paper_size: 'A4',
};

export const colorPresets = {
  'cyan-blue': {
    name: 'Cyan Blue',
    primary: '#06b6d4',
    secondary: '#2563eb',
    border: '#bfdbfe',
    accent: '#f97316',
  },
  'green-emerald': {
    name: 'Green Emerald',
    primary: '#10b981',
    secondary: '#059669',
    border: '#a7f3d0',
    accent: '#f59e0b',
  },
  'navy-gold': {
    name: 'Navy Gold',
    primary: '#1e3a5f',
    secondary: '#2c4a6e',
    border: '#cbd5e1',
    accent: '#d4af37',
  },
  'purple-violet': {
    name: 'Purple Violet',
    primary: '#8b5cf6',
    secondary: '#6366f1',
    border: '#ddd6fe',
    accent: '#ec4899',
  },
  'red-orange': {
    name: 'Red Orange',
    primary: '#ef4444',
    secondary: '#f97316',
    border: '#fecaca',
    accent: '#eab308',
  },
  'monochrome': {
    name: 'Monochrome',
    primary: '#374151',
    secondary: '#1f2937',
    border: '#d1d5db',
    accent: '#111827',
  },
};

export const fontFamilies = [
  { value: 'Segoe UI', label: 'Segoe UI' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans' },
  { value: 'lato', label: 'Lato' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'merriweather', label: 'Merriweather' },
];

export const headerStyles = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'corporate', label: 'Corporate' },
];
