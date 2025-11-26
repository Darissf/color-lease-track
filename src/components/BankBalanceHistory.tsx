import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/currency";
import { formatInJakarta } from "@/lib/timezone";
import { TrendingUp, TrendingDown, Clock, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BalanceHistory {
  id: string;
  old_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: string;
  bank_name: string;
  notes: string | null;
  created_at: string;
}

export const BankBalanceHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<BalanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('bank_account_balance_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error('Error fetching balance history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('balance-history-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bank_account_balance_history',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setHistory((prev) => [payload.new as BalanceHistory, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Belum ada riwayat perubahan saldo
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Riwayat Perubahan Saldo</h3>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* Icon */}
              <div className={`p-2 rounded-full ${
                entry.change_type === 'increase' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {entry.change_type === 'increase' ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{entry.bank_name}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(entry.old_balance)}
                  </span>
                  <span>→</span>
                  <span className="font-semibold">
                    {formatCurrency(entry.new_balance)}
                  </span>
                </div>

                <div className={`text-sm font-semibold ${
                  entry.change_type === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {entry.change_type === 'increase' ? '+' : ''}
                  {formatCurrency(entry.change_amount)}
                </div>

                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                )}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatInJakarta(entry.created_at, 'dd MMM yyyy, HH:mm')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
