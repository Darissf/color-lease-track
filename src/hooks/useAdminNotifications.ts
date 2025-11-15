import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationStats {
  newContracts: number;
  unpaidContracts: number;
  total: number;
}

export const useAdminNotifications = (isAdmin: boolean) => {
  const [notifications, setNotifications] = useState<NotificationStats>({
    newContracts: 0,
    unpaidContracts: 0,
    total: 0,
  });

  useEffect(() => {
    if (!isAdmin) return;

    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("rental_contracts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rental_contracts",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchNotifications = async () => {
    // New contracts in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: newContracts } = await supabase
      .from("rental_contracts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    // Unpaid contracts
    const { data: unpaidContracts } = await supabase
      .from("rental_contracts")
      .select("id", { count: "exact", head: true })
      .gt("tagihan_belum_bayar", 0);

    const newCount = newContracts?.length || 0;
    const unpaidCount = unpaidContracts?.length || 0;

    setNotifications({
      newContracts: newCount,
      unpaidContracts: unpaidCount,
      total: newCount + unpaidCount,
    });
  };

  return notifications;
};
