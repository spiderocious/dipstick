import { fileURLToPath } from 'node:url';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@app', replacement: path.resolve(__dirname, 'src') },
      { find: '@features', replacement: path.resolve(__dirname, 'src/features') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/shared') },
      // Specific alias first so '@dipstick/ui/styles.css' wins before the bare '@dipstick/ui' rule.
      {
        find: '@dipstick/ui/styles.css',
        replacement: path.resolve(__dirname, '../../packages/ui/src/styles.css'),
      },
      {
        find: /^@dipstick\/ui$/,
        replacement: path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      },
      {
        find: /^@dipstick\/core$/,
        replacement: path.resolve(__dirname, '../../packages/core/src/index.ts'),
      },
      {
        find: /^@dipstick\/api$/,
        replacement: path.resolve(__dirname, '../../packages/api/src/index.ts'),
      },
      {
        find: /^@icons$/,
        replacement: path.resolve(__dirname, '../../packages/ui/src/icons/index.ts'),
      },
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
