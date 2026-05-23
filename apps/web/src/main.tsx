import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { configureApiClient } from '@dipstick/api';

import { App } from './app.tsx';
import './styles.css';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';
configureApiClient(baseUrl);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
