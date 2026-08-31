import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const depot = process.env.GITHUB_REPOSITORY?.split('/')[1];
const siteUtilisateur = depot?.endsWith('.github.io') ?? false;
const base =
  process.env.GITHUB_ACTIONS === 'true' && depot && !siteUtilisateur
    ? `/${depot}/`
    : '/';

export default defineConfig({
  base,
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    {
      name: 'politique-securite-trackheim',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content:
                "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-src 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
});
