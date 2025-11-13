-- Cleanup duplicates: keep the latest row per contract
WITH ranked AS (
  SELECT id, contract_id,
         ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.income_sources
  WHERE contract_id IS NOT NULL
)
DELETE FROM public.income_sources i
USING ranked r
WHERE i.id = r.id AND r.rn > 1;

-- Enforce one income per contract (only when contract_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_sources_unique_contract
ON public.income_sources (contract_id)
WHERE contract_id IS NOT NULL;