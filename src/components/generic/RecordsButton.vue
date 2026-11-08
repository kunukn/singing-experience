<script setup lang="ts">
/* Opens the best-scores board. A real link (router-link), so it can be
 * opened in a new tab; styled to sit beside the help button. */
const { t } = useI18n()
</script>

<template>
  <PrimeButton
    as="router-link"
    to="/records"
    :aria-label="t('records.title')"
    :title="t('records.title')"
    text
    rounded
    severity="secondary"
    class="aspect-square max-h-10 md:aspect-auto"
    data-testid="records-button"
  >
    <span class="inline-flex items-center gap-2">
      <i class="pi pi-trophy [--p-icon-size:1.25rem]" aria-hidden="true" />
      <span class="hidden text-sm md:inline">{{ t('records.title') }}</span>
    </span>
  </PrimeButton>
</template>
