-- Create table for individual stamp elements (text boxes, etc.)
CREATE TABLE public.stamp_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  element_type VARCHAR(20) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  position_x DECIMAL NOT NULL DEFAULT 50,
  position_y DECIMAL NOT NULL DEFAULT 50,
  font_family VARCHAR(100) NOT NULL DEFAULT 'Arial',
  font_size INTEGER NOT NULL DEFAULT 16,
  font_weight VARCHAR(20) NOT NULL DEFAULT 'bold',
  color VARCHAR(20) NOT NULL DEFAULT '#047857',
  rotation INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stamp_elements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view their own stamp elements"
ON public.stamp_elements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stamp elements"
ON public.stamp_elements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stamp elements"
ON public.stamp_elements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stamp elements"
ON public.stamp_elements FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_stamp_elements_updated_at
BEFORE UPDATE ON public.stamp_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();