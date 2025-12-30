-- Add payment settings columns to document_settings
ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS 
  payment_instruction_text TEXT DEFAULT 'Silahkan scan barcode ini atau buka link untuk pengecekan pembayaran otomatis. Apabila transfer manual, silahkan transfer ke rekening berikut dan konfirmasi via WhatsApp.';

ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS 
  payment_qr_enabled BOOLEAN DEFAULT true;

ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS 
  payment_wa_number TEXT DEFAULT '+6289666666632';

ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS 
  payment_wa_hyperlink_enabled BOOLEAN DEFAULT true;

ALTER TABLE document_settings ADD COLUMN IF NOT EXISTS 
  show_payment_section BOOLEAN DEFAULT true;

-- Create custom_text_elements table
CREATE TABLE IF NOT EXISTS custom_text_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'receipt')),
  content TEXT NOT NULL DEFAULT 'Custom Text',
  position_x NUMERIC NOT NULL DEFAULT 50,
  position_y NUMERIC NOT NULL DEFAULT 50,
  rotation INTEGER NOT NULL DEFAULT 0,
  font_size INTEGER NOT NULL DEFAULT 14,
  font_family TEXT NOT NULL DEFAULT 'Arial',
  font_weight TEXT NOT NULL DEFAULT 'normal',
  font_color TEXT NOT NULL DEFAULT '#000000',
  text_align TEXT NOT NULL DEFAULT 'left',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_text_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_text_elements
CREATE POLICY "Users can view own custom text elements"
  ON custom_text_elements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own custom text elements"
  ON custom_text_elements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom text elements"
  ON custom_text_elements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom text elements"
  ON custom_text_elements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_custom_text_elements_updated_at
  BEFORE UPDATE ON custom_text_elements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();