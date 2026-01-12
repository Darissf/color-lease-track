-- Add full element positioning fields to document_settings
-- All x and width values are percentages (0-100)
-- All y values are millimeters from top of page (0-297), 0 means flow-based

-- Header Block Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS header_block_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS header_block_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS header_block_width INTEGER DEFAULT 100;

-- Company Info Block Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS company_info_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_info_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_info_width INTEGER DEFAULT 60;

-- Document Number Box Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS doc_number_position_x INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS doc_number_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS doc_number_width INTEGER DEFAULT 40;

-- Client Info Block Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS client_block_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_block_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_block_width INTEGER DEFAULT 100;

-- Item Table Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS table_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS table_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS table_width INTEGER DEFAULT 100;

-- Terbilang Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS terbilang_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS terbilang_position_y INTEGER DEFAULT 0;

-- Payment Section Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS payment_section_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_section_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_section_width INTEGER DEFAULT 100;

-- Bank Info Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS bank_info_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_info_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_info_width INTEGER DEFAULT 100;

-- Terms Section Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS terms_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS terms_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS terms_width INTEGER DEFAULT 100;

-- Footer Text Positioning
ALTER TABLE document_settings
ADD COLUMN IF NOT EXISTS footer_position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS footer_position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS footer_width INTEGER DEFAULT 100;