<script setup lang="ts">
import { programByRoute, programStageByRoute } from '@/constants/programs'
import { isHighScoreGame } from '@/stores/useHighScoreStore'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.path === '/')
const stage = computed(() => programStageByRoute.get(route.path))
const program = computed(() => programByRoute.get(route.path))
const isLandingPage = computed(() => route.meta.isLandingPage === true)
const isRecordsPage = computed(() => route.path === '/records')
/* Also on the games that keep a best score, so the board is one tap from an end screen. */
const shouldShowRecords = computed(
  () =>
    isLandingPage.value ||
    route.path === '/games' ||
    (program.value !== undefined && isHighScoreGame(program.value.key)),
)

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
    <div v-if="program || stage" class="ms-3 me-auto flex items-center gap-2">
      <component :is="program.icon" v-if="program" class="size-6 shrink-0" />
      <ProgramStageTag v-if="stage" :stage />
    </div>
    <!-- No gap on phones: three icon buttons plus a long Back label and a
         stage tag overflow 320px otherwise. The 40px buttons still keep the
         icons apart. -->
    <div class="flex items-center gap-2 max-xs:gap-0">
      <LanguageSwitcher v-if="isLandingPage" class="me-2" />
      <RecordsButton v-if="shouldShowRecords" />
      <ProgramHelpButton v-if="program" :programKey="program.key" />
      <ProgramHelpButton v-else-if="isLandingPage" programKey="home" />
      <ProgramHelpButton v-else-if="isRecordsPage" programKey="records" />
      <SettingsPanel />
    </div>
  </div>
</template>
