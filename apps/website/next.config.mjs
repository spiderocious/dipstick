import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile workspace packages — Next 15 transpiles ESM by default, but our
  // tsconfig path aliases point at TS source so we tell Next to compile them.
  transpilePackages: ['@solon/ui', '@solon/core'],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@solon/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@solon/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@icons': path.resolve(__dirname, '../../packages/ui/src/icons/index.ts'),
    };
    // NodeNext/ESM convention across the workspace: source code spells out
    // `.js` in import specifiers even when the file on disk is `.ts`/`.tsx`.
    // Webpack does not unify these by default, so we explicitly tell it which
    // source extensions to try when a `.js`/`.mjs`/`.cjs` import is requested.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;
