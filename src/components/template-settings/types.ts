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
  font_size_base: number;
  heading_font_family: string;
  
  // Header Layout
  header_style: string;
  show_company_tagline: boolean;
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
  table_header_text_color: string;
  table_border_style: string;
  table_alternating_rows: boolean;
  table_alternating_color: string;
  
  // Signature & Stamp
  signature_image_url: string | null;
  signature_url: string | null;
  signer_name: string;
  signer_title: string;
  show_stamp: boolean;
  custom_stamp_url: string | null;
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
  font_size_base: 12,
  heading_font_family: 'inherit',
  
  header_style: 'modern',
  show_company_tagline: false,
  company_tagline: '',
  header_stripe_height: 3,
  header_stripe_style: 'gradient',
  
  company_name: '',
  company_address: '',
  company_phone: '',
  company_email: '',
  company_website: '',
  company_npwp: '',
  owner_name: '',
  
  show_bank_info: true,
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  bank_logo_url: null,
  
  table_header_bg: '#f3f4f6',
  table_header_text_color: '#111827',
  table_border_style: 'solid',
  table_alternating_rows: false,
  table_alternating_color: '#f9fafb',
  
  signature_image_url: null,
  signature_url: null,
  signer_name: '',
  signer_title: '',
  show_stamp: true,
  custom_stamp_url: null,
  stamp_color_lunas: '#047857',
  stamp_color_belum_lunas: '#b91c1c',
  stamp_opacity: 90,
  
  show_watermark: false,
  watermark_type: 'logo',
  watermark_text: '',
  watermark_opacity: 5,
  
  qr_size: 80,
  qr_position: 'bottom-left',
  qr_include_amount: false,
  
  invoice_prefix: 'INV',
  receipt_prefix: 'KWT',
  number_format: 'PREFIX-YYYY-NNNN',
  
  show_due_date: true,
  default_due_days: 7,
  late_fee_text: '',
  custom_note: '',
  
  color_preset: 'cyan-blue',
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
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
];

export const headerStyles = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'corporate', label: 'Corporate' },
];
