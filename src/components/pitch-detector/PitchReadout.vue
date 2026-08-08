<script setup lang="ts">
import type { NoteInfo } from '@/utils/noteUtils'
import NoteDisplay from './NoteDisplay.vue'
import PitchStats from './PitchStats.vue'
import type { PitchLaneId } from './pitchLanes'

type Props = {
  noteInfo: NoteInfo | null
  isClean: boolean
  frequency: number | null
  clarity: number
  isVisible: boolean
  /* Set only in duet mode, where each column has to say whose voice it is. */
  laneId?: PitchLaneId
  /* Duet fits two of these where one used to sit, so everything shrinks a step. */
  isCompact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  laneId: undefined,
  isCompact: false,
})

const { t } = useI18n()

/* The same pairing as the dashed preview lines and the piano/guitar boards:
 * orange is the low (or only) voice, blue the high one. */
const LANE_HEADING_CLASS: Record<PitchLaneId, string> = {
  low: 'text-(--p-orange-400)',
  high: 'text-(--p-blue-400)',
}

const LANE_HEADING_KEY: Record<PitchLaneId, string> = {
  low: 'pitchDetector.lowVoice',
  high: 'pitchDetector.highVoice',
}

const centsBarHeight = computed(() =>
  props.isCompact ? 'h-20 sm:h-28' : 'h-30 sm:h-40',
)

/* The spelled-out "Sharp ♯" / "♭ Flat" set the bar column's width, which two
 * readouts cannot afford on a phone — the bare accidental says the same thing
 * in a fraction of the space. */
const sharpLabel = computed(() =>
  props.isCompact ? '♯' : t('pitchDetector.sharp'),
)
const flatLabel = computed(() =>
  props.isCompact ? '♭' : t('pitchDetector.flat'),
)
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <span
      v-if="laneId"
      class="text-xs font-semibold"
      :class="LANE_HEADING_CLASS[laneId]"
    >
      {{ t(LANE_HEADING_KEY[laneId]) }}
    </span>

    <div class="flex items-center justify-center gap-1 sm:gap-3">
      <CentsDeviationBar
        :cents="noteInfo && isClean ? noteInfo.cents : null"
        :threshold="10"
        :maxRange="100"
        :isVisible="isVisible"
        :highLabel="sharpLabel"
        :lowLabel="flatLabel"
        :height="centsBarHeight"
      />

      <NoteDisplay
        :noteInfo="noteInfo"
        :isClean="isClean"
        :isCompact="isCompact"
      />

      <PitchStats
        :frequency="frequency"
        :clarity="clarity"
        :isListening="isVisible"
        :isCompact="isCompact"
      />
    </div>
  </div>
</template>
