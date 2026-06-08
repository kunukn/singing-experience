/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { CodeInspectorPlugin } from 'code-inspector-plugin'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import { PrimeVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'
import VueRouter from 'vue-router/vite'
import { allSampleUrls } from './src/constants/sampleManifest'

dayjs.extend(utc)

// Plugin to inject build timestamp into HTML
function injectBuildTime(env: Record<string, string>) {
  return {
    name: 'inject-build-time',
    transformIndexHtml(html: string) {
      const buildTime = `utc_${dayjs.utc().format('YYYY-MM-DD_HHmmss')}`
      let next = html.replace(
        '<html lang="en" ',
        `<html lang="en" data-build="${buildTime}" `,
      )
      /*
       * github.io build is a duplicate deploy under /singing-experience/.
       * Prevent it from competing with syng.fun in search by injecting a
       * robots noindex tag on that build only. Vercel build keeps default.
       */
      if (env.VITE_USE_HISTORY_ROUTING === '0') {
        next = next.replace(
          '<meta charset="UTF-8" />',
          '<meta charset="UTF-8" />\n    <meta name="robots" content="noindex" />',
        )
      }
      return next
    },
  }
}

/*
 * Emit a sitemap.xml at build time targeting the syng.fun deploy.
 * Skipped on the github.io build (VITE_USE_HISTORY_ROUTING=0) since that
 * deploy is noindex'd and uses hash routing under a sub-path.
 */
function emitSitemap(env: Record<string, string>) {
  /* Routes match src/composables/useDocumentMeta.ts ROUTE_META. Test pages
   * and the [...pathMatch] 404 are intentionally excluded. */
  const ROUTES = [
    '/',
    '/pitch-detector',
    '/do-re-mi',
    '/sing-tone',
    '/tuner',
    '/tone-detector',
  ]
  const ORIGIN = 'https://www.syng.fun'

  return {
    name: 'emit-sitemap',
    apply: 'build' as const,
    closeBundle() {
      if (env.VITE_USE_HISTORY_ROUTING === '0') return

      const lastmod = dayjs.utc().format('YYYY-MM-DD')
      const urls = ROUTES.map(
        (path) =>
          `  <url>\n    <loc>${ORIGIN}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`,
      ).join('\n')
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      writeFileSync(resolve(__dirname, 'dist/sitemap.xml'), xml)
    },
  }
}

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  console.debug('*** Code Inspector: ', env.VITE_CODE_INSPECTOR)

  return {
    /*
     * Local dev, local preview, and Vercel all use base `/` with history routing.
     * The github.io deploy is the only target that needs hash routing under
     * `/singing-experience/`; the deploy workflow sets VITE_BASE_PATH and
     * VITE_USE_HISTORY_ROUTING=0 to opt in.
     */
    base: env.VITE_BASE_PATH ?? '/',
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(
        'Y' + dayjs.utc().format('YY-MM-DD_HHmm'),
      ),
      'import.meta.env.VITE_USE_HISTORY_ROUTING': JSON.stringify(
        env.VITE_USE_HISTORY_ROUTING ?? '1',
      ),
    },
    plugins: [
      // Combination keys for Mac are Option + Shift; for Windows, it's Alt + Shift
      ...(['1', 'true'].includes(env.VITE_CODE_INSPECTOR)
        ? [CodeInspectorPlugin({ bundler: 'vite' })]
        : []),

      /* Dev-only: this plugin opens an inspector server and has been observed
       * to occasionally stall `vite build` in non-TTY environments (pre-push). */
      command === 'serve' && vueDevTools(),
      injectBuildTime(env),
      emitSitemap(env),
      tailwindcss(),
      VueRouter(),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'vue-i18n',
          { '@/utils/logger': ['debugLog'] },
          { pinia: ['storeToRefs', 'defineStore'] },
        ],
        dirs: ['./src/composables/**', './src/stores/**'],
        dts: './src/auto-imports.d.ts',
        vueTemplate: true,
      }),
      Components({
        dirs: ['./src/components'],
        dts: './src/components.d.ts',
        resolvers: [
          PrimeVueResolver({ prefix: 'Prime' }),
          /* PrimeVueResolver doesn't yet know about PrimeVue 4's renamed components */
          (name: string) => {
            const v4Renames: Record<string, string> = {
              PrimeSelect: 'primevue/select',
              PrimeToggleSwitch: 'primevue/toggleswitch',
              /* PrimeVue 4's new Tabs API — the resolver still only knows the
               * deprecated TabView/TabPanel, so map these by hand. */
              PrimeTabs: 'primevue/tabs',
              PrimeTabList: 'primevue/tablist',
              PrimeTab: 'primevue/tab',
              PrimeTabPanels: 'primevue/tabpanels',
              PrimeTabPanel: 'primevue/tabpanel',
            }

            return v4Renames[name] ? { from: v4Renames[name] } : undefined
          },
        ],
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
          display: 'fullscreen',
          /*
           * Launch marker: the OS opens an installed PWA at start_url, so
           * its document URL carries ?mode=pwa. A normal website visited by
           * URL never has it. This disambiguates a launched fullscreen PWA
           * from a normal site that merely called requestFullscreen() —
           * both report `display-mode: fullscreen` (see
           * useIsInstalledPwa.ts). Relative './' respects the deployed base
           * (root on Vercel, subpath on github.io) and both routing modes.
           */
          start_url: './?mode=pwa',
          /*
           * syng.fun (Vercel, default build) ships the captioned "syng" icon
           * variant so the two installs are visually distinguishable on a
           * home screen. github.io build (VITE_USE_HISTORY_ROUTING=0) keeps
           * the original.
           */
          icons: (() => {
            const suffix =
              env.VITE_USE_HISTORY_ROUTING === '0' ? '' : '-syng'
            return [
              {
                src: `icons/pwa-192x192${suffix}.png`,
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: `icons/pwa-512x512${suffix}.png`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable',
              },
            ]
          })(),
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          additionalManifestEntries: allSampleUrls.map((url) => ({
            url,
            revision: null,
          })),
          runtimeCaching: [
            {
              urlPattern: /\.(?:mp3|wav)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-cache',
                expiration: {
                  maxEntries: 60, // enough for all current samples with headroom
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    build: {
      /* abcjs (~500 kB) is the largest chunk; it's a lazy-loaded vendor lib
       * (see GraceKellySheet.vue) so it never bloats the initial load. Raise
       * the warning ceiling above it while still catching new regressions. */
      chunkSizeWarningLimit: 600,
    },
    test: {
      environment: 'happy-dom',
    },
  }
})
