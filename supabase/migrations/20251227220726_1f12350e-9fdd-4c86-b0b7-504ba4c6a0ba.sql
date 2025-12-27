-- Drop unique constraint pada document_number yang menyebabkan error
DROP INDEX IF EXISTS idx_invoice_receipts_document_number;

-- Buat unique constraint baru berdasarkan payment_id + document_type
-- Satu payment hanya boleh punya 1 kwitansi
CREATE UNIQUE INDEX idx_invoice_receipts_payment_doc_type 
ON invoice_receipts(payment_id, document_type) 
WHERE payment_id IS NOT NULL;

-- Untuk invoice (tanpa payment_id), gunakan contract_id + document_type
CREATE UNIQUE INDEX idx_invoice_receipts_contract_invoice 
ON invoice_receipts(contract_id, document_type) 
WHERE payment_id IS NULL AND document_type = 'invoice';