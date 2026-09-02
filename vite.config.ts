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
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/lib/warbands/fiches/officielles')) {
            return 'warbands-official';
          }
          if (id.includes('/lib/warbands/fiches/grade1b')) {
            return 'warbands-grade1b';
          }
          if (id.includes('/lib/warbands/fiches/catalogue-lot')) {
            return 'warbands-extended';
          }
          if (id.includes('/lib/warbands/catalogue.json')) {
            return 'warband-catalogue';
          }
          if (id.includes('/lib/warbands/')) return 'warband-library';
          if (!id.includes('node_modules')) return;
          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('/lucide-react/')) return 'icons';
          if (
            id.includes('/@base-ui/') ||
            id.includes('/cmdk/') ||
            id.includes('/class-variance-authority/') ||
            id.includes('/tailwind-merge/')
          ) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    {
      name: 'service-worker-hors-ligne-trackheim',
      apply: 'build',
      generateBundle(_options, bundle) {
        const fichiers = ['./', ...Object.keys(bundle)].filter(
          (fichier) => fichier !== 'sw.js',
        );
        const version = `trackheim-${Date.now()}`;
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const CACHE=${JSON.stringify(version)};
const PRECACHE=${JSON.stringify(fichiers)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE.map(path=>new URL(path,self.registration.scope).href))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('trackheim-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>request.mode==='navigate'?caches.match(new URL('./',self.registration.scope).href):Response.error())));});`,
        });
      },
    },
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
