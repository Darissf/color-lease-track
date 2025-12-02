import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonitoredAddress {
  id: string;
  email_address: string;
  display_name: string;
  badge_color: string;
  is_active: boolean;
  display_order: number;
}

interface EmailAddressFilterProps {
  selectedAddress: string | null;
  onSelectAddress: (address: string | null) => void;
}

export default function EmailAddressFilter({
  selectedAddress,
  onSelectAddress,
}: EmailAddressFilterProps) {
  const [addresses, setAddresses] = useState<MonitoredAddress[]>([]);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from("monitored_email_addresses")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAddresses(data || []);
      
      // Fetch email counts for each address
      if (data && data.length > 0) {
        await fetchEmailCounts(data);
      }
    } catch (error) {
      console.error("Error fetching monitored addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailCounts = async (addressList: MonitoredAddress[]) => {
    try {
      const counts: Record<string, number> = {};
      
      // Get total count
      const { count: totalCount } = await supabase
        .from("mail_inbox")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);
      
      counts["all"] = totalCount || 0;

      // Get count for each monitored address
      for (const addr of addressList) {
        const { count } = await supabase
          .from("mail_inbox")
          .select("*", { count: "exact", head: true })
          .eq("to_address", addr.email_address)
          .eq("is_deleted", false);
        
        counts[addr.email_address] = count || 0;
      }
      
      setEmailCounts(counts);
    } catch (error) {
      console.error("Error fetching email counts:", error);
    }
  };

  // Refresh counts when selected address changes
  useEffect(() => {
    if (addresses.length > 0) {
      fetchEmailCounts(addresses);
    }
  }, [selectedAddress]);

  if (loading || addresses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 md:space-y-2">
      <div className="px-2 py-0.5 md:py-1">
        <p className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          📧 Alamat Email
        </p>
      </div>
      
      {/* All emails button */}
      <Button
        variant={selectedAddress === null ? "default" : "ghost"}
        className="w-full justify-start h-8 md:h-9 text-sm"
        onClick={() => onSelectAddress(null)}
      >
        <div
          className="h-2 w-2 rounded-full mr-2 shrink-0"
          style={{ backgroundColor: "#0ea5e9" }}
        />
        <span className="truncate">All</span>
        {emailCounts["all"] > 0 && (
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
            {emailCounts["all"]}
          </Badge>
        )}
      </Button>

      {/* Monitored address buttons */}
      {addresses.map((addr) => (
        <Button
          key={addr.id}
          variant={selectedAddress === addr.email_address ? "default" : "ghost"}
          className="w-full justify-start h-8 md:h-9 text-sm"
          onClick={() => onSelectAddress(addr.email_address)}
        >
          <div
            className="h-2 w-2 rounded-full mr-2 shrink-0"
            style={{ backgroundColor: addr.badge_color }}
          />
          <span className="truncate">{addr.display_name}</span>
          {emailCounts[addr.email_address] > 0 && (
            <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
              {emailCounts[addr.email_address]}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}