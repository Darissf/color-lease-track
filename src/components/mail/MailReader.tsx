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
}

export default function MailReader({
  email,
  onMarkRead,
  onStar,
  onDelete,
  isSuperAdmin,
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
    <div className="bg-card rounded-lg border h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1">
              {email.subject || "(No Subject)"}
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">From:</span>
                <span className="truncate">
                  {email.from_name ? (
                    <>
                      {email.from_name}{" "}
                      <span className="text-xs">&lt;{email.from_address}&gt;</span>
                    </>
                  ) : (
                    email.from_address
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">To:</span>
                <span className="truncate">{email.to_address}</span>
              </div>
              {email.cc && email.cc.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">CC:</span>
                  <span className="truncate">{email.cc.join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium">Date:</span>
                <span>
                  {format(new Date(email.received_at), "d MMM yyyy, HH:mm:ss", {
                    locale: localeId,
                  })}{" "}
                  WIB
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStar(email.id, !email.is_starred)}
          >
            <Star
              className={`h-4 w-4 mr-2 ${
                email.is_starred ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
            {email.is_starred ? "Unstar" : "Star"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkRead(email.id, !email.is_read)}
          >
            <Mail className="h-4 w-4 mr-2" />
            {email.is_read ? "Mark Unread" : "Mark Read"}
          </Button>

          {isSuperAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
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
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {sanitizedHtml ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {email.body_text || "(Empty email body)"}
            </pre>
          )}

          {email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <h4 className="font-medium">📎 Attachments:</h4>
              <div className="space-y-2">
                {email.attachments.map((attachment: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {attachment.content_type?.startsWith("image/")
                          ? "🖼️"
                          : "📄"}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {attachment.filename || "attachment"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size
                            ? `${(attachment.size / 1024).toFixed(1)} KB`
                            : "Unknown size"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadAttachment(attachment)}
                    >
                      <Download className="h-4 w-4" />
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
