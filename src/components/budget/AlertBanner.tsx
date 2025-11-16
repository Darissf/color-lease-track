import { useState } from "react";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Alert as AlertType } from "@/types/budgetTypes";

interface AlertBannerProps {
  alerts: AlertType[];
}

export const AlertBanner = ({ alerts }: AlertBannerProps) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const criticalAlerts = alerts.filter(
    a => a.severity === 'danger' && !dismissedAlerts.includes(a.id)
  );

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  if (criticalAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {criticalAlerts.map(alert => (
        <Alert key={alert.id} variant="destructive" className="relative">
          <AlertDescription className="flex items-center justify-between pr-8">
            <span>{alert.message}</span>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={() => handleDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
