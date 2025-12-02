import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Inbox, Star, Trash2, Search, RefreshCw, Mail as MailIcon, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import MailList from "@/components/mail/MailList";
import MailReader from "@/components/mail/MailReader";
import EmailAddressFilter from "@/components/mail/EmailAddressFilter";

interface Email {
  id: string;
  email_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string;
  cc?: string[];
  subject: string;
  body_text: string;
  body_html: string;
  attachments: any;
  is_read: boolean;
  is_starred: boolean;
  is_deleted: boolean;
  deleted_by?: string | null;
  deleted_at?: string | null;
  received_at: string;
  created_at: string;
}

type FilterType = "inbox" | "starred" | "trash";

export default function MailPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (user && (isSuperAdmin || isAdmin)) {
      fetchEmails();
    }
  }, [user, isSuperAdmin, isAdmin, filter, selectedAddress]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("mail_inbox")
        .select("*")
        .order("received_at", { ascending: false });

      // Filter by monitored address if selected
      if (selectedAddress) {
        query = query.eq("to_address", selectedAddress);
      }

      if (filter === "inbox") {
        query = query.eq("is_deleted", false);
      } else if (filter === "starred") {
        query = query.eq("is_starred", true).eq("is_deleted", false);
      } else if (filter === "trash") {
        query = query.eq("is_deleted", true);
      }

      if (searchQuery) {
        query = query.or(
          `from_address.ilike.%${searchQuery}%,from_name.ilike.%${searchQuery}%,subject.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmails((data || []) as Email[]);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Error",
        description: "Gagal memuat email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (emailId: string, isRead: boolean) => {
    try {
      const { error } = await supabase
        .from("mail_inbox")
        .update({ is_read: isRead })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(
        emails.map((email) =>
          email.id === emailId ? { ...email, is_read: isRead } : email
        )
      );

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, is_read: isRead });
      }
    } catch (error) {
      console.error("Error updating email:", error);
      toast({
        title: "Error",
        description: "Gagal mengubah status email",
        variant: "destructive",
      });
    }
  };

  const handleStar = async (emailId: string, isStarred: boolean) => {
    try {
      const { error } = await supabase
        .from("mail_inbox")
        .update({ is_starred: isStarred })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(
        emails.map((email) =>
          email.id === emailId ? { ...email, is_starred: isStarred } : email
        )
      );

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, is_starred: isStarred });
      }

      toast({
        title: "Success",
        description: isStarred ? "Email ditandai penting" : "Tanda dihapus",
      });
    } catch (error) {
      console.error("Error starring email:", error);
      toast({
        title: "Error",
        description: "Gagal mengubah status email",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (emailId: string) => {
    if (!isSuperAdmin) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya Super Admin yang dapat menghapus email",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("mail_inbox")
        .update({
          is_deleted: true,
          deleted_by: user?.id,
          deleted_at: new Date().toISOString(),
        })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(emails.filter((email) => email.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }

      toast({
        title: "Success",
        description: "Email berhasil dihapus",
      });
    } catch (error) {
      console.error("Error deleting email:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus email",
        variant: "destructive",
      });
    }
  };

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await handleMarkRead(email.id, true);
    }
  };

  const unreadCount = emails.filter((e) => !e.is_read && !e.is_deleted).length;
  const starredCount = emails.filter((e) => e.is_starred && !e.is_deleted).length;
  const trashCount = emails.filter((e) => e.is_deleted).length;

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="h-[calc(100vh-104px)] flex items-center justify-center">
        <div className="text-center">
          <MailIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground">
            Anda tidak memiliki izin untuk mengakses Mail Inbox
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-104px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              📬 Mail Inbox
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              Kelola email masuk domain sewascaffoldingbali.com
            </p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/vip/settings/smtp?tab=monitored")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
            <Button onClick={fetchEmails} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Sidebar */}
        <div className="md:col-span-3 shrink-0 md:shrink">
          <div className="bg-card rounded-lg border p-4 h-full">
            <div className="space-y-2">
              <Button
                variant={filter === "inbox" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFilter("inbox")}
              >
                <Inbox className="h-4 w-4 mr-2" />
                Inbox
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={filter === "starred" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFilter("starred")}
              >
                <Star className="h-4 w-4 mr-2" />
                Starred
                {starredCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {starredCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={filter === "trash" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFilter("trash")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Trash
                {trashCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {trashCount}
                  </Badge>
                )}
              </Button>

              <Separator className="my-4" />

              <EmailAddressFilter
                selectedAddress={selectedAddress}
                onSelectAddress={setSelectedAddress}
              />

              <Separator className="my-4" />

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchEmails();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="md:col-span-4 min-h-0">
          <MailList
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={handleEmailSelect}
            loading={loading}
          />
        </div>

        {/* Email Reader */}
        <div className="md:col-span-5 min-h-0">
          <MailReader
            email={selectedEmail}
            onMarkRead={handleMarkRead}
            onStar={handleStar}
            onDelete={handleDelete}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>
    </div>
  );
}
