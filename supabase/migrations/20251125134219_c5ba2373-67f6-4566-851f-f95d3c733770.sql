-- Add function_name column to track which function made the AI call
ALTER TABLE ai_usage_analytics 
  ADD COLUMN IF NOT EXISTS function_name TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_analytics(ai_provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_function ON ai_usage_analytics(function_name);

-- Add comment for documentation
COMMENT ON COLUMN ai_usage_analytics.function_name IS 'Name of the edge function that made the AI call (e.g., ai-chat, ai-budget-advisor)';