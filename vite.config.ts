import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `npm run build:demo` genera una versión de prueba sin base de datos (datos guardados en el navegador)
export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? './' : '/',
  // La demo se empaqueta en un solo archivo de código para poder publicarla en cualquier lado
  build: mode === 'demo' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  plugins: [
    react(),
    VitePWA({
      disable: mode === 'demo',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'demo/*.webp'],
      manifest: {
        name: 'Trivela · Franelas de fútbol',
        short_name: 'Trivela',
        description: 'Franelas de fútbol bordadas. Mira el stock por talla y pide por WhatsApp.',
        lang: 'es',
        theme_color: '#0E0E0E',
        background_color: '#0E0E0E',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/admin/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
            handler: 'CacheFirst',
            options: { cacheName: 'fotos', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ]
}))
