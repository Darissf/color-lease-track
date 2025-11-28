#!/bin/bash
# Migration script to remove old theme system references
# This script removes all activeTheme and themeColors usage

# List of files to update
FILES=(
  "src/components/ColoredProgressBar.tsx"
  "src/components/ColoredStatCard.tsx"
  "src/components/GradientButton.tsx"
  "src/components/MonthlyViewSkeleton.tsx"
  "src/components/SkeletonLoader.tsx"
  "src/components/fixed-expenses/FixedExpenseSummary.tsx"
  "src/components/recurring-income/RecurringIncomeSummary.tsx"
  "src/pages/AISettings.tsx"
  "src/pages/AccountSettings.tsx"
  "src/pages/AdminSettings.tsx"
  "src/pages/AuditLogs.tsx"
  "src/pages/BudgetTracker.tsx"
  "src/pages/ChatBotAI.tsx"
  "src/pages/ClientDashboard.tsx"
  "src/pages/ClientGroups.tsx"
  "src/pages/CloudUsageDashboard.tsx"
  "src/pages/ContentStudio.tsx"
  "src/pages/ContractDetail.tsx"
  "src/pages/Dashboard.tsx"
  "src/pages/DatabaseBackup.tsx"
  "src/pages/ExpenseTracker.tsx"
  "src/pages/Finances.tsx"
  "src/pages/IncomeManagement.tsx"
  "src/pages/IncomeSettings.tsx"
  "src/pages/LandingSettings.tsx"
  "src/pages/MetaAdsDashboard.tsx"
  "src/pages/MonthlyDashboard.tsx"
  "src/pages/MonthlyView.tsx"
  "src/pages/Nabila.tsx"
  "src/pages/PortfolioManager.tsx"
  "src/pages/Profile.tsx"
  "src/pages/Properties.tsx"
  "src/pages/QuickActions.tsx"
  "src/pages/RecurringIncome.tsx"
  "src/pages/RentalContracts.tsx"
  "src/pages/Reports.tsx"
  "src/pages/SMTPSettings.tsx"
  "src/pages/SavingsPlans.tsx"
  "src/pages/SavingsSettings.tsx"
  "src/pages/Settings.tsx"
  "src/pages/Tasks.tsx"
  "src/pages/WhatsAppSettings.tsx"
)

# Remove activeTheme and themeColors destructuring
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Remove lines with activeTheme or themeColors destructuring
    sed -i '/const { activeTheme.*} = useAppTheme();/d' "$file"
    sed -i '/const { activeTheme, themeColors.*} = useAppTheme();/d' "$file"
    sed -i '/const {.*activeTheme.*} = useAppTheme();/d' "$file"
    echo "✓ $file updated"
  fi
done

echo "Migration complete!"
