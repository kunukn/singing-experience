<script setup lang="ts">
const { locale } = useI18n()

const languages = [
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'zh', label: '🇨🇳 ZH' },
  { code: 'hi', label: '🇮🇳 HI' },
  { code: 'es', label: '🇪🇸 ES' },
  { code: 'ar', label: '🇸🇦 AR' },
  { code: 'da', label: '🇩🇰 DA' },
] as const

const selected = ref(locale.value)

watch(selected, (next) => {
  locale.value = next
  localStorage.setItem('locale', next)
})
</script>

<template>
  <Select v-model="selected" aria-label="Language">
    <option v-for="lang in languages" :key="lang.code" :value="lang.code">
      {{ lang.label }}
    </option>
  </Select>
</template>
