<script setup lang="ts">
const { t } = useI18n()
const betaPages = new Set(['/singfly', '/pitch-game', '/grace-kelly-challenge'])
const alphaPages = new Set(['/tone-detector'])
const route = useRoute()
const isHome = computed(() => route.path === '/')
const isAlphaPage = computed(() => alphaPages.has(route.path))
const isBetaPage = computed(() => betaPages.has(route.path))
const isLandingPage = computed(() => route.path === '/')
</script>

<template>
  <div class="flex items-center justify-between px-4 py-1.5 md:py-3 lg:py-4">
    <div v-if="isHome"></div>

    <RouterLink
      v-if="!isHome"
      to="/"
      class="flex items-center gap-1 text-(--p-text-muted-color) transition-colors hover:text-(--p-text-color)"
    >
      <BackIcon class="h-4 w-auto rtl:-scale-x-100" />
      <span class="text-sm">{{ t('generic.back') }}</span>
    </RouterLink>
    <div v-else />
    <PrimeTag
      v-if="isAlphaPage"
      severity="warn"
      class="ms-3 me-auto"
      value="Alpha"
    />
    <PrimeTag
      v-if="isBetaPage"
      severity="warn"
      class="ms-3 me-auto"
      value="Beta"
    />
    <div class="flex items-center gap-2">
      <LanguageSwitcher v-if="isLandingPage" />
      <SettingsPanel />
    </div>
  </div>
</template>
