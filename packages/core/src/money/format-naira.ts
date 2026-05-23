export interface FormatNairaOptions {
  withSymbol?: boolean;
  decimals?: number;
}

// Amounts are stored in kobo (1 NGN = 100 kobo) end-to-end.
export const formatNaira = (kobo: number | bigint, options: FormatNairaOptions = {}): string => {
  const { withSymbol = true, decimals = 2 } = options;
  const naira = typeof kobo === 'bigint' ? Number(kobo) / 100 : kobo / 100;
  const formatted = naira.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withSymbol ? `₦${formatted}` : formatted;
};

export const parseNairaToKobo = (input: string): number => {
  const cleaned = input.replace(/[^\d.-]/g, '');
  const naira = Number.parseFloat(cleaned);
  if (!Number.isFinite(naira)) return 0;
  return Math.round(naira * 100);
};
