-- 1) Unique index to support upsert by contract_id
CREATE UNIQUE INDEX IF NOT EXISTS income_sources_contract_id_unique
ON public.income_sources (contract_id)
WHERE contract_id IS NOT NULL;

-- 2) Backfill income_sources for contracts that already have tanggal_lunas and jumlah_lunas > 0
INSERT INTO public.income_sources (
  user_id,
  source_name,
  bank_name,
  amount,
  date,
  contract_id
)
SELECT 
  rc.user_id,
  CASE 
    WHEN rc.invoice IS NOT NULL AND trim(rc.invoice) <> '' THEN rc.invoice || ' - ' || COALESCE(cg.nama, 'Client')
    ELSE 'Sewa - ' || COALESCE(cg.nama, 'Client')
  END AS source_name,
  ba.bank_name,
  COALESCE(rc.jumlah_lunas, 0) AS amount,
  rc.tanggal_lunas::date AS date,
  rc.id AS contract_id
FROM public.rental_contracts rc
LEFT JOIN public.client_groups cg ON cg.id = rc.client_group_id
LEFT JOIN public.bank_accounts ba ON ba.id = rc.bank_account_id
WHERE rc.tanggal_lunas IS NOT NULL
  AND COALESCE(rc.jumlah_lunas, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.income_sources i WHERE i.contract_id = rc.id
  );