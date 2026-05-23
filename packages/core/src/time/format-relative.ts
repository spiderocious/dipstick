const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

export const formatRelative = (when: Date | string | number, now: Date = new Date()): string => {
  const target = when instanceof Date ? when : new Date(when);
  const deltaMs = target.getTime() - now.getTime();
  const absMs = Math.abs(deltaMs);
  for (const { unit, ms } of UNITS) {
    if (absMs >= ms || unit === 'second') {
      return formatter.format(Math.round(deltaMs / ms), unit);
    }
  }
  return formatter.format(0, 'second');
};
