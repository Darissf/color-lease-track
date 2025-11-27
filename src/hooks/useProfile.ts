import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  nomor_telepon: string | null;
  avatar_url: string | null;
  notification_email: boolean;
  notification_push: boolean;
  notification_due_date: boolean;
  notification_payment: boolean;
  notification_budget_alert: boolean;
  notification_monthly_report: boolean;
  email_verified: boolean | null;
  temp_email: boolean | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const refetch = () => {
    setLoading(true);
    return fetchProfile();
  };

  return { profile, loading, refetch };
}
