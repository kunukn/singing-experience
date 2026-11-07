<script setup lang="ts">
import MelodyMap from './MelodyMap.vue'
import NotesUsedChart from './NotesUsedChart.vue'
import SongProfile from './SongProfile.vue'
import TakeRatingCard from './TakeRatingCard.vue'
import TakeReadout from './TakeReadout.vue'
import type { TakeAnalysis } from './analyzeTake'
import { decodeTake } from './decodeTake'
import { useTakeAnalysis } from './useTakeAnalysis'
import type { TakeOrigin } from './useVoiceRecorder'

type Props = {
  blob: Blob
  hasAutoGain: boolean
  source: TakeOrigin
  playheadMs: number
  /* Raw numbers for calibrating the scores, on the test page only. */
  showReadout?: boolean
  savedAnalysis?: TakeAnalysis | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  seek: [timeMs: number]
  analyzed: [analysis: TakeAnalysis]
  tonePlay: []
}>()

const { t } = useI18n()
const { status, progress, analysis, run } = useTakeAnalysis(props.savedAnalysis)

const progressPercent = computed(() => Math.round(progress.value * 100))
const isUploaded = computed(() => props.source === 'uploaded')
/* A file was made elsewhere, so advice about this mic would be wrong. */
const warningKeys = computed(() => {
  const quality = analysis.value?.quality
  if (!quality) return []

  return [
    quality.isTooQuiet
      ? isUploaded.value
        ? 'voiceRecorder.analysis.warnings.tooQuietFile'
        : 'voiceRecorder.analysis.warnings.tooQuiet'
      : null,
    quality.isClipped
      ? isUploaded.value
        ? 'voiceRecorder.analysis.warnings.clippedFile'
        : 'voiceRecorder.analysis.warnings.clipped'
      : null,
    quality.isUnclear ? 'voiceRecorder.analysis.warnings.unclear' : null,
  ].filter((key) => key !== null)
})

/* On tap, not automatic: if decoding runs a phone out of memory, the take hasn't
 * been lost before there was a chance to download it. */
async function analyse() {
  const result = await run(() => decodeTake(props.blob), {
    /* How an uploaded file was processed is unknown: phone apps often keep
     * auto gain on, and finished songs are compressed. Either way its loudness
     * says nothing about the singing, so it is treated like auto gain. */
    hasAutoGain: props.hasAutoGain || isUploaded.value,
  })

  if (result) emit('analyzed', result)
}
</script>

<template>
  <div
    class="flex flex-col gap-5"
    data-testid="take-analysis"
    :data-status="status"
  >
    <PrimeButton
      v-if="status === 'idle' || status === 'failed'"
      :label="t('voiceRecorder.analysis.analyse')"
      size="small"
      rounded
      class="self-start"
      data-testid="take-analyse"
      @click="analyse"
    />

    <p
      v-if="status === 'failed'"
      class="text-sm text-(--p-red-400)"
      data-testid="take-analysis-error"
    >
      {{ t('voiceRecorder.analysis.failed') }}
    </p>

    <div v-if="status === 'analyzing'" class="flex flex-col gap-2">
      <p class="text-sm text-(--p-text-muted-color)">
        {{ t('voiceRecorder.analysis.analyzing') }}
      </p>
      <PrimeProgressBar
        :value="progressPercent"
        :showValue="false"
        class="h-2"
      />
    </div>

    <template v-if="analysis">
      <p
        v-for="warningKey in warningKeys"
        :key="warningKey"
        class="text-sm text-(--p-orange-400)"
        data-testid="take-analysis-warning"
      >
        {{ t(warningKey) }}
      </p>

      <p
        v-if="analysis.notes.length === 0"
        class="text-sm text-(--p-text-muted-color)"
        data-testid="take-analysis-empty"
      >
        {{ t('voiceRecorder.analysis.empty') }}
      </p>

      <template v-else>
        <section class="flex flex-col gap-2">
          <h2 class="text-sm font-semibold">
            {{ t('voiceRecorder.melody.title') }}
          </h2>
          <MelodyMap
            :analysis="analysis"
            :playheadMs="playheadMs"
            @seek="emit('seek', $event)"
          />
          <p class="text-xs text-(--p-text-muted-color)">
            {{ t('voiceRecorder.melody.hint') }}
          </p>
        </section>

        <!-- max-w-sm here and on SongProfile: at full width the right-hand
             word (Fast, Leaping…) drifts so far off that the pairs read as one
             list. The melody map above stays full width. -->
        <NotesUsedChart
          class="max-w-sm"
          :notesUsed="analysis.notesUsed"
          :takeKey="analysis.key"
          @tonePlay="emit('tonePlay')"
        />
      </template>

      <SongProfile
        v-if="analysis.profile && analysis.notes.length > 0"
        class="max-w-sm"
        :profile="analysis.profile"
      />

      <TakeReadout v-if="showReadout" :analysis="analysis" />

      <TakeRatingCard
        v-if="analysis.notes.length > 0"
        :rating="analysis.rating"
        :voicedMs="analysis.quality.voicedMs"
      />
    </template>
  </div>
</template>
