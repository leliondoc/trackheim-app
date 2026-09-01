import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MordheimApp } from '@/app/mordheim-app';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import '@/app/globals.css';

const racine = document.getElementById('root');

if (!racine) {
  throw new Error('La racine de l’application est introuvable.');
}

createRoot(racine).render(
  <StrictMode>
    <AppErrorBoundary>
      <MordheimApp />
    </AppErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });
}
