<script setup lang="ts">
import { games, programs, tools } from '@/constants/programs'

const { t } = useI18n()
const { state: micPermission } = useMicrophonePermission()
const { warmUp: warmUpAudio } = useTonePlayer()

function prewarmAudio() {
  warmUpAudio().catch(() => {})
}

const musicNoteColorClass = computed(() => {
  if (micPermission.value === 'granted') return 'text-(--p-green-400)'
  if (micPermission.value === 'denied') return 'text-(--p-red-400)'

  return ''
})
</script>

<template>
  <div class="flex grow flex-col items-center pt-1">
    <div class="flex flex-wrap items-center gap-2">
      <MusicNoteIcon
        :class="['h-9 w-auto', musicNoteColorClass]"
      ></MusicNoteIcon>
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
              <span class="text-4xl">{{ program.icon }}</span>
              <div>
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
                    <span aria-hidden="true">{{ item.icon }}</span>
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
