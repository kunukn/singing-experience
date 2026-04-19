<script setup lang="ts">
const { locale } = useI18n()

const languages = [
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'da', label: '🇩🇰 DA' },
  { code: 'zh', label: '🇨🇳 ZH' },
  { code: 'es', label: '🇪🇸 ES' },
  { code: 'hi', label: '🇮🇳 HI' },
  { code: 'ar', label: '🇸🇦 AR' },
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
