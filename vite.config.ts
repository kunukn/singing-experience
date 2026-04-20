/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueRouter from 'vue-router/vite'

function formatUtcDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getUTCFullYear()
  const mo = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  const h = pad(date.getUTCHours())
  const mi = pad(date.getUTCMinutes())
  const s = pad(date.getUTCSeconds())
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`
}

// Plugin to inject build timestamp into HTML
function injectBuildTime() {
  return {
    name: 'inject-build-time',
    transformIndexHtml(html: string) {
      const buildTime = formatUtcDateTime(new Date())
      return html.replace(
        '<html lang="en" ',
        `<html lang="en" data-build-utc-time="${buildTime}" `,
      )
    },
  }
}

export default defineConfig({
  base: '/singing-experience/',
  plugins: [
    vueDevTools(),
    injectBuildTime(),
    tailwindcss(),
    VueRouter(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'vue-i18n',
        { '@/utils/logger': ['debugLog'] },
      ],
      dirs: ['./src/composables/**', './src/stores/**'],
      dts: './src/auto-imports.d.ts',
      vueTemplate: true,
    }),
    Components({
      dirs: ['./src/components'],
      dts: './src/components.d.ts',
    }),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Singing Experience',
        short_name: 'Singing',
        description:
          'Real-time vocal pitch detector and DO RE MI singing game. Practice singing, train your ear, detect notes — free, private, works offline.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wav,woff,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
