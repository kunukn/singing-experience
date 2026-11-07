<script setup lang="ts">
import { startHerePrograms } from '@/constants/programs'
import { midiToNoteLabel } from '@/utils/noteUtils'

const { t } = useI18n()
const { myVoiceRange, hasFoundVoiceRange } = useMyVoiceRange()

const myRangeLabel = computed(() => {
  if (!hasFoundVoiceRange.value) return null

  const { midiMin, midiMax } = myVoiceRange.value

  return `${midiToNoteLabel(midiMin).label}–${midiToNoteLabel(midiMax).label}`
})
</script>

<template>
  <section class="w-full" aria-labelledby="start-here-title">
    <h2
      id="start-here-title"
      class="mb-3 text-lg font-semibold text-(--p-text-muted-color)"
    >
      {{ t('home.startHere.title') }}
    </h2>
    <ol class="grid gap-3 sm:grid-cols-3">
      <li v-for="program in startHerePrograms" :key="program.route">
        <CardLink :to="program.route" class="h-full">
          <PrimeCard class="start-here-card h-full">
            <template #content>
              <div
                class="flex items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"
              >
                <component :is="program.icon" class="size-12 shrink-0" />
                <div class="min-w-0">
                  <div class="text-base font-semibold">
                    {{ t(`home.programs.${program.key}.name`) }}
                  </div>
                  <div
                    v-if="program.key === 'voiceRangeFinder' && myRangeLabel"
                    class="text-sm text-(--p-text-muted-color)"
                    data-testid="my-range"
                  >
                    {{ myRangeLabel }}
                  </div>
                </div>
              </div>
            </template>
          </PrimeCard>
        </CardLink>
      </li>
    </ol>
  </section>
</template>

<style scoped lang="css">
/* Tighter than a full program card: three of these share one row from sm up */
.start-here-card :deep(.p-card-body) {
  padding: 0.75rem 1rem;
}
</style>
