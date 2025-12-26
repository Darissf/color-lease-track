import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentRecord {
  id: string;
  payment_date: string;
  amount: number;
  payment_number: number;
  notes: string | null;
}

interface PublicContractData {
  contract: {
    id: string;
    invoice: string | null;
    keterangan: string | null;
    jenis_scaffolding: string | null;
    lokasi_detail: string | null;
    google_maps_link: string | null;
    start_date: string;
    end_date: string;
    tanggal: string | null;
    tanggal_kirim: string | null;
    tanggal_ambil: string | null;
    jumlah_unit: number;
    tagihan: number;
    tagihan_belum_bayar: number;
    status: string;
    status_pengiriman: string | null;
    status_pengambilan: string | null;
    penanggung_jawab: string | null;
    biaya_kirim: number;
    client: {
      nama: string;
      nomor_telepon: string;
      icon: string | null;
    } | null;
    bank: {
      bank_name: string;
      account_number: string;
      account_holder_name: string | null;
    } | null;
    payments: PaymentRecord[];
  };
  link: {
    expires_at: string;
    view_count: number;
    created_at: string;
  };
}

interface UsePublicContractResult {
  data: PublicContractData | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  expiredAt: string | null;
  refetch: () => void;
}

export function usePublicContract(accessCode: string): UsePublicContractResult {
  const [data, setData] = useState<PublicContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expiredAt, setExpiredAt] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    if (!accessCode) {
      setLoading(false);
      setError('Access code tidak valid');
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke(
        'contract-public-view',
        {
          body: { access_code: accessCode }
        }
      );

      if (invokeError) {
        console.error('Error invoking function:', invokeError);
        setError('Gagal mengambil data kontrak');
        setErrorCode('INVOKE_ERROR');
        return;
      }

      if (responseData?.error) {
        setError(responseData.error);
        setErrorCode(responseData.code || 'UNKNOWN');
        if (responseData.expired_at) {
          setExpiredAt(responseData.expired_at);
        }
        return;
      }

      setData(responseData);
    } catch (err) {
      console.error('Error fetching public contract:', err);
      setError('Terjadi kesalahan saat mengambil data');
      setErrorCode('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }, [accessCode]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  return { data, loading, error, errorCode, expiredAt, refetch: fetchContract };
}
