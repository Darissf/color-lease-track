import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface CostEstimatorProps {
  databaseSize: number;
  storageSize: number;
  functionCalls: number;
  aiCost: number;
  activeUsers: number;
}

const FREE_DB = 500 * 1024 * 1024; // 500MB
const FREE_STORAGE = 1024 * 1024 * 1024; // 1GB
const FREE_FUNCTIONS = 500000; // 500K
const FREE_USERS = 50000; // 50K MAU

export function CostEstimator({
  databaseSize,
  storageSize,
  functionCalls,
  aiCost,
  activeUsers
}: CostEstimatorProps) {
  const calculateCost = () => {
    let totalCost = 0;
    const breakdown: Record<string, number> = {};

    // AI costs (always paid)
    const aiCostIDR = aiCost * 15000;
    breakdown['AI Usage'] = aiCostIDR;
    totalCost += aiCostIDR;

    // Database overage (if > 500MB)
    if (databaseSize > FREE_DB) {
      const overageGB = (databaseSize - FREE_DB) / (1024 * 1024 * 1024);
      const dbCost = overageGB * 0.125 * 15000; // $0.125/GB
      breakdown['Database'] = dbCost;
      totalCost += dbCost;
    } else {
      breakdown['Database'] = 0;
    }

    // Storage overage (if > 1GB)
    if (storageSize > FREE_STORAGE) {
      const overageGB = (storageSize - FREE_STORAGE) / (1024 * 1024 * 1024);
      const storageCost = overageGB * 0.021 * 15000; // $0.021/GB
      breakdown['Storage'] = storageCost;
      totalCost += storageCost;
    } else {
      breakdown['Storage'] = 0;
    }

    // Edge Functions overage (if > 500K)
    if (functionCalls > FREE_FUNCTIONS) {
      const overage = functionCalls - FREE_FUNCTIONS;
      const funcCost = (overage / 1000000) * 2 * 15000; // $2 per million
      breakdown['Functions'] = funcCost;
      totalCost += funcCost;
    } else {
      breakdown['Functions'] = 0;
    }

    // Users are free up to 50K
    breakdown['Users'] = 0;

    return { totalCost, breakdown };
  };

  const { totalCost, breakdown } = calculateCost();
  const maxBudget = 200000; // Rp 200K/month budget
  const budgetPercentage = (totalCost / maxBudget) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          💰 Estimated Monthly Cost
        </CardTitle>
        <CardDescription>
          Current usage projection for this month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Month</p>
              <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(maxBudget)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{budgetPercentage.toFixed(1)}% of budget used</span>
              <span className={budgetPercentage > 80 ? "text-destructive font-medium" : "text-green-500"}>
                {budgetPercentage > 80 ? "⚠️ High" : "✅ Safe"}
              </span>
            </div>
            <Progress 
              value={Math.min(budgetPercentage, 100)} 
              className={`h-3 ${budgetPercentage > 80 ? "[&>div]:bg-destructive" : "[&>div]:bg-green-500"}`}
            />
          </div>

          <div className="grid gap-2 mt-4">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  {value === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                  <span className="text-sm font-medium">{key}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${value === 0 ? 'text-green-500' : ''}`}>
                    {value === 0 ? 'FREE' : formatCurrency(value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
