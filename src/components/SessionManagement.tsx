import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Monitor, Smartphone, Tablet, LogOut } from "lucide-react";
import { formatInJakarta } from "@/lib/timezone";

interface Session {
  id: string;
  device_info: any;
  ip_address: string;
  user_agent: string;
  last_active: string;
  created_at: string;
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-sessions', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setSessions(data.sessions || []);
    } catch (error: any) {
      toast.error("Gagal memuat sesi login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (sessionId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-sessions', {
        body: { action: 'logout', sessionId }
      });

      if (error) throw error;
      toast.success("Sesi berhasil dikeluarkan");
      fetchSessions();
    } catch (error: any) {
      toast.error("Gagal mengeluarkan sesi");
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm("Yakin ingin mengeluarkan semua sesi lainnya?")) return;

    try {
      const { error } = await supabase.functions.invoke('manage-sessions', {
        body: { action: 'logout_all', sessionId: currentSessionId }
      });

      if (error) throw error;
      toast.success("Semua sesi lainnya berhasil dikeluarkan");
      fetchSessions();
    } catch (error: any) {
      toast.error("Gagal mengeluarkan sesi");
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (!userAgent) return <Monitor className="w-5 h-5" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-5 h-5" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  const getDeviceName = (userAgent: string) => {
    if (!userAgent) return "Unknown Device";
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return "Chrome Browser";
    if (ua.includes('firefox')) return "Firefox Browser";
    if (ua.includes('safari')) return "Safari Browser";
    if (ua.includes('edge')) return "Edge Browser";
    return "Web Browser";
  };

  if (loading) {
    return <div className="text-center py-8">Memuat...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sesi Login Aktif</h3>
          <p className="text-sm text-muted-foreground">
            Kelola perangkat yang sedang login ke akun Anda
          </p>
        </div>
        {sessions.length > 1 && (
          <Button variant="destructive" size="sm" onClick={handleLogoutAll}>
            <LogOut className="w-4 h-4 mr-2" />
            Keluarkan Semua
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Card key={session.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getDeviceIcon(session.user_agent)}
                </div>
                <div className="space-y-1">
                  <div className="font-medium">
                    {getDeviceName(session.user_agent)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    IP: {session.ip_address || "Unknown"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Terakhir aktif: {formatInJakarta(session.last_active, "PPp")}
                  </div>
                  {session.id === currentSessionId && (
                    <div className="text-xs text-primary font-medium">
                      ● Sesi ini
                    </div>
                  )}
                </div>
              </div>
              
              {session.id !== currentSessionId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLogout(session.id)}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Tidak ada sesi aktif
        </div>
      )}
    </div>
  );
}
