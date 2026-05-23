// Dipstick palette — see mvp.md.
//   Warm cream + warm ink, with a single deep-emerald accent.
//   The product reads like a ledger column, not a dashboard.
export const DIPSTICK_COLORS = {
  // The single brand accent — posted, balanced, confirmed.
  emerald: {
    DEFAULT: '#0E5C3A',
    hover: '#0A4A2E',
  },
  // Paper & surfaces — never pure white.
  paper: '#F2EDE2', // background (the canvas)
  sheet: '#FBF7EC', // a card on the canvas
  recessed: '#ECE5D4', // behind a card
  // Ink — never pure black.
  ink: {
    primary: '#1A1714',
    secondary: '#3D3833',
    tertiary: '#6E665B', // labels
  },
  hairline: '#D6CDB8',
  // State — used sparingly, never decoration.
  oxblood: '#9A1F18', // shortage / void (reserved)
  amber: '#8E5A0E', // watch / over / out-of-spec
  info: '#1F4D7A', // system / info note
  // Product marks — tiny inline marks only, never fills.
  product: {
    PMS: '#0E5C3A',
    AGO: '#8E5A0E',
    DPK: '#6B4E8E',
  },
} as const;

export type DipstickColorKey = keyof typeof DIPSTICK_COLORS;

// Three families, each with a job.
//   Display / headings / names of people & places: Source Serif 4 (500–600)
//   Body / chrome / labels / buttons: Inter (400–600)
//   Every figure (litres, naira, meters, dips) and every record id: IBM Plex Mono,
//   font-variant-numeric: tabular-nums always on.
export const FONTS = {
  display: '"Source Serif 4", Georgia, serif',
  body: '"Inter", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;
