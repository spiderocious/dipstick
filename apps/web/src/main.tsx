import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { configureApiClient } from '@dipstick/api';

import { App } from './app.tsx';

// Design-system tokens (the :root CSS custom properties the Tailwind config maps to —
// --paper, --ink, --emerald, …). Must load before the app's own stylesheet so every
// `theme('colors.*')` / `bg-paper` / `text-ink` class resolves to a real value rather than
// an undefined var (which the browser silently drops → default white/black/blue).
import '@dipstick/ui/styles.css';
import './styles.css';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8091';
configureApiClient(baseUrl);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
