<script setup lang="ts">
const { t, locale } = useI18n()

function toggleLocale() {
  const next = locale.value === 'en' ? 'da' : 'en'
  locale.value = next
  localStorage.setItem('locale', next)
}
</script>

<template>
  <button
    class="rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
    :aria-label="
      locale === 'en'
        ? t('generic.switchToDanish')
        : t('generic.switchToEnglish')
    "
    @click="toggleLocale"
  >
    {{ locale === 'en' ? '🇩🇰 DA' : '🇬🇧 EN' }}
  </button>
</template>
