<script setup lang="ts">
import type { ProgramIconHue } from '@/components/icons/program/programIconHue'
import { games, programs, tools } from '@/constants/programs'

const { t } = useI18n()
const { state: micPermission } = useMicrophonePermission()
const { warmUp: warmUpAudio } = useTonePlayer()

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

    <div class="grid w-full max-w-lg gap-4" @click="prewarmAudio">
      <CardLink
        v-for="program in programs"
        :key="program.route"
        :to="program.route"
      >
        <PrimeCard>
          <template #content>
            <div class="flex items-start gap-3 sm:gap-4">
              <div class="flex w-12 shrink-0 justify-center">
                <component :is="program.icon" class="size-10" />
              </div>
              <div class="min-w-0 grow">
                <h2 class="mb-1 text-xl font-semibold">
                  {{ t(`home.programs.${program.key}.name`) }}
                </h2>
                <p class="mb-4 text-sm text-(--p-text-muted-color)">
                  {{ t(`home.programs.${program.key}.description`) }}
                </p>

                <ul
                  v-if="
                    program.key === 'singingTools' ||
                    program.key === 'singingGames'
                  "
                  class="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2"
                >
                  <li
                    v-for="item in program.key === 'singingTools'
                      ? tools
                      : games"
                    :key="item.key"
                    class="flex items-center gap-2 text-sm text-(--p-text-muted-color)"
                  >
                    <component :is="item.icon" class="size-5 shrink-0" />
                    <span>{{ t(`home.programs.${item.key}.name`) }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </PrimeCard>
      </CardLink>
    </div>

    <LandingFooter />
  </div>
</template>

<style scoped lang="css">
.product-title {
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
}
</style>
