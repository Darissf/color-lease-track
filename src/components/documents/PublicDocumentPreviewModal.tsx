import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceTemplate } from './InvoiceTemplate';
import { ReceiptTemplate } from './ReceiptTemplate';
import { DocumentPDFGenerator } from './DocumentPDFGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentSettings {
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  owner_name: string | null;
  signature_image_url: string | null;
  logo_url: string | null;
  site_name: string | null;
}

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
  documentSettings: DocumentSettings | null;
  paymentId?: string;
}

export function PublicDocumentPreviewModal({
  open,
  onOpenChange,
  accessCode,
  documentType,
  contractData,
  clientData,
  documentSettings,
  paymentId,
}: PublicDocumentPreviewModalProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      generateDocument();
    } else {
      setVerificationCode(null);
      setPaymentData(null);
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
      if (data.payment) {
        setPaymentData(data.payment);
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

  const renderDocument = () => {
    if (isLoading || !verificationCode) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const issuedAt = contractData.tanggal ? new Date(contractData.tanggal) : new Date();

    const commonProps = {
      documentNumber: contractData.invoice || `INV-${contractData.id.substring(0, 8)}`,
      verificationCode,
      issuedAt,
      clientName: clientData?.nama || 'Klien',
      companyName: documentSettings?.company_name || documentSettings?.site_name || 'Perusahaan',
      companyAddress: documentSettings?.company_address || undefined,
      companyPhone: documentSettings?.company_phone || undefined,
      ownerName: documentSettings?.owner_name || undefined,
      logoUrl: documentSettings?.logo_url || undefined,
      signatureUrl: documentSettings?.signature_image_url || undefined,
    };

    if (documentType === 'invoice') {
      const period = `${contractData.start_date} - ${contractData.end_date}`;
      return (
        <InvoiceTemplate
          ref={documentRef}
          {...commonProps}
          description={contractData.keterangan || 'Sewa Scaffolding'}
          amount={contractData.tagihan}
          contractInvoice={contractData.invoice || undefined}
          period={period}
        />
      );
    }

    // Kwitansi
    const amount = paymentData?.amount || (contractData.tagihan - contractData.tagihan_belum_bayar);
    const paymentDate = paymentData?.payment_date ? new Date(paymentData.payment_date) : undefined;
    
    return (
      <ReceiptTemplate
        ref={documentRef}
        {...commonProps}
        documentNumber={`KWT-${contractData.invoice || contractData.id.substring(0, 8)}`}
        description={`Pembayaran sewa scaffolding - ${contractData.keterangan || 'Invoice ' + contractData.invoice}`}
        amount={amount}
        invoiceNumber={contractData.invoice || undefined}
        paymentDate={paymentDate}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {documentType === 'invoice' ? 'Preview Invoice' : 'Preview Kwitansi'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Preview */}
          <div className="border rounded-lg p-4 bg-white overflow-x-auto">
            {renderDocument()}
          </div>

          {/* PDF Generator Buttons */}
          {!isLoading && verificationCode && (
            <DocumentPDFGenerator
              documentRef={documentRef}
              fileName={getFileName()}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
