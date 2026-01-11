-- Add jumlah_lunas column (total amount paid)
ALTER TABLE rental_contracts
ADD COLUMN IF NOT EXISTS jumlah_lunas NUMERIC DEFAULT 0;

-- Add tanggal_lunas column (date when fully paid)
ALTER TABLE rental_contracts
ADD COLUMN IF NOT EXISTS tanggal_lunas DATE;

-- Create trigger function to auto-update payment summary
CREATE OR REPLACE FUNCTION update_contract_payment_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_contract_id UUID;
  total_paid NUMERIC;
  total_tagihan NUMERIC;
  last_payment_date DATE;
BEGIN
  -- Get contract_id from NEW or OLD
  v_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  
  -- Calculate total paid
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM contract_payments
  WHERE contract_id = v_contract_id;
  
  -- Get tagihan from contract
  SELECT tagihan INTO total_tagihan
  FROM rental_contracts
  WHERE id = v_contract_id;
  
  -- Get last payment date
  SELECT MAX(payment_date) INTO last_payment_date
  FROM contract_payments
  WHERE contract_id = v_contract_id;
  
  -- Update rental_contracts
  UPDATE rental_contracts
  SET 
    jumlah_lunas = total_paid,
    tagihan_belum_bayar = GREATEST(0, COALESCE(total_tagihan, 0) - total_paid),
    tanggal_lunas = CASE 
      WHEN total_paid >= COALESCE(total_tagihan, 0) AND total_tagihan > 0 
      THEN last_payment_date 
      ELSE NULL 
    END,
    tanggal_bayar_terakhir = last_payment_date
  WHERE id = v_contract_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contract_payments
DROP TRIGGER IF EXISTS trigger_update_payment_summary ON contract_payments;
CREATE TRIGGER trigger_update_payment_summary
AFTER INSERT OR UPDATE OR DELETE ON contract_payments
FOR EACH ROW EXECUTE FUNCTION update_contract_payment_summary();

-- Backfill existing data
UPDATE rental_contracts rc
SET 
  jumlah_lunas = COALESCE((
    SELECT SUM(amount) 
    FROM contract_payments cp 
    WHERE cp.contract_id = rc.id
  ), 0),
  tanggal_lunas = CASE 
    WHEN COALESCE((
      SELECT SUM(amount) 
      FROM contract_payments cp 
      WHERE cp.contract_id = rc.id
    ), 0) >= COALESCE(rc.tagihan, 0) AND rc.tagihan > 0
    THEN (
      SELECT MAX(payment_date) 
      FROM contract_payments cp 
      WHERE cp.contract_id = rc.id
    )
    ELSE NULL 
  END;