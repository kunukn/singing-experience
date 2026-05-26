<script setup lang="ts">
import { loadLocaleMessages } from '@/i18n'

const { locale } = useI18n()

/*
 * Approximate speaker counts (`total`) in millions: total = L1 + L2,
 * where L1 is native speakers and L2 is second-language speakers.
 * Used to rank languages so the most likely candidates surface first.
 */
const languages = [
  { code: 'en', label: '🇬🇧 English', total: 1500 }, // L1 ~385M, L2 ~1.1B
  { code: 'zh', label: '🇨🇳 中文', total: 1200 }, // L1 ~960M, L2 ~200M
  { code: 'es', label: '🇪🇸 Español', total: 573 }, // L1 ~483M, L2 ~90M
  { code: 'hi', label: '🇮🇳 हिन्दी', total: 593 }, // L1 ~343M, L2 ~250M
  { code: 'ar', label: '🇸🇦 العربية', total: 597 }, // L1 ~327M, L2 ~270M
  { code: 'bn', label: '🇧🇩 বাংলা', total: 275 }, // L1 ~235M, L2 ~40M
  { code: 'pt', label: '🇧🇷 Português', total: 265 }, // L1 ~235M, L2 ~30M
  { code: 'ru', label: '🇷🇺 Русский', total: 260 }, // L1 ~150M, L2 ~110M
  { code: 'ja', label: '🇯🇵 日本語', total: 128 }, // L1 ~126M, L2 ~2M
  { code: 'fr', label: '🇫🇷 Français', total: 300 }, // L1 ~80M, L2 ~220M
  { code: 'de', label: '🇩🇪 Deutsch', total: 136 }, // L1 ~76M, L2 ~60M
  { code: 'id', label: '🇮🇩 Indonesia', total: 250 }, // L1 ~43M, L2 ~200M
  { code: 'sw', label: '🇹🇿 Kiswahili', total: 120 }, // L1 ~16M, L2 ~100M
  { code: 'da', label: '🇩🇰 Dansk', total: 6.3 }, // L1 ~6M, L2 ~300K
  { code: 'kl', label: '🇬🇱 Kalaallisut', total: 0.06 }, // L1 ~50K, L2 ~10K
] as const

type Language = (typeof languages)[number]

/*
 * Order to maximize the chance the user spots their language quickly:
 *   1. Currently selected locale (so it's right at the top of the dropdown)
 *   2. Browser-preferred languages (navigator.languages), in priority order
 *   3. Everything else by speaker count, descending
 * Computed once at setup so the order doesn't reshuffle while the user is choosing.
 */
const sortedLanguages: Language[] = (() => {
  /* navigator.languages entries look like 'en-US' — strip region to match our base codes. */
  const baseCode = (tag: string) => tag.toLowerCase().split('-')[0]
  const preferred = [
    locale.value,
    ...(typeof navigator !== 'undefined'
      ? (navigator.languages ?? [])
      : []
    ).map(baseCode),
  ]
  const byCode = new Map<string, Language>(languages.map((l) => [l.code, l]))
  const ordered: Language[] = []
  const seen = new Set<string>()
  for (const code of preferred) {
    const lang = byCode.get(code)
    if (lang && !seen.has(code)) {
      ordered.push(lang)
      seen.add(code)
    }
  }
  for (const lang of [...languages].sort((a, b) => b.total - a.total)) {
    if (!seen.has(lang.code)) {
      ordered.push(lang)
      seen.add(lang.code)
    }
  }
  return ordered
})()

const selected = ref(locale.value)

watch(selected, async (next) => {
  await loadLocaleMessages(next)
  locale.value = next
  localStorage.setItem('syng.locale', next)
})
</script>

<template>
  <PrimeSelect
    v-model="selected"
    :options="sortedLanguages"
    optionLabel="label"
    optionValue="code"
    size="small"
    aria-label="Language"
    scrollHeight="370px"
  >
    <template #header></template>
    <template #optiongroup="_slotProps"></template>
    <template #option="{ option }">
      <div class="flex items-center justify-between gap-2">
        <div class="font-medium">
          <span class="block min-w-8">
            {{ option.label }}
          </span>
        </div>
      </div>
    </template>
    <template #footer="_slotProps"></template>
  </PrimeSelect>
</template>
