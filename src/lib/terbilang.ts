/**
 * Converts a number to Indonesian text representation
 * e.g., 1400000 -> "Satu Juta Empat Ratus Ribu Rupiah"
 */

const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

function terbilangHelper(n: number): string {
  n = Math.floor(n);
  
  if (n < 12) {
    return satuan[n];
  } else if (n < 20) {
    return satuan[n - 10] + ' Belas';
  } else if (n < 100) {
    const satu = Math.floor(n / 10);
    const sisa = n % 10;
    return satuan[satu] + ' Puluh' + (sisa > 0 ? ' ' + satuan[sisa] : '');
  } else if (n < 200) {
    return 'Seratus' + (n > 100 ? ' ' + terbilangHelper(n - 100) : '');
  } else if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return satuan[ratus] + ' Ratus' + (sisa > 0 ? ' ' + terbilangHelper(sisa) : '');
  } else if (n < 2000) {
    return 'Seribu' + (n > 1000 ? ' ' + terbilangHelper(n - 1000) : '');
  } else if (n < 1000000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    return terbilangHelper(ribu) + ' Ribu' + (sisa > 0 ? ' ' + terbilangHelper(sisa) : '');
  } else if (n < 1000000000) {
    const juta = Math.floor(n / 1000000);
    const sisa = n % 1000000;
    return terbilangHelper(juta) + ' Juta' + (sisa > 0 ? ' ' + terbilangHelper(sisa) : '');
  } else if (n < 1000000000000) {
    const miliar = Math.floor(n / 1000000000);
    const sisa = n % 1000000000;
    return terbilangHelper(miliar) + ' Miliar' + (sisa > 0 ? ' ' + terbilangHelper(sisa) : '');
  } else if (n < 1000000000000000) {
    const triliun = Math.floor(n / 1000000000000);
    const sisa = n % 1000000000000;
    return terbilangHelper(triliun) + ' Triliun' + (sisa > 0 ? ' ' + terbilangHelper(sisa) : '');
  }
  
  return '';
}

/**
 * Converts a number to Indonesian text with "Rupiah" suffix
 * @param amount - The amount to convert
 * @returns The text representation in Indonesian
 */
export function terbilang(amount: number): string {
  if (amount === 0) {
    return 'Nol Rupiah';
  }
  
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  
  const text = terbilangHelper(absoluteAmount);
  
  return (isNegative ? 'Minus ' : '') + text.trim() + ' Rupiah';
}

/**
 * Converts a number to Indonesian text without "Rupiah" suffix
 * @param amount - The amount to convert
 * @returns The text representation in Indonesian
 */
export function terbilangTanpaRupiah(amount: number): string {
  if (amount === 0) {
    return 'Nol';
  }
  
  const isNegative = amount < 0;
  const absoluteAmount = Math.abs(amount);
  
  const text = terbilangHelper(absoluteAmount);
  
  return (isNegative ? 'Minus ' : '') + text.trim();
}
