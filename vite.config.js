import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages bu repoyu https://<kullanıcı>.github.io/YZ_CODE/ altında yayınlar;
// derleme sırasında tüm yollar bu alt dizine göre ayarlanır. Yerel geliştirmede kökte kalır.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/YZ_CODE/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Diyet Günlüğü',
        short_name: 'Diyet Günlüğü',
        description: 'Yediklerini kaydet, kalori ve makro besin değerlerini topla.',
        lang: 'tr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F5F1',
        theme_color: '#F4F5F1',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'apple touch icon' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'off-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ]
}))
