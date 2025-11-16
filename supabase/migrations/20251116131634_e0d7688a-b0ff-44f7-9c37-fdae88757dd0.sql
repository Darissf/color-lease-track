-- ============================================
-- PHASE 1: CATEGORY-LEVEL BUDGETING
-- ============================================

-- Create category_budgets table
CREATE TABLE IF NOT EXISTS category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  monthly_budget_id UUID REFERENCES monthly_budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_category_budget UNIQUE(monthly_budget_id, category)
);

-- Enable RLS
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage their own category budgets"
ON category_budgets FOR ALL
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_category_budgets_user_month ON category_budgets(user_id, monthly_budget_id);
CREATE INDEX idx_category_budgets_category ON category_budgets(category);

-- Function to auto-create category budgets
CREATE OR REPLACE FUNCTION create_default_category_budgets()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default categories with proportional allocation
  INSERT INTO category_budgets (user_id, monthly_budget_id, category, allocated_amount)
  VALUES 
    (NEW.user_id, NEW.id, 'Belanja', COALESCE(NEW.target_belanja, 0) * 0.30),
    (NEW.user_id, NEW.id, 'Transportasi', COALESCE(NEW.target_belanja, 0) * 0.20),
    (NEW.user_id, NEW.id, 'Utilitas', COALESCE(NEW.target_belanja, 0) * 0.15),
    (NEW.user_id, NEW.id, 'Pemeliharaan Properti', COALESCE(NEW.target_belanja, 0) * 0.15),
    (NEW.user_id, NEW.id, 'Pajak', COALESCE(NEW.target_belanja, 0) * 0.10),
    (NEW.user_id, NEW.id, 'Lainnya', COALESCE(NEW.target_belanja, 0) * 0.10)
  ON CONFLICT (monthly_budget_id, category) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create on budget creation
DROP TRIGGER IF EXISTS trigger_create_category_budgets ON monthly_budgets;
CREATE TRIGGER trigger_create_category_budgets
AFTER INSERT ON monthly_budgets
FOR EACH ROW
EXECUTE FUNCTION create_default_category_budgets();

-- ============================================
-- PHASE 2: SMART ALERTS & NOTIFICATIONS
-- ============================================

-- Budget alerts table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  monthly_budget_id UUID REFERENCES monthly_budgets(id) ON DELETE CASCADE,
  category TEXT,
  alert_type TEXT NOT NULL,
  threshold_percentage NUMERIC,
  is_enabled BOOLEAN DEFAULT true,
  notification_method TEXT DEFAULT 'toast',
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history table
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  alert_id UUID REFERENCES budget_alerts(id) ON DELETE CASCADE,
  monthly_budget_id UUID REFERENCES monthly_budgets(id),
  category TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own alerts"
ON budget_alerts FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alert history"
ON alert_history FOR ALL
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_budget_alerts_user ON budget_alerts(user_id, is_enabled);
CREATE INDEX idx_alert_history_user_unread ON alert_history(user_id, is_read, triggered_at DESC);

-- ============================================
-- PHASE 4: BUDGET TEMPLATES & AUTOMATION
-- ============================================

-- Budget templates table
CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  category_allocations JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget automation rules
CREATE TABLE IF NOT EXISTS budget_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  configuration JSONB NOT NULL,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own and public templates"
ON budget_templates FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage their own templates"
ON budget_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON budget_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON budget_templates FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own automation rules"
ON budget_automation_rules FOR ALL
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_budget_templates_user ON budget_templates(user_id);
CREATE INDEX idx_budget_templates_public ON budget_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_automation_rules_user_enabled ON budget_automation_rules(user_id, is_enabled);

-- Function to apply template
CREATE OR REPLACE FUNCTION apply_budget_template(
  p_user_id UUID,
  p_budget_id UUID,
  p_template_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_template RECORD;
  v_budget RECORD;
  v_category TEXT;
  v_percentage NUMERIC;
  v_allocated NUMERIC;
BEGIN
  SELECT * INTO v_template FROM budget_templates WHERE id = p_template_id;
  SELECT * INTO v_budget FROM monthly_budgets WHERE id = p_budget_id;
  
  DELETE FROM category_budgets WHERE monthly_budget_id = p_budget_id;
  
  FOR v_category, v_percentage IN 
    SELECT key, (value::TEXT)::NUMERIC FROM jsonb_each_text(v_template.category_allocations)
  LOOP
    v_allocated := COALESCE(v_budget.target_belanja, 0) * (v_percentage / 100);
    
    INSERT INTO category_budgets (user_id, monthly_budget_id, category, allocated_amount)
    VALUES (p_user_id, p_budget_id, v_category, v_allocated);
  END LOOP;
  
  UPDATE budget_templates SET usage_count = usage_count + 1 WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;