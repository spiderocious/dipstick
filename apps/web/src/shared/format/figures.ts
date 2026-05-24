// Figure formatters shared across screens. Litres render with thousands separators and a
// trailing unit handled by the component (AppFigure unit). Naira comes from core's formatNaira.

export function formatLitres(litres: number): string {
  return litres.toLocaleString('en-NG', { maximumFractionDigits: 1 });
}

export function formatMeter(meter: number): string {
  return meter.toLocaleString('en-NG', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Today's business date as YYYY-MM-DD (the day key the API expects).
export function todayBusinessDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Monday of the week containing `date` (YYYY-MM-DD), as the roster week_start.
export function weekStartOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
