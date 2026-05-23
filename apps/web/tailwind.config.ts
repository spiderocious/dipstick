import type { Config } from 'tailwindcss';

// Dipstick palette — warm cream + warm ink, single deep-emerald accent. See mvp.md.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: { DEFAULT: '#0E5C3A', hover: '#0A4A2E' },
        paper: '#F2EDE2',
        sheet: '#FBF7EC',
        recessed: '#ECE5D4',
        ink: { DEFAULT: '#1A1714', secondary: '#3D3833', tertiary: '#6E665B' },
        hairline: '#D6CDB8',
        oxblood: '#9A1F18',
        amber: { DEFAULT: '#8E5A0E' },
        infoblue: '#1F4D7A',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
