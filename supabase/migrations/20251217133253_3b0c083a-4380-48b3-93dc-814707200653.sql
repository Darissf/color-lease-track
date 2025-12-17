-- Make rental_date_start and rental_date_end nullable since we're using tanggal_pengiriman instead
ALTER TABLE fixed_monthly_income 
ALTER COLUMN rental_date_start DROP NOT NULL;

ALTER TABLE fixed_monthly_income 
ALTER COLUMN rental_date_end DROP NOT NULL;