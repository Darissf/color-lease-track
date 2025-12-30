import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InvoiceTemplate } from './InvoiceTemplate';
import { ReceiptTemplate } from './ReceiptTemplate';
import { DocumentPDFGenerator } from './DocumentPDFGenerator';
import { ResponsiveDocumentWrapper } from './ResponsiveDocumentWrapper';
import { ZoomableDocumentWrapper } from './ZoomableDocumentWrapper';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TemplateSettings, defaultSettings } from '@/components/template-settings/types';
import { CustomTextElement } from '@/components/custom-text/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface ContractData {
  id: string;
  invoice: string | null;
  keterangan: string | null;
  start_date: string;
  end_date: string;
  tanggal: string | null;
  tagihan: number;
  tagihan_belum_bayar: number;
}

interface ClientData {
  nama: string;
  nomor_telepon: string;
}

interface PaymentData {
  id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
}

interface PublicDocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessCode: string;
  documentType: 'invoice' | 'kwitansi';
  contractData: ContractData;
  clientData: ClientData | null;
  paymentId?: string;
}

export function PublicDocumentPreviewModal({
  open,
  onOpenChange,
  accessCode,
  documentType,
  contractData,
  clientData,
  paymentId,
}: PublicDocumentPreviewModalProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(defaultSettings);
  const [bankInfo, setBankInfo] = useState<{ bank_name: string; account_number: string; account_holder_name?: string } | null>(null);
  const [customTextElements, setCustomTextElements] = useState<CustomTextElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      generateDocument();
    } else {
      setVerificationCode(null);
      setPaymentData(null);
      setBankInfo(null);
      setCustomTextElements([]);
      setIsLoading(true);
    }
  }, [open, documentType, paymentId]);

  const generateDocument = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-document-generate', {
        body: {
          access_code: accessCode,
          document_type: documentType,
          payment_id: paymentId,
        },
      });

      if (error) {
        console.error('Error generating document:', error);
        toast.error('Gagal generate dokumen');
        onOpenChange(false);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        onOpenChange(false);
        return;
      }

      setVerificationCode(data.verification_code);
      
      // Set template settings from response
      if (data.template_settings) {
        setTemplateSettings({ ...defaultSettings, ...data.template_settings });
      }
      
      if (data.payment) {
        setPaymentData(data.payment);
      }
      
      if (data.bank_info) {
        setBankInfo(data.bank_info);
      }
      
      if (data.custom_text_elements) {
        setCustomTextElements(data.custom_text_elements);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Terjadi kesalahan saat generate dokumen');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileName = () => {
    const docType = documentType === 'invoice' ? 'Invoice' : 'Kwitansi';
    const invoice = contractData.invoice || contractData.id.substring(0, 8);
    return `${docType}-${invoice}`;
  };

  // Reusable template props
  const invoiceProps = verificationCode ? {
    documentNumber: contractData.invoice || `INV-${contractData.id.substring(0, 8)}`,
    verificationCode: verificationCode,
    issuedAt: contractData.tanggal ? new Date(contractData.tanggal) : new Date(),
    clientName: clientData?.nama || 'Klien',
    description: contractData.keterangan || 'Sewa Scaffolding',
    amount: contractData.tagihan,
    contractInvoice: contractData.invoice || undefined,
    period: `${contractData.start_date} - ${contractData.end_date}`,
    settings: templateSettings,
    contractBankInfo: bankInfo || undefined,
    accessCode: accessCode,
  } : null;

  const receiptProps = verificationCode ? {
    documentNumber: `KWT-${contractData.invoice || contractData.id.substring(0, 8)}`,
    verificationCode: verificationCode,
    issuedAt: contractData.tanggal ? new Date(contractData.tanggal) : new Date(),
    clientName: clientData?.nama || 'Klien',
    description: `Pembayaran sewa scaffolding - ${contractData.keterangan || 'Invoice ' + contractData.invoice}`,
    amount: paymentData?.amount || (contractData.tagihan - contractData.tagihan_belum_bayar),
    invoiceNumber: contractData.invoice || undefined,
    paymentDate: paymentData?.payment_date ? new Date(paymentData.payment_date) : undefined,
    settings: templateSettings,
    customTextElements: customTextElements,
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-4xl max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader className="pr-10">
          <DialogTitle>
            {documentType === 'invoice' ? 'Preview Invoice' : 'Preview Kwitansi'}
          </DialogTitle>
        </DialogHeader>
        
        {!isLoading && verificationCode && (
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <DocumentPDFGenerator
              documentRef={documentRef}
              fileName={getFileName()}
              showOptions={true}
            />
          </div>
        )}

        {/* Visible document dengan ref - akan di-clone saat capture PDF */}
        {isLoading || !verificationCode ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : isMobile ? (
          <ZoomableDocumentWrapper>
            {documentType === 'invoice' && invoiceProps ? (
              <InvoiceTemplate ref={documentRef} {...invoiceProps} />
            ) : receiptProps ? (
              <ReceiptTemplate ref={documentRef} {...receiptProps} />
            ) : null}
          </ZoomableDocumentWrapper>
        ) : (
          <ScrollArea className="h-[70vh]">
            <div className="py-4">
              <ResponsiveDocumentWrapper>
                {documentType === 'invoice' && invoiceProps ? (
                  <InvoiceTemplate ref={documentRef} {...invoiceProps} />
                ) : receiptProps ? (
                  <ReceiptTemplate ref={documentRef} {...receiptProps} />
                ) : null}
              </ResponsiveDocumentWrapper>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
