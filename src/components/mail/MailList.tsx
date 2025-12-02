import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  received_at: string;
  mail_type?: string;
}

interface MailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
  loading: boolean;
}

export default function MailList({
  emails,
  selectedEmail,
  onSelectEmail,
  loading,
}: MailListProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border h-full p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-card rounded-lg border h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Tidak ada email</p>
          <p className="text-sm">Email yang masuk akan muncul di sini</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col overflow-hidden">
      <div className="p-2 md:p-3 border-b shrink-0">
        <p className="text-xs md:text-sm font-medium">
          {emails.length} {emails.length === 1 ? "email" : "emails"}
        </p>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-1 md:p-2 space-y-1">
          {emails.map((email) => (
            <button
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={cn(
                "w-full text-left p-2 md:p-3 rounded-lg transition-colors hover:bg-accent",
                selectedEmail?.id === email.id && "bg-accent",
                !email.is_read && "bg-accent/50"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5">
                  {email.is_starred ? (
                    <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <Star className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-xs md:text-sm truncate",
                        !email.is_read && "font-semibold"
                      )}
                    >
                      {(email as any).mail_type === 'outbound' ? (
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">→</span>
                          {email.to_address}
                        </span>
                      ) : (
                        email.from_name || email.from_address
                      )}
                    </p>
                    <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                      {format(new Date(email.received_at), "HH:mm", {
                        locale: localeId,
                      })}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs md:text-sm truncate",
                      !email.is_read ? "font-medium" : "text-muted-foreground"
                    )}
                  >
                    {email.subject || "(No Subject)"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate flex-1">
                      {email.body_text?.substring(0, 60)}...
                    </p>
                    {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] md:text-xs h-4 md:h-5">
                        <Paperclip className="h-2 w-2 md:h-3 md:w-3 md:mr-1" />
                        <span className="hidden md:inline">{email.attachments.length}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
