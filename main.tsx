import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MordheimApp } from '@/app/mordheim-app';
import '@/app/globals.css';

const racine = document.getElementById('root');

if (!racine) {
  throw new Error('La racine de l’application est introuvable.');
}

createRoot(racine).render(
  <StrictMode>
    <MordheimApp />
  </StrictMode>,
);
