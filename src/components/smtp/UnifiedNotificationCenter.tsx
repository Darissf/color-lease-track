import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, MessageSquare, Clock } from "lucide-react";

interface NotificationPreference {
  id: string;
  notification_type: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  priority: number;
  preferred_time_start: string;
  preferred_time_end: string;
}

const notificationTypes = [
  { value: "reset_password", label: "Reset Password" },
  { value: "welcome", label: "Welcome Email" },
  { value: "invoice", label: "Invoice" },
  { value: "payment", label: "Payment Confirmation" },
  { value: "delivery", label: "Delivery Notification" },
  { value: "pickup", label: "Pickup Notification" },
  { value: "reminder", label: "Payment Reminder" },
];

const UnifiedNotificationCenter = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [currentPreference, setCurrentPreference] = useState<
    Partial<NotificationPreference>
  >({
    email_enabled: true,
    whatsapp_enabled: false,
    priority: 5,
    preferred_time_start: "09:00:00",
    preferred_time_end: "17:00:00",
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (selectedType) {
      const pref = preferences.find((p) => p.notification_type === selectedType);
      if (pref) {
        setCurrentPreference(pref);
      } else {
        setCurrentPreference({
          notification_type: selectedType,
          email_enabled: true,
          whatsapp_enabled: false,
          priority: 5,
          preferred_time_start: "09:00:00",
          preferred_time_end: "17:00:00",
        });
      }
    }
  }, [selectedType, preferences]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setPreferences(data || []);
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("notification_preferences").upsert({
        id: currentPreference.id || undefined,
        user_id: user.id,
        notification_type: currentPreference.notification_type,
        email_enabled: currentPreference.email_enabled,
        whatsapp_enabled: currentPreference.whatsapp_enabled,
        priority: currentPreference.priority,
        preferred_time_start: currentPreference.preferred_time_start,
        preferred_time_end: currentPreference.preferred_time_end,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences saved",
      });

      fetchPreferences();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getChannelBadges = (pref: NotificationPreference) => {
    const badges = [];
    if (pref.email_enabled) {
      badges.push(
        <Badge key="email" variant="default" className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          Email
        </Badge>
      );
    }
    if (pref.whatsapp_enabled) {
      badges.push(
        <Badge
          key="whatsapp"
          variant="secondary"
          className="flex items-center gap-1"
        >
          <MessageSquare className="h-3 w-3" />
          WhatsApp
        </Badge>
      );
    }
    if (badges.length === 0) {
      badges.push(
        <Badge key="disabled" variant="outline">
          Disabled
        </Badge>
      );
    }
    return badges;
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Unified Notification Center</h3>
          <p className="text-sm text-muted-foreground">
            Manage email and WhatsApp notifications from one place with smart
            scheduling
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Notification Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose notification type..." />
              </SelectTrigger>
              <SelectContent>
                {notificationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <Label htmlFor="email_enabled">Email Notifications</Label>
                  </div>
                  <Switch
                    id="email_enabled"
                    checked={currentPreference.email_enabled}
                    onCheckedChange={(checked) =>
                      setCurrentPreference({
                        ...currentPreference,
                        email_enabled: checked,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <Label htmlFor="whatsapp_enabled">
                      WhatsApp Notifications
                    </Label>
                  </div>
                  <Switch
                    id="whatsapp_enabled"
                    checked={currentPreference.whatsapp_enabled}
                    onCheckedChange={(checked) =>
                      setCurrentPreference({
                        ...currentPreference,
                        whatsapp_enabled: checked,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority (1-10)</Label>
                <Select
                  value={currentPreference.priority?.toString()}
                  onValueChange={(value) =>
                    setCurrentPreference({
                      ...currentPreference,
                      priority: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(10)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1} {i + 1 >= 8 ? "(High)" : i + 1 <= 3 ? "(Low)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Label>Smart Scheduling Window</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time" className="text-sm">
                      Start Time
                    </Label>
                    <Select
                      value={currentPreference.preferred_time_start}
                      onValueChange={(value) =>
                        setCurrentPreference({
                          ...currentPreference,
                          preferred_time_start: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(24)].map((_, i) => (
                          <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00:00`}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="end_time" className="text-sm">
                      End Time
                    </Label>
                    <Select
                      value={currentPreference.preferred_time_end}
                      onValueChange={(value) =>
                        setCurrentPreference({
                          ...currentPreference,
                          preferred_time_end: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(24)].map((_, i) => (
                          <SelectItem key={i} value={`${i.toString().padStart(2, "0")}:00:00`}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Notifications will be delayed until this time window if sent outside
                  business hours
                </p>
              </div>

              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="font-semibold mb-4">Current Preferences Overview</h4>
        <div className="space-y-2">
          {notificationTypes.map((type) => {
            const pref = preferences.find((p) => p.notification_type === type.value);
            return (
              <div
                key={type.value}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                onClick={() => setSelectedType(type.value)}
              >
                <span className="font-medium">{type.label}</span>
                <div className="flex items-center gap-2">
                  {pref ? (
                    getChannelBadges(pref)
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default UnifiedNotificationCenter;
