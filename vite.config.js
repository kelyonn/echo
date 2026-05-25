import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ protocolImports: true }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Cache the app shell + static assets
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Cache images (base64 previews are inline — this covers OSM tile images)
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Tenor GIFs previews
            urlPattern: /^https:\/\/.*\.tenor\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tenor-gifs',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      manifest: {
        name: 'Echo',
        short_name: 'Echo',
        description: 'Real-time encrypted mesh chat',
        theme_color: '#1e4aaa',
        background_color: '#eef3fb',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: 'General Chat',
            url: '/',
            description: 'Open the general chat room',
          },
        ],
        categories: ['communication', 'utilities'],
      },
    }),
  ],

  server: {
    watch: { usePolling: true },
  },
});
