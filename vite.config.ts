import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon-180x180.png',
        ],
        manifest: {
          name: 'TEMPAH — Sistem Tempahan Bilik Khas & Peralatan ICT',
          short_name: 'TEMPAH',
          description: 'Sistem tempahan bilik khas dan peralatan ICT untuk SK Bandar Tawau',
          theme_color: '#2563eb',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'ms-MY',
          dir: 'ltr',
          categories: ['productivity', 'education'],
          icons: [
            { src: 'pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
            { src: 'pwa-192x192.png',          sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png',          sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Cache the app shell + chunked JS/CSS aggressively
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          // Exempt the QR popup / printable popups (they open via document.write
          // and shouldn't be cached as routes)
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          // Runtime cache for Supabase reads — fail fast (NetworkFirst with
          // short timeout) so we still feel offline-friendly on flaky networks.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin.includes('supabase.co') && url.pathname.includes('/rest/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 5 }, // 5 min
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Avatars + room/equipment images
              urlPattern: ({ url }) => url.origin.includes('supabase.co') && url.pathname.includes('/storage/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-images',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false, // SW only in production builds — easier dev iteration
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
