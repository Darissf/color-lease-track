export interface CategoryBudget {
  id: string;
  user_id: string;
  monthly_budget_id: string;
  category: string;
  allocated_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryProgress {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger' | 'over';
}

export interface BudgetAlert {
  id: string;
  user_id: string;
  monthly_budget_id: string | null;
  category: string | null;
  alert_type: string;
  threshold_percentage: number | null;
  is_enabled: boolean;
  notification_method: string;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistoryItem {
  id: string;
  user_id: string;
  alert_id: string | null;
  monthly_budget_id: string | null;
  category: string | null;
  triggered_at: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  is_read: boolean;
  metadata: any;
}

export interface Alert {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  type: 'threshold' | 'over_budget' | 'daily_pace' | 'category_limit' | 'smart_recommendation';
  category?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface BudgetTemplate {
  id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  is_public: boolean;
  is_default: boolean;
  usage_count: number;
  category_allocations: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  rule_type: 'auto_rollover' | 'auto_adjust' | 'auto_allocate';
  is_enabled: boolean;
  configuration: any;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetInsight {
  id: string;
  type: 'warning' | 'tip' | 'congratulation' | 'trend';
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  priority: number;
}
