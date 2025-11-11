-- Add contract_id column to income_sources table
ALTER TABLE public.income_sources 
ADD COLUMN contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_income_sources_contract_id ON public.income_sources(contract_id);

-- Add comment
COMMENT ON COLUMN public.income_sources.contract_id IS 'Links income to a rental contract (if applicable)';