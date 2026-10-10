<script setup lang="ts">
import { programStageByRoute } from '@/constants/programs'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.path === '/')
const stage = computed(() => programStageByRoute.get(route.path))
const isLandingPage = computed(() => route.meta.isLandingPage === true)

function goBack() {
  /* Follow real browser history when we have a previous in-app entry; otherwise fall back to home (covers deep links). */
  if (window.history.state?.back) router.back()
  else router.push('/')
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-1.5 md:py-3 lg:py-4">
    <div v-if="isHome"></div>

    <button
      v-if="!isHome"
      type="button"
      class="flex items-center gap-1 text-(--p-text-muted-color) transition-colors hover:text-(--p-text-color)"
      @click="goBack"
    >
      <BackIcon class="h-4 w-auto rtl:-scale-x-100" />
      <span class="text-sm">{{ t('generic.back') }}</span>
    </button>
    <div v-else />
    <ProgramStageTag v-if="stage" :stage class="ms-3 me-auto" />
    <div class="flex items-center gap-2">
      <LanguageSwitcher v-if="isLandingPage" />
      <SettingsPanel />
    </div>
  </div>
</template>
