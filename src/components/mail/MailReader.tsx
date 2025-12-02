import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Trash2, Mail, Download } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import DOMPurify from "dompurify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Email {
  id: string;
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
}

interface MailReaderProps {
  email: Email | null;
  onMarkRead: (emailId: string, isRead: boolean) => void;
  onStar: (emailId: string, isStarred: boolean) => void;
  onDelete: (emailId: string) => void;
  isSuperAdmin: boolean;
  onBack?: () => void;
}

export default function MailReader({
  email,
  onMarkRead,
  onStar,
  onDelete,
  isSuperAdmin,
  onBack,
}: MailReaderProps) {
  if (!email) {
    return (
      <div className="bg-card rounded-lg border h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Mail className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg font-medium">Pilih email untuk membaca</p>
          <p className="text-sm">Email yang dipilih akan ditampilkan di sini</p>
        </div>
      </div>
    );
  }

  const sanitizedHtml = email.body_html
    ? DOMPurify.sanitize(email.body_html, {
        ADD_TAGS: ["style"],
        ADD_ATTR: ["style", "target"],
      })
    : null;

  const handleDownloadAttachment = (attachment: any) => {
    // Attachment download will be handled via Resend API or base64 decode
    console.log("Download attachment:", attachment);
  };

  return (
    <div className="bg-card rounded-lg border h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 md:p-4 border-b space-y-2 md:space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold mb-1 line-clamp-2">
              {email.subject || "(No Subject)"}
            </h3>
            <div className="space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="font-medium shrink-0">From:</span>
                <span className="truncate">
                  {email.from_name ? (
                    <>
                      {email.from_name}{" "}
                      <span className="text-[10px] md:text-xs">&lt;{email.from_address}&gt;</span>
                    </>
                  ) : (
                    email.from_address
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <span className="font-medium shrink-0">To:</span>
                <span className="truncate">{email.to_address}</span>
              </div>
              {email.cc && email.cc.length > 0 && (
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="font-medium shrink-0">CC:</span>
                  <span className="truncate">{email.cc.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-1 md:gap-2">
                <span className="font-medium shrink-0">Date:</span>
                <span className="text-[10px] md:text-xs">
                  {format(new Date(email.received_at), "d MMM yyyy, HH:mm", {
                    locale: localeId,
                  })}{" "}
                  WIB
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 md:px-3"
            onClick={() => onStar(email.id, !email.is_starred)}
          >
            <Star
              className={`h-4 w-4 ${email.is_starred ? "fill-yellow-400 text-yellow-400" : ""} md:mr-2`}
            />
            <span className="hidden md:inline">{email.is_starred ? "Unstar" : "Star"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 md:px-3"
            onClick={() => onMarkRead(email.id, !email.is_read)}
          >
            <Mail className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{email.is_read ? "Unread" : "Read"}</span>
          </Button>

          {isSuperAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8 px-2 md:px-3">
                  <Trash2 className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Email?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Email ini akan dipindahkan ke Trash. Anda yakin ingin melanjutkan?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(email.id)}>
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 md:p-4 space-y-3 md:space-y-4">
          {sanitizedHtml ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert text-xs md:text-sm"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-xs md:text-sm font-mono">
              {email.body_text || "(Empty email body)"}
            </pre>
          )}

          {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <h4 className="font-medium text-sm md:text-base">📎 Attachments:</h4>
              <div className="space-y-2">
                {email.attachments.map((attachment: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 md:p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xl md:text-2xl shrink-0">
                        {attachment.content_type?.startsWith("image/")
                          ? "🖼️"
                          : "📄"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium truncate">
                          {attachment.filename || "attachment"}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {attachment.size
                            ? `${(attachment.size / 1024).toFixed(1)} KB`
                            : "Unknown size"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => handleDownloadAttachment(attachment)}
                    >
                      <Download className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
