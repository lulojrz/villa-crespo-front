import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function getApiUrl(value) {
  const url = value?.match(/https?:\/\/[^\s)\]]+/)?.[0]

  if (!url) {
    throw new Error('VITE_API_URL debe contener la URL del backend (por ejemplo, https://example.com).')
  }

  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error()
    }
    return parsedUrl.origin
  } catch {
    throw new Error('VITE_API_URL no contiene una URL válida del backend.')
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const apiUrl = getApiUrl(env.VITE_API_URL)

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'Villa Crespo Predicación',
          short_name: 'Villa Crespo',
          description: 'Gestión y organización de la predicación - Congregación Villa Crespo',
          theme_color: '#9a4f36',
          background_color: '#faf7f2',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      // Define global como window para librerías que dependen de Node.js
      global: 'window',
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    }
  }
})
