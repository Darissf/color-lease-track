import { PaymentRequestGenerator } from "./PaymentRequestGenerator";

interface PendingRequest {
  id: string;
  unique_amount: number;
  unique_code: string;
  amount_expected: number;
  expires_at: string;
  created_by_role: string | null;
  status: string;
}

interface BankInfo {
  bank_name: string;
  account_number: string;
  account_holder_name?: string;
}

interface PublicPaymentRequestProps {
  accessCode: string;
  remainingAmount: number;
  pendingRequest: PendingRequest | null;
  onPaymentVerified?: () => void;
  bankInfo?: BankInfo;
}

// This is now a wrapper component that uses the reusable PaymentRequestGenerator
export function PublicPaymentRequest({
  accessCode,
  remainingAmount,
  pendingRequest,
  onPaymentVerified,
  bankInfo,
}: PublicPaymentRequestProps) {
  return (
    <PaymentRequestGenerator
      accessCode={accessCode}
      remainingAmount={remainingAmount}
      pendingRequest={pendingRequest}
      onPaymentVerified={onPaymentVerified}
      bankInfo={bankInfo}
      showCard={true}
      cardTitle="Bayar Tagihan"
    />
  );
}
