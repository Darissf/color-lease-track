// Layout settings that can differ between Invoice and Receipt
export interface LayoutSettings {
  stamp_position_x: number;
  stamp_position_y: number;
  stamp_rotation: number;
  stamp_scale: number;
  qr_position: string;
  qr_size: number;
  watermark_position_x: number;
  watermark_position_y: number;
  watermark_size: number;
  watermark_rotation: number;
  watermark_opacity: number;
  // Signature position settings (watermark-like positioning)
  signature_position_x: number;
  signature_position_y: number;
  signature_scale: number;
  signature_opacity: number;
}

export const defaultLayoutSettings: LayoutSettings = {
  stamp_position_x: 10,
  stamp_position_y: 70,
  stamp_rotation: -8,
  stamp_scale: 1.0,
  qr_position: 'bottom-right',
  qr_size: 80,
  watermark_position_x: 50,
  watermark_position_y: 50,
  watermark_size: 300,
  watermark_rotation: -45,
  watermark_opacity: 10,
  // Signature defaults - bottom right area
  signature_position_x: 80,
  signature_position_y: 85,
  signature_scale: 1.0,
  signature_opacity: 100,
};

export interface TemplateSettings {
  // Basic Colors
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
  
  // Typography - MATCH DATABASE COLUMN NAMES
  font_family: string;
  font_size_base: number; // was base_font_size
  heading_font_family: string; // was heading_font
  
  // Header Layout
  header_style: string;
  show_header_stripe: boolean;
  show_company_tagline: boolean; // was show_tagline
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
  
  // Table Styling - MATCH DATABASE COLUMN NAMES
  table_header_bg: string;
  table_header_text_color: string; // was table_header_text
  table_border_style: string;
  table_alternating_rows: boolean;
  table_alternating_color: string; // was table_alt_row_bg
  
  // Signature & Stamp - MATCH DATABASE COLUMN NAMES
  signature_image_url: string | null;
  signature_url: string | null;
  signer_name: string;
  signer_title: string;
  signature_position: string;
  signature_label: string;
  show_stamp: boolean;
  custom_stamp_url: string | null;
  stamp_text: string;
  stamp_color: string;
  stamp_color_lunas: string;
  stamp_color_belum_lunas: string;
  stamp_opacity: number;
  
  // Extended Stamp Settings
  stamp_type: string;
  stamp_font_family: string;
  stamp_font_size: number;
  stamp_rotation: number;
  stamp_border_width: number;
  stamp_border_style: string;
  stamp_show_date: boolean;
  stamp_show_document_number: boolean;
  stamp_show_company_name: boolean;
  stamp_position: string;
  stamp_size: string;
  show_stamp_on_invoice: boolean;
  show_stamp_on_receipt: boolean;
  
  // Custom stamp text and free positioning
  stamp_custom_text: string;
  stamp_use_custom_text: boolean;
  stamp_position_x: number;
  stamp_position_y: number;
  
  // Custom stamp source and scale
  stamp_source: string;
  stamp_scale: number;
  
  // Watermark
  show_watermark: boolean;
  watermark_type: string;
  watermark_text: string;
  watermark_opacity: number;
  watermark_size: number;
  watermark_rotation: number;
  watermark_position_x: number;
  watermark_position_y: number;
  
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
  
  // NEW: Visibility toggles for each element
  show_company_name: boolean;
  show_company_address: boolean;
  show_company_phone: boolean;
  show_company_email: boolean;
  show_company_website: boolean;
  show_npwp: boolean;
  show_client_info: boolean;
  show_signature: boolean;
  show_terms: boolean;
  show_footer: boolean;
  show_custom_note: boolean;
  show_document_number: boolean;
  show_document_date: boolean;
  show_table_header: boolean;
  
  // NEW: Text colors for elements
  company_name_color: string;
  company_info_color: string;
  tagline_color: string;
  document_title_color: string;
  label_color: string;
  value_color: string;
  
  // NEW: Custom labels
  document_title: string;
  label_client: string;
  label_description: string;
  label_amount: string;
  label_total: string;
  label_terbilang: string;
  label_bank_transfer: string;
  receipt_title: string;
  
