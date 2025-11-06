export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const parseRupiah = (rupiahString: string): number => {
  return parseInt(rupiahString.replace(/[^0-9]/g, '')) || 0;
};
