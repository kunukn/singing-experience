<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ to: RouteLocationRaw }>()
</script>

<template>
  <RouterLink :to="to" class="card-link block cursor-pointer no-underline">
    <slot />
  </RouterLink>
</template>

<style scoped lang="css">
.card-link {
  /* Suppress the default grey iOS tap flash so only the green :active indicator shows */
  -webkit-tap-highlight-color: transparent;
}

.card-link :deep(.p-card) {
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  box-shadow: var(--p-card-shadow, 0 1px 3px rgb(0 0 0 / 0.3));
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.1s ease;
}

@media (hover: hover) {
  .card-link:hover :deep(.p-card) {
    border-color: var(--p-green-500, #22c55e);
    box-shadow: 0 0 0 1px var(--p-green-500, #22c55e);
  }
}

/* Touch feedback: :active fires on tap (iOS Safari triggers it on <a>), so it covers no-hover devices */
.card-link:active :deep(.p-card) {
  border-color: var(--p-green-500, #22c55e);
  box-shadow: 0 0 0 1px var(--p-green-500, #22c55e);
  transform: scale(0.98);
}
</style>
