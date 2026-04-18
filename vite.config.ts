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

export default defineConfig({
  base: '/singing-experience/',
  plugins: [
    vueDevTools(),
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
        description: 'A singing practice experience',
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
