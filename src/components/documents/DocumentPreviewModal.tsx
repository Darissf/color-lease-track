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
import { ResponsiveDocumentWrapper } from "./ResponsiveDocumentWrapper";
import { ZoomableDocumentWrapper } from "./ZoomableDocumentWrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { TemplateSettings, defaultSettings } from "@/components/template-settings/types";
import { CustomTextElement } from "@/components/custom-text/types";

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
  contractId?: string;
  paymentId?: string;
  contractBankInfo?: {
    bank_name: string;
    account_number: string;
    account_holder_name?: string;
  };
  accessCode?: string; // For public contract link (payment QR)
}

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentData: DocumentData | null;
  onDocumentSaved?: () => void;
}

export const DocumentPreviewModal = ({
  open,
  onOpenChange,
  documentData,
  onDocumentSaved,
}: DocumentPreviewModalProps) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { settings: brandSettings } = useBrandSettings();
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(defaultSettings);
  const [customTextElements, setCustomTextElements] = useState<CustomTextElement[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchSettings();
      fetchCustomTextElements();
    }
  }, [open, user, documentData?.documentType]);

  // Save document to database when modal opens
  useEffect(() => {
    const saveDocumentToDb = async () => {
      if (!open || !user || !documentData?.contractId || !documentData?.verificationCode) return;
      
      try {
        // Check if document already exists (using select-then-insert/update pattern)
        // This avoids PostgREST issue with partial unique indexes
        const query = documentData.paymentId 
          ? supabase
              .from('invoice_receipts')
              .select('id, verification_code')
              .eq('payment_id', documentData.paymentId)
              .eq('document_type', documentData.documentType)
          : supabase
              .from('invoice_receipts')
              .select('id, verification_code')
              .eq('contract_id', documentData.contractId)
              .eq('document_type', documentData.documentType)
              .is('payment_id', null);

        const { data: existingDoc } = await query.maybeSingle();

        if (existingDoc) {
          // UPDATE existing document - DO NOT change verification_code
          const { error } = await supabase
            .from('invoice_receipts')
            .update({
              document_number: documentData.documentNumber,
              issued_at: documentData.issuedAt.toISOString(),
              client_name: documentData.clientName,
              client_address: documentData.clientAddress || null,
              description: documentData.description,
              amount: documentData.amount,
              status: documentData.documentType === 'kwitansi' ? 'LUNAS' : 'BELUM_LUNAS',
            })
            .eq('id', existingDoc.id);
            
          if (error) {
            console.error('Error updating document:', error);
          }
        } else {
          // INSERT new document
          const { error } = await supabase
            .from('invoice_receipts')
            .insert({
              user_id: user.id,
              contract_id: documentData.contractId,
              payment_id: documentData.paymentId || null,
              document_type: documentData.documentType,
              document_number: documentData.documentNumber,
              verification_code: documentData.verificationCode,
              issued_at: documentData.issuedAt.toISOString(),
              client_name: documentData.clientName,
              client_address: documentData.clientAddress || null,
              description: documentData.description,
              amount: documentData.amount,
              status: documentData.documentType === 'kwitansi' ? 'LUNAS' : 'BELUM_LUNAS',
            });
            
          if (error) {
            console.error('Error inserting document:', error);
          }
        }
      } catch (err) {
        console.error('Error saving document to database:', err);
      }
    };

    saveDocumentToDb();
  }, [open, user, documentData]);

  const fetchSettings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("document_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      // Merge database settings with defaults, and add brand settings fallback
      const mergedSettings: TemplateSettings = {
        ...defaultSettings,
        ...data,
        // Use brand settings as fallback for logo
        invoice_logo_url: data.invoice_logo_url || brandSettings?.sidebar_logo_url || brandSettings?.brand_image_url || defaultSettings.invoice_logo_url,
        // Parse JSONB layout settings
        invoice_layout_settings: typeof data.invoice_layout_settings === 'object' && data.invoice_layout_settings
          ? { ...defaultSettings.invoice_layout_settings, ...data.invoice_layout_settings }
          : defaultSettings.invoice_layout_settings,
        receipt_layout_settings: typeof data.receipt_layout_settings === 'object' && data.receipt_layout_settings
          ? { ...defaultSettings.receipt_layout_settings, ...data.receipt_layout_settings }
          : defaultSettings.receipt_layout_settings,
      };
      setTemplateSettings(mergedSettings);
    } else {
      // No settings in database, use defaults with brand settings
      setTemplateSettings({
        ...defaultSettings,
        invoice_logo_url: brandSettings?.sidebar_logo_url || brandSettings?.brand_image_url || defaultSettings.invoice_logo_url,
      });
    }
  };

  const fetchCustomTextElements = async () => {
    if (!user || !documentData) return;
    
    const documentType = documentData.documentType === 'invoice' ? 'invoice' : 'receipt';
    
    const { data } = await supabase
      .from("custom_text_elements")
      .select("*")
      .eq("user_id", user.id)
      .eq("document_type", documentType)
      .eq("is_visible", true)
      .order("order_index");
    
    if (data) {
      setCustomTextElements(data as CustomTextElement[]);
    }
  };

  if (!documentData) return null;

  const fileName = `${documentData.documentType === 'invoice' ? 'Invoice' : 'Kwitansi'}_${documentData.documentNumber}`;

  // Render template props for reuse
  const invoiceProps = {
    documentNumber: documentData.documentNumber,
    verificationCode: documentData.verificationCode,
    issuedAt: documentData.issuedAt,
    clientName: documentData.clientName,
    clientAddress: documentData.clientAddress,
    description: documentData.description,
    amount: documentData.amount,
    contractInvoice: documentData.contractInvoice,
    period: documentData.period,
    settings: templateSettings,
    contractBankInfo: documentData.contractBankInfo,
    accessCode: documentData.accessCode,
  };

  const receiptProps = {
    documentNumber: documentData.documentNumber,
    verificationCode: documentData.verificationCode,
    issuedAt: documentData.issuedAt,
    clientName: documentData.clientName,
    clientAddress: documentData.clientAddress,
    description: documentData.description,
    amount: documentData.amount,
    invoiceNumber: documentData.invoiceNumber,
    paymentDate: documentData.paymentDate,
    settings: templateSettings,
    customTextElements: customTextElements,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader className="pr-10">
          <DialogTitle>Preview {documentData.documentType === 'invoice' ? 'Invoice' : 'Kwitansi'}</DialogTitle>
        </DialogHeader>
        
        {/* Hidden document for PDF generation - visibility hidden agar tetap di-render */}
        <div 
          className="fixed pointer-events-none"
          style={{ 
            width: '210mm',
            left: '-9999px',
            top: '0',
            visibility: 'hidden',
          }}
        >
          {documentData.documentType === 'invoice' ? (
            <InvoiceTemplate ref={documentRef} {...invoiceProps} />
          ) : (
            <ReceiptTemplate ref={documentRef} {...receiptProps} />
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <DocumentPDFGenerator
            documentRef={documentRef}
            fileName={fileName}
            onComplete={onDocumentSaved}
            showOptions={true}
          />
        </div>
        
        {/* Visible document for display - with wrappers */}
        {isMobile ? (
          <ZoomableDocumentWrapper>
            {documentData.documentType === 'invoice' ? (
              <InvoiceTemplate {...invoiceProps} />
            ) : (
              <ReceiptTemplate {...receiptProps} />
            )}
          </ZoomableDocumentWrapper>
        ) : (
          <ScrollArea className="h-[70vh]">
            <div className="py-4">
              <ResponsiveDocumentWrapper>
                {documentData.documentType === 'invoice' ? (
                  <InvoiceTemplate {...invoiceProps} />
                ) : (
                  <ReceiptTemplate {...receiptProps} />
                )}
              </ResponsiveDocumentWrapper>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
