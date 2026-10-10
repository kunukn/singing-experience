import { useHead } from '@unhead/vue'

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  ROUTE_META,
} from '@/constants/routeMeta'

const SITE_ORIGIN = 'https://www.syng.fun'

/*
 * Call once at the app root. Watches the active route and updates
 * document.title, meta description, OpenGraph/Twitter tags, and the
 * canonical link on every navigation. Reactive refs ensure @unhead
 * patches the existing tags instead of recreating them.
 */
export function useDocumentMeta() {
  const route = useRoute()

  const meta = computed(
    () =>
      ROUTE_META[route.path] ?? {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
      },
  )

  const canonical = computed(() => `${SITE_ORIGIN}${route.path}`)

  useHead({
    title: () => meta.value.title,
    link: [
      {
        rel: 'canonical',
        href: () => canonical.value,
      },
    ],
    meta: [
      {
        name: 'description',
        content: () => meta.value.description,
      },
      {
        property: 'og:title',
        content: () => meta.value.title,
      },
      {
        property: 'og:description',
        content: () => meta.value.description,
      },
      {
        property: 'og:url',
        content: () => canonical.value,
      },
      {
        name: 'twitter:title',
        content: () => meta.value.title,
      },
      {
        name: 'twitter:description',
        content: () => meta.value.description,
      },
    ],
  })
}
