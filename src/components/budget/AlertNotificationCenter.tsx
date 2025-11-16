import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Alert } from "@/types/budgetTypes";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AlertNotificationCenterProps {
  alerts: Alert[];
}

export const AlertNotificationCenter = ({ alerts }: AlertNotificationCenterProps) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(alerts.length);
  }, [alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'text-destructive';
      case 'warning':
        return 'text-orange-600';
      case 'info':
        return 'text-blue-600';
      default:
        return '';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'danger':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 font-semibold">Notifikasi Budget</div>
        <DropdownMenuSeparator />
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Tidak ada notifikasi
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="cursor-pointer flex-col items-start p-3"
                onClick={() => alert.action?.onClick()}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.message}
                    </p>
                    {alert.category && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Kategori: {alert.category}
                      </p>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
