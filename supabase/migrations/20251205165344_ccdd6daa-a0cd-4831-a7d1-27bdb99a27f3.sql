-- Hapus unique constraint yang memblokir multi-payment pada satu kontrak
DROP INDEX IF EXISTS idx_income_sources_unique_contract;
DROP INDEX IF EXISTS income_sources_contract_id_unique;