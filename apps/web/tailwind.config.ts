import type { Config } from 'tailwindcss';

// Dipstick palette — warm cream + warm ink, single deep-emerald accent. See mvp.md.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Every token reads a CSS custom property defined in packages/ui/src/styles.css,
      // so styles.css stays the single source of truth (and survives a future dark mode).
      colors: {
        emerald: { DEFAULT: 'var(--emerald)', hover: 'var(--emerald-hover)' },
        paper: 'var(--paper)',
        sheet: { DEFAULT: 'var(--sheet)', edge: 'var(--sheet-edge)' },
        recessed: 'var(--recessed)',
        ink: { DEFAULT: 'var(--ink)', secondary: 'var(--ink-2)', tertiary: 'var(--ink-3)' },
        hair: { DEFAULT: 'var(--hair)', soft: 'var(--hair-soft)' },
        oxblood: { DEFAULT: 'var(--oxblood)', bg: 'var(--oxblood-bg)' },
        amber: { DEFAULT: 'var(--amber)', bg: 'var(--amber-bg)' },
        infoblue: { DEFAULT: 'var(--info)', bg: 'var(--info-bg)' },
        // Product marks — tiny inline marks only, never fills.
        pms: 'var(--pms)',
        ago: 'var(--ago)',
        dpk: 'var(--dpk)',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: 'var(--r-card)',
      },
    },
  },
  plugins: [],
} satisfies Config;
