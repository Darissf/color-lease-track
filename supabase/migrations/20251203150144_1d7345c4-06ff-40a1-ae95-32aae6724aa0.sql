-- =====================================================
-- PERFORMANCE OPTIMIZATION: Indexes & Functions
-- =====================================================

-- 1. INDEXES untuk menghilangkan sequential scans
-- =====================================================

-- Index untuk expenses (currently 0 index scans!)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_category ON expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- Index untuk income_sources
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id_date ON income_sources(user_id, date);
CREATE INDEX IF NOT EXISTS idx_income_sources_date ON income_sources(date);

-- Index untuk monthly_budgets
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_id_year_month ON monthly_budgets(user_id, year, month);

-- Index untuk rental_contracts
CREATE INDEX IF NOT EXISTS idx_rental_contracts_user_id_status ON rental_contracts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_rental_contracts_start_date ON rental_contracts(start_date);

-- Index untuk agent tables (high seq scans - 72k+ rows)
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id_created ON agent_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created_at ON agent_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status ON agent_commands(status);

-- Index untuk email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id_created ON email_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Index untuk whatsapp tables
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- 2. DATABASE FUNCTIONS untuk batch queries
-- =====================================================

-- Function: Get available years from transactions
CREATE OR REPLACE FUNCTION get_available_years(p_user_id UUID)
RETURNS TABLE(year INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT EXTRACT(YEAR FROM combined.date)::INTEGER as year
  FROM (
    SELECT date FROM income_sources WHERE user_id = p_user_id AND date IS NOT NULL
    UNION
    SELECT date FROM expenses WHERE user_id = p_user_id
  ) combined
  ORDER BY year DESC;
END;
$$;

-- Function: Get transaction summary in single query
CREATE OR REPLACE FUNCTION get_transaction_summary(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_income NUMERIC,
  total_expense NUMERIC,
  income_count BIGINT,
  expense_count BIGINT,
  net_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT SUM(amount) FROM income_sources 
      WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date), 0) as total_income,
    COALESCE((SELECT SUM(amount) FROM expenses 
      WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date), 0) as total_expense,
    COALESCE((SELECT COUNT(*) FROM income_sources 
      WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date), 0) as income_count,
    COALESCE((SELECT COUNT(*) FROM expenses 
      WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date), 0) as expense_count,
    COALESCE((SELECT SUM(amount) FROM income_sources 
      WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date), 0) -
    COALESCE((SELECT SUM(amount) FROM expenses 
      WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date), 0) as net_balance;
END;
$$;

-- Function: Get dashboard summary (combines multiple queries)
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_user_id UUID)
RETURNS TABLE(
  total_balance NUMERIC,
  total_income_this_month NUMERIC,
  total_expense_this_month NUMERIC,
  active_contracts BIGINT,
  pending_payments NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_of_month DATE;
  v_end_of_month DATE;
BEGIN
  v_start_of_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_end_of_month := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  
  RETURN QUERY
  SELECT 
    COALESCE((SELECT SUM(balance) FROM bank_accounts WHERE user_id = p_user_id AND is_active = true), 0) as total_balance,
    COALESCE((SELECT SUM(amount) FROM income_sources 
      WHERE user_id = p_user_id AND date BETWEEN v_start_of_month AND v_end_of_month), 0) as total_income_this_month,
    COALESCE((SELECT SUM(amount) FROM expenses 
      WHERE user_id = p_user_id AND date BETWEEN v_start_of_month AND v_end_of_month), 0) as total_expense_this_month,
    COALESCE((SELECT COUNT(*) FROM rental_contracts 
      WHERE user_id = p_user_id AND status = 'masa sewa'), 0) as active_contracts,
    COALESCE((SELECT SUM(tagihan_belum_bayar) FROM rental_contracts 
      WHERE user_id = p_user_id AND tagihan_belum_bayar > 0), 0) as pending_payments;
END;
$$;

-- Function: Cleanup old agent logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_agent_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agent_logs 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also cleanup old agent command outputs
  DELETE FROM agent_command_outputs
  WHERE created_at < NOW() - INTERVAL '2 hours';
  
  -- Cleanup completed/failed agent commands older than 24 hours
  DELETE FROM agent_commands
  WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '24 hours';
  
  RETURN deleted_count;
END;
$$;

-- Function: Get users with roles (batch query to fix N+1)
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  username TEXT,
  nomor_telepon TEXT,
  created_at TIMESTAMPTZ,
  email_verified BOOLEAN,
  temp_email BOOLEAN,
  is_suspended BOOLEAN,
  role TEXT,
  role_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.username,
    p.nomor_telepon,
    p.created_at,
    COALESCE(p.email_verified, false) as email_verified,
    COALESCE(p.temp_email, false) as temp_email,
    COALESCE(p.is_suspended, false) as is_suspended,
    ur.role,
    ur.id as role_id
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$;