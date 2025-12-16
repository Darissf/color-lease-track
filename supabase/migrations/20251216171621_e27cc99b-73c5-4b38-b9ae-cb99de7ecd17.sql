-- Create driver_templates table for storing reusable driver information
CREATE TABLE public.driver_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  driver_phone VARCHAR(20),
  vehicle_info VARCHAR(200),
  warehouse_address TEXT,
  warehouse_lat NUMERIC,
  warehouse_lng NUMERIC,
  warehouse_gmaps_link TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage driver templates
CREATE POLICY "Admins can manage driver templates" ON public.driver_templates
  FOR ALL USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_driver_templates_user_id ON public.driver_templates(user_id);
CREATE INDEX idx_driver_templates_is_default ON public.driver_templates(is_default) WHERE is_default = true;

-- Function to ensure only one default template per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_driver_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.driver_templates 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for single default template
CREATE TRIGGER ensure_single_default_driver_template_trigger
  BEFORE INSERT OR UPDATE ON public.driver_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_driver_template();