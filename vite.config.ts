import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// En GitHub Pages la app vive en una subcarpeta (/nombre-del-repo/). El workflow la pasa en BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // La app avisa cuando hay versión nueva y se actualiza cuando la persona toca "Actualizar".
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      devOptions: { enabled: true },
      manifest: {
        name: 'Quesito — hábitos, rutina y diario',
        short_name: 'Quesito',
        description: 'Organización personal: rutina, hábitos con rachas y diario.',
        lang: 'es-AR',
        id: base,
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f4f6f3',
        theme_color: '#3f7d5c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
