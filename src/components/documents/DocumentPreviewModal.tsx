import { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { ReceiptTemplate } from "./ReceiptTemplate";
import { DocumentPDFGenerator } from "./DocumentPDFGenerator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";

interface DocumentData {
  documentType: 'invoice' | 'kwitansi';
  documentNumber: string;
  verificationCode: string;
  issuedAt: Date;
  clientName: string;
  clientAddress?: string;
  description: string;
  amount: number;
  invoiceNumber?: string;
  paymentDate?: Date;
  contractInvoice?: string;
  period?: string;
}

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentData: DocumentData | null;
  onDocumentSaved?: () => void;
}

interface DocumentSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  owner_name: string;
  signature_image_url: string | null;
}

export const DocumentPreviewModal = ({
  open,
  onOpenChange,
  documentData,
  onDocumentSaved,
}: DocumentPreviewModalProps) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { settings: brandSettings } = useBrandSettings();
  const [settings, setSettings] = useState<DocumentSettings | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchSettings();
    }
  }, [open, user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("document_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setSettings(data as DocumentSettings);
    }
  };

  if (!documentData) return null;

  const companyName = settings?.company_name || brandSettings?.app_name || "Sewa Scaffolding Bali";
  const fileName = `${documentData.documentType === 'invoice' ? 'Invoice' : 'Kwitansi'}_${documentData.documentNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Preview {documentData.documentType === 'invoice' ? 'Invoice' : 'Kwitansi'}</span>
            <DocumentPDFGenerator
              documentRef={documentRef}
              fileName={fileName}
              onComplete={onDocumentSaved}
            />
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh]">
          <div className="flex justify-center py-4">
            {documentData.documentType === 'invoice' ? (
              <InvoiceTemplate
                ref={documentRef}
                documentNumber={documentData.documentNumber}
                verificationCode={documentData.verificationCode}
                issuedAt={documentData.issuedAt}
                clientName={documentData.clientName}
                clientAddress={documentData.clientAddress}
                description={documentData.description}
                amount={documentData.amount}
                companyName={companyName}
                companyAddress={settings?.company_address}
                companyPhone={settings?.company_phone}
                ownerName={settings?.owner_name}
                signatureUrl={settings?.signature_image_url || undefined}
                logoUrl={brandSettings?.logo_url || undefined}
                contractInvoice={documentData.contractInvoice}
                period={documentData.period}
              />
            ) : (
              <ReceiptTemplate
                ref={documentRef}
                documentNumber={documentData.documentNumber}
                verificationCode={documentData.verificationCode}
                issuedAt={documentData.issuedAt}
                clientName={documentData.clientName}
                clientAddress={documentData.clientAddress}
                description={documentData.description}
                amount={documentData.amount}
                companyName={companyName}
                companyAddress={settings?.company_address}
                companyPhone={settings?.company_phone}
                ownerName={settings?.owner_name}
                signatureUrl={settings?.signature_image_url || undefined}
                logoUrl={brandSettings?.logo_url || undefined}
                invoiceNumber={documentData.invoiceNumber}
                paymentDate={documentData.paymentDate}
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
