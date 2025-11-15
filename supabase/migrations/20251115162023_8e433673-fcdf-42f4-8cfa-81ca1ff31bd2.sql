-- Add category column to savings_plans table
ALTER TABLE public.savings_plans 
ADD COLUMN category TEXT DEFAULT 'lainnya' CHECK (category IN ('darurat', 'liburan', 'investasi', 'pendidikan', 'kendaraan', 'properti', 'pernikahan', 'lainnya'));

-- Add index for category
CREATE INDEX idx_savings_plans_category ON public.savings_plans(category);

-- Update existing records to have default category
UPDATE public.savings_plans 
SET category = 'lainnya' 
WHERE category IS NULL;