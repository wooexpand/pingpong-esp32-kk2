import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'apple-touch-icon.png'],
    manifest: {
      name: 'KK2 LED', short_name: 'KK2 LED',
      description: 'Web UI that sets the brightness of two LEDs on ESP32-S3',
      start_url: '/', scope: '/', display: 'standalone',
      background_color: '#0e1829', theme_color: '#0e1829',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: { navigateFallback: '/index.html', runtimeCaching: [{
      urlPattern: /\/api\//,
      handler: 'NetworkOnly'
    }] }
  })],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://192.168.4.1', changeOrigin: true },
      '/ws': { target: 'ws://192.168.4.1:81', ws: true, changeOrigin: true },
    },
  },
  build: { assetsInlineLimit: 0, outDir: 'dist' }
});
