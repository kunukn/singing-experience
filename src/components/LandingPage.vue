<script setup lang="ts">
import type { ProgramIconHue } from '@/components/icons/program/programIconHue'
import { games, programs, tools, type Program } from '@/constants/programs'

const programsByGroup: Record<string, Program[]> = {
  singingTools: tools,
  singingGames: games,
}

const { t } = useI18n()
const { state: micPermission } = useMicrophonePermission()
const { warmUp: warmUpAudio } = useTonePlayer()
/* New singers see the first steps above the catalogue; once they have a range, the catalogue leads */
const { hasFoundVoiceRange } = useMyVoiceRange()

function prewarmAudio() {
  warmUpAudio().catch(() => {})
}

const logoHue = computed<ProgramIconHue>(() => {
  if (micPermission.value === 'granted') return 'green'
  if (micPermission.value === 'denied') return 'red'

  return 'surface'
})
</script>

<template>
  <div class="flex grow flex-col items-center pt-1">
    <div class="flex flex-wrap items-center gap-2">
      <MusicNoteIcon :hue="logoHue" class="size-9" />
      <h2 class="product-title mb-2 font-bold">{{ t('home.title') }}</h2>
    </div>

    <p class="mb-4 text-(--p-text-muted-color)">
      {{ t('home.subtitle') }}
    </p>

    <div
      class="flex w-full max-w-lg flex-col gap-6 md:max-w-3xl"
      @click="prewarmAudio"
    >
      <LandingStartHere v-if="!hasFoundVoiceRange" />

      <div class="grid gap-4 md:grid-cols-2">
        <LandingHeroCard
          v-for="group in programs"
          :key="group.route"
          :group
          :programs="programsByGroup[group.key] ?? []"
        />
      </div>

      <LandingStartHere v-if="hasFoundVoiceRange" />
    </div>

    <LandingFooter />
  </div>
</template>

<style scoped lang="css">
.product-title {
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
}
</style>
