<script setup lang="ts">
import { loadLocaleMessages } from '@/i18n'

const { locale } = useI18n()

const languages = [
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'zh', label: '🇨🇳 ZH' },
  { code: 'hi', label: '🇮🇳 HI' },
  { code: 'es', label: '🇪🇸 ES' },
  { code: 'ar', label: '🇸🇦 AR' },
  { code: 'fr', label: '🇫🇷 FR' },
  { code: 'bn', label: '🇧🇩 BN' },
  { code: 'pt', label: '🇧🇷 PT' },
  { code: 'ru', label: '🇷🇺 RU' },
  { code: 'da', label: '🇩🇰 DA' },
] as const

const selected = ref(locale.value)

watch(selected, async (next) => {
  await loadLocaleMessages(next)
  locale.value = next
  localStorage.setItem('singing.locale', next)
})
</script>

<template>
  <Select v-model="selected" aria-label="Language">
    <option v-for="lang in languages" :key="lang.code" :value="lang.code">
      {{ lang.label }}
    </option>
  </Select>
</template>