  // NEW: Payment link option
  use_payment_link: boolean;
  payment_link_text: string;

  // Payment Section Settings
  show_payment_section?: boolean;
  payment_instruction_text?: string;
  payment_qr_enabled?: boolean;
  payment_wa_number?: string;
  payment_wa_hyperlink_enabled?: boolean;

  // Separate layout settings for Invoice and Receipt
  invoice_layout_settings: LayoutSettings;
  receipt_layout_settings: LayoutSettings;
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
  font_size_base: 14,
  heading_font_family: 'inherit',
  
  header_style: 'modern',
  show_header_stripe: true,
  show_company_tagline: false,
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
  table_header_text_color: '#374151',
  table_border_style: 'solid',
  table_alternating_rows: false,
  table_alternating_color: '#f9fafb',
  
  signature_image_url: null,
  signature_url: null,
  signer_name: '',
  signer_title: '',
  signature_position: 'right',
  signature_label: 'Hormat Kami,',
  show_stamp: true,
  custom_stamp_url: null,
  stamp_text: 'LUNAS',
  stamp_color: '#22c55e',
  stamp_color_lunas: '#047857',
  stamp_color_belum_lunas: '#b91c1c',
  stamp_opacity: 80,
  
  // Extended Stamp Settings
  stamp_type: 'rectangle',
  stamp_font_family: 'Courier New',
  stamp_font_size: 24,
  stamp_rotation: -8,
  stamp_border_width: 4,
  stamp_border_style: 'solid',
  stamp_show_date: true,
  stamp_show_document_number: true,
  stamp_show_company_name: true,
  stamp_position: 'left',
  stamp_size: 'md',
  show_stamp_on_invoice: false,
  show_stamp_on_receipt: true,
  
  // Custom stamp text and free positioning
  stamp_custom_text: 'LUNAS',
  stamp_use_custom_text: false,
  stamp_position_x: 10,
  stamp_position_y: 70,
  
  // Custom stamp source and scale
  stamp_source: 'built-in',
  stamp_scale: 1.0,
  
  show_watermark: false,
  watermark_type: 'logo',
  watermark_text: 'DRAFT',
  watermark_opacity: 10,
  watermark_size: 300,
  watermark_rotation: -45,
  watermark_position_x: 50,
  watermark_position_y: 50,
  
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
  
  // Visibility toggles - default all ON
  show_company_name: true,
  show_company_address: true,
  show_company_phone: true,
  show_company_email: true,
  show_company_website: true,
  show_npwp: false,
  show_client_info: true,
  show_signature: true,
  show_terms: true,
  show_footer: true,
  show_custom_note: false,
  show_document_number: true,
  show_document_date: true,
  show_table_header: true,
  
  // Text colors
  company_name_color: '#1f2937',
  company_info_color: '#4b5563',
  tagline_color: '#6b7280',
  document_title_color: '#1f2937',
  label_color: '#6b7280',
  value_color: '#1f2937',
  
  // Custom labels
  document_title: 'INVOICE',
  label_client: 'Kepada Yth:',
  label_description: 'Keterangan',
  label_amount: 'Jumlah',
  label_total: 'Total',
  label_terbilang: 'Terbilang:',
  label_bank_transfer: 'Transfer ke:',
  receipt_title: 'KWITANSI',
  
  // Payment link
  use_payment_link: false,
  payment_link_text: 'Generate Pembayaran',

  // Payment Section Settings
  show_payment_section: true,
  payment_instruction_text: 'Silahkan scan barcode ini atau buka link untuk pengecekan pembayaran otomatis. Apabila transfer manual, silahkan transfer ke rekening berikut dan konfirmasi via WhatsApp.',
  payment_qr_enabled: true,
  payment_wa_number: '+6289666666632',
  payment_wa_hyperlink_enabled: true,

  // Separate layout settings
  invoice_layout_settings: { ...defaultLayoutSettings },
  receipt_layout_settings: { ...defaultLayoutSettings },
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
