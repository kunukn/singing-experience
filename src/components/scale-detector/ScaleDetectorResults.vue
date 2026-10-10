<script setup lang="ts">
import {
  keyAccidentalStyle,
  MIN_DISTINCT_PITCH_CLASSES,
  pitchClassLabel,
  type ScaleCandidate,
  type ScaleDetection,
} from '@/utils/scaleDetection'
import type { ScaleSelection } from './useScaleDetector'
import { useScaleName } from './useScaleName'

type Props = {
  result: ScaleDetection
  selected: ScaleSelection | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [candidate: ScaleSelection]
}>()

const { t } = useI18n()
const { scaleName } = useScaleName()

/* Three families covers the realistic answers; the rest are long shots that
 * would bury them. */
const MAX_FAMILIES_SHOWN = 3

const families = computed(() =>
  props.result.families.slice(0, MAX_FAMILIES_SHOWN).map((family) => {
    const [home, ...twins] = family.candidates
    const style = keyAccidentalStyle(home.root, home.mode)

    return {
      key: `${home.root}:${home.mode}`,
      home,
      twins,
      missingLabels: family.missingPitchClasses
        .map((pitchClass) => pitchClassLabel(pitchClass, style))
        .join(' '),
    }
  }),
)

function isSelected(candidate: ScaleCandidate): boolean {
  return (
    props.selected?.root === candidate.root &&
    props.selected?.mode === candidate.mode
  )
}

const hasNotes = computed(() => props.result.sungPitchClasses.size > 0)
</script>

<template>
  <div class="flex w-full flex-col gap-3" data-testid="scale-detector-results">
    <p
      v-if="hasNotes && !result.hasEnoughNotes"
      class="text-center text-sm text-(--p-text-muted-color)"
      data-testid="scale-detector-keep-singing"
    >
      {{
        t('scaleDetector.keepSinging', { count: MIN_DISTINCT_PITCH_CLASSES })
      }}
    </p>

    <p
      v-if="hasNotes && result.families.length === 0"
      class="text-center text-sm text-(--p-orange-400)"
      data-testid="scale-detector-no-match"
    >
      {{ t('scaleDetector.noMatch') }}
    </p>

    <ol
      v-if="families.length > 0"
      class="flex w-full flex-col gap-3"
      :class="{ 'opacity-60': !result.hasEnoughNotes }"
    >
      <li
        v-for="family in families"
        :key="family.key"
        class="flex flex-col gap-2 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-3"
        data-testid="scale-detector-family"
      >
        <PrimeButton
          :label="scaleName(family.home.root, family.home.mode)"
          :severity="isSelected(family.home) ? undefined : 'secondary'"
          :outlined="!isSelected(family.home)"
          class="self-start text-lg font-semibold"
          :data-selected="isSelected(family.home) || undefined"
          data-testid="scale-detector-home"
          @click="emit('select', family.home)"
        />

        <div
          v-if="family.twins.length > 0"
          class="flex flex-wrap items-center gap-1 text-sm"
        >
          <span class="text-(--p-text-muted-color)">
            {{ t('scaleDetector.sameNotes') }}
          </span>
          <PrimeButton
            v-for="twin in family.twins"
            :key="`${twin.root}:${twin.mode}`"
            :label="scaleName(twin.root, twin.mode)"
            size="small"
            :severity="isSelected(twin) ? undefined : 'secondary'"
            :text="!isSelected(twin)"
            :data-selected="isSelected(twin) || undefined"
            data-testid="scale-detector-twin"
            @click="emit('select', twin)"
          />
        </div>

        <p
          v-if="family.missingLabels"
          class="text-xs text-(--p-text-muted-color)"
          data-testid="scale-detector-missing"
        >
          {{ t('scaleDetector.notSungYet', { notes: family.missingLabels }) }}
        </p>
      </li>
    </ol>
  </div>
</template>
