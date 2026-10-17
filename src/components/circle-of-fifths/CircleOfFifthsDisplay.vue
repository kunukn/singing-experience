<script setup lang="ts">
import type { Difficulty } from '@/constants/difficulty'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import type { CircleDirection, CircleMode, CircleView } from './circleOfFifths'
import {
  CIRCLE_KEYS,
  keyIndexOfPitchClass,
  wheelNoteLabel,
} from './circleOfFifths'
import type {
  CircleOfFifthsGameResult,
  SungState,
} from './useCircleOfFifthsGame'

const {
  game,
  titleSuffix,
  disableIdlePreview = false,
  overridePreviewMidi = null,
} = defineProps<{
  game: CircleOfFifthsGameResult
  titleSuffix?: string
  /* Test pages: never open the mic for the idle preview */
  disableIdlePreview?: boolean
  /* Test pages: the simulated singer's note, shown instead of the mic's */
  overridePreviewMidi?: number | null
}>()

const mode = defineModel<CircleMode>('mode', { required: true })
const direction = defineModel<CircleDirection>('direction', { required: true })
const view = defineModel<CircleView>('view', { required: true })
const difficulty = defineModel<Difficulty>('difficulty', { required: true })
const rangeIndex = defineModel<number>('rangeIndex', { required: true })

const { t } = useI18n()

const {
  phase,
  isIdle,
  isSinging,
  isWalkComplete,
  currentTarget,
  currentKeyIndex,
  hopDirection,
  nextKeyIndex,
  walkStartMidi,
  litKeyIndices,
  exploredKeyIndices,
  exploredMinorKeyIndices,
  selectedKeyIndex,
  holdProgress,
  isSingingCorrectNote,
  sungMidi,
  centsFromTarget,
  showTooLow,
  showTooHigh,
  elapsedMs,
  error,
  currentChordIndex,
  isPlayingSequence,
  startWalk,
  startPattern,
  stop,
  selectKey,
  playSelectedKey,
  playTarget,
  setDirection,
  setRange,
  setDifficulty,
} = game

const modeOptions = computed(() => [
  { label: t('circleOfFifths.modeWalk'), value: 'walk' },
  { label: t('circleOfFifths.modeExplore'), value: 'explore' },
])

const viewOptions = computed(() => [
  { label: t('circleOfFifths.viewFifths'), value: 'fifths' },
  { label: t('circleOfFifths.viewChromatic'), value: 'chromatic' },
])

const isWalkMode = computed(() => mode.value === 'walk')
const hopSolfege = computed(() =>
  direction.value === 'clockwise' ? 'SO' : 'FA',
)
const subtitle = computed(() => {
  if (!isWalkMode.value) return t('circleOfFifths.exploreHint')

  return direction.value === 'clockwise'
    ? t('circleOfFifths.walkHintFifths')
    : t('circleOfFifths.walkHintFourths')
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))

const targetDisplay = computed(() => {
  const target = currentTarget.value
  if (!target || !isSinging.value) return null

  return {
    keyLabel: CIRCLE_KEYS[target.keyIndex].label,
    solfege: target.solfege,
    noteLabel: wheelNoteLabel(target.midi),
  }
})

/* What the singer is on, spelled like the wedge it outlines */
const sungLabel = computed(() =>
  sungMidi.value === null ? null : wheelNoteLabel(sungMidi.value),
)

const sungState = computed<SungState | null>(() => {
  if (sungMidi.value === null) return null
  if (isSingingCorrectNote.value) return 'correct'

  const cents = centsFromTarget.value
  if (cents === null) return null

  return cents < 0 ? 'low' : 'high'
})

/* "See your voice" on the start screens: the mic listens only while idle, so
 * the singer can find DO before a walk or discover which key a note is in. */
const { isPreviewEnabled } = useSettings()
const effectivePreviewEnabled = computed(
  () => !disableIdlePreview && isPreviewEnabled.value,
)
const {
  previewMidi: micPreviewMidi,
  micPermission,
  triggerDeafPeriod,
} = useIdlePreview({
  isGameActive: computed(() => !isIdle.value),
  isPlayingSequence,
  isEnabled: effectivePreviewEnabled,
})

const previewMidi = computed(() => {
  if (!isIdle.value) return null

  return overridePreviewMidi ?? micPreviewMidi.value
})

/* Any octave lights the key's wedge — the mic preview on the start screens,
 * the singer's live note during a round… */
const heardKeyIndex = computed(() => {
  const midi = isIdle.value ? previewMidi.value : sungMidi.value

  return midi === null ? null : keyIndexOfPitchClass(midi)
})
/* …but only the walk's exact first note earns the ✓, since the walk needs it */
const isStartNoteHit = computed(
  () => isWalkMode.value && previewMidi.value === walkStartMidi.value,
)
const startNoteLabel = computed(() => wheelNoteLabel(walkStartMidi.value))

/* The 🎤 line on the start screens, shown only while the preview is on */
const isIdleSungNoteVisible = computed(
  () =>
    isIdle.value &&
    isPreviewEnabled.value &&
    (disableIdlePreview || micPermission.value !== 'denied'),
)
const idleSungLabel = computed(() =>
  previewMidi.value === null ? null : wheelNoteLabel(previewMidi.value),
)
/* Walk compares against its first note, so a C in the wrong octave shows
 * which way to go; Explore has no target, so it stays neutral */
const idleSungState = computed<SungState | null>(() => {
  if (!isWalkMode.value || previewMidi.value === null) return null
  if (previewMidi.value === walkStartMidi.value) return 'correct'

  return previewMidi.value < walkStartMidi.value ? 'low' : 'high'
})

/* Tapped keys play through the speaker — keep the preview from hearing them */
function handleSelect(keyIndex: number) {
  triggerDeafPeriod()
  selectKey(keyIndex)
}

function handlePlaySelectedKey() {
  triggerDeafPeriod()
  playSelectedKey()
}

/* Only the key being sung is "current" — after the walk the wheel shows the
 * lit circle on its own */
const wheelCurrentKeyIndex = computed(() =>
  isSinging.value ? currentKeyIndex.value : null,
)

watch(direction, (next) => setDirection(next), { immediate: true })
watch(difficulty, (level) => setDifficulty(level), { immediate: true })
watch(
  rangeIndex,
  (index) => {
    const range = VOICE_RANGES[index]
    if (range) setRange(range)
  },
  { immediate: true },
)
watch(mode, () => stop())

const { fireConfetti } = useConfettiStore()
watch(isWalkComplete, (complete) => {
  if (complete) fireConfetti()
})

function handleSing(patternId: 'doMiSo' | 'doLa') {
  if (selectedKeyIndex.value === null) return

  void startPattern(selectedKeyIndex.value, patternId)
}

onUnmounted(() => stop())
</script>

<template>
  <div
    class="relative flex grow flex-col items-center gap-4 pb-4"
    data-testid="circle-of-fifths-display"
    :data-phase="phase"
  >
    <div class="flex min-h-17 flex-col items-center gap-2 text-center">
      <h1 class="flex items-center gap-2 text-2xl font-semibold">
        <span>🎡</span>
        <span>
          {{ t('home.programs.circleOfFifths.name')
          }}{{ titleSuffix ? ` ${titleSuffix}` : '' }}
        </span>
      </h1>
      <p class="text-sm text-(--p-text-muted-color)">{{ subtitle }}</p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <PrimeSelectButton
        v-model="mode"
        :options="modeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        :disabled="isSinging"
        size="small"
        :aria-label="t('circleOfFifths.mode')"
        data-testid="circle-mode"
      />
      <PrimeSelectButton
        v-model="view"
        :options="viewOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :aria-label="t('circleOfFifths.view')"
        data-testid="circle-view"
      />
    </div>

    <slot :phase="phase" :currentTarget="currentTarget" />

    <div class="flex w-full flex-col items-center gap-3 sm:min-h-32">
      <template v-if="isSinging">
        <div class="flex flex-wrap items-center justify-center gap-2">
          <PrimeButton
            class="min-w-20"
            severity="danger"
            size="small"
            rounded
            @click="stop()"
          >
            {{ t('generic.stop') }}
          </PrimeButton>
          <PrimeButton
            class="min-w-20"
            severity="secondary"
            size="small"
            rounded
            icon="pi pi-volume-up"
            :label="t('circleOfFifths.hearIt')"
            @click="playTarget()"
          />
        </div>
        <p
          v-if="isWalkMode"
          class="font-mono text-lg text-(--p-text-muted-color) tabular-nums"
        >
          ⏱ {{ elapsedSeconds }}s
        </p>
      </template>

      <template v-else-if="isWalkComplete">
        <h2 class="text-3xl font-bold text-(--p-green-400)">
          {{ t('generic.congratulations') }}
        </h2>
        <p class="text-(--p-surface-400) dark:text-(--p-surface-300)">
          {{ t('circleOfFifths.walkComplete') }}
        </p>
        <div class="flex items-center gap-4">
          <p class="text-lg text-(--p-text-muted-color)">
            {{ t('generic.time') }}
            <span class="text-(--p-text-color) tabular-nums"
              >{{ elapsedSeconds }}s</span
            >
          </p>
          <PrimeButton
            class="min-w-20"
            severity="success"
            size="small"
            rounded
            @click="startWalk()"
          >
            {{ t('generic.playAgain') }}
          </PrimeButton>
        </div>
      </template>

      <template v-else>
        <CircleOfFifthsSettingsRow
          v-model:direction="direction"
          v-model:rangeIndex="rangeIndex"
          v-model:difficulty="difficulty"
          :showDirection="isWalkMode"
        />

        <div
          v-if="isWalkMode"
          class="flex flex-wrap items-center justify-center gap-2"
        >
          <PrimeButton
            class="min-w-20"
            severity="success"
            size="small"
            rounded
            @click="startWalk()"
          >
            {{ t('generic.start') }}
          </PrimeButton>
          <PreviewToggle
            v-model="isPreviewEnabled"
            :disabled="micPermission === 'denied'"
          />
        </div>

        <div v-else class="flex flex-wrap items-center justify-center gap-2">
          <PrimeButton
            severity="secondary"
            size="small"
            rounded
            icon="pi pi-volume-up"
            :label="t('circleOfFifths.hearIt')"
            :disabled="selectedKeyIndex === null"
            @click="handlePlaySelectedKey()"
          />
          <PrimeButton
            severity="success"
            size="small"
            rounded
            :label="t('circleOfFifths.singDoMiSo')"
            :disabled="selectedKeyIndex === null"
            @click="handleSing('doMiSo')"
          />
          <PrimeButton
            severity="help"
            size="small"
            rounded
            :label="t('circleOfFifths.findLa')"
            :disabled="selectedKeyIndex === null"
            @click="handleSing('doLa')"
          />
          <PreviewToggle
            v-model="isPreviewEnabled"
            :disabled="micPermission === 'denied'"
          />
        </div>

        <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>
      </template>
    </div>

    <CircleOfFifthsWheel
      :view="view"
      :litKeyIndices="isWalkMode ? litKeyIndices : []"
      :exploredKeyIndices="isWalkMode ? [] : exploredKeyIndices"
      :exploredMinorKeyIndices="isWalkMode ? [] : exploredMinorKeyIndices"
      :currentKeyIndex="wheelCurrentKeyIndex"
      :nextKeyIndex="nextKeyIndex"
      :selectedKeyIndex="isWalkMode ? null : selectedKeyIndex"
      :holdProgress="holdProgress"
      :isInteractive="!isWalkMode && isIdle"
      :isPathClosed="isWalkComplete"
      :heardKeyIndex="heardKeyIndex"
      @select="handleSelect"
    >
      <CircleOfFifthsTarget
        v-if="targetDisplay"
        :keyLabel="targetDisplay.keyLabel"
        :solfege="targetDisplay.solfege"
        :noteLabel="targetDisplay.noteLabel"
        :hopDirection="hopDirection"
        :sungLabel="sungLabel"
        :sungState="sungState"
        :isCorrect="isSingingCorrectNote"
        :showTooLow="showTooLow"
        :showTooHigh="showTooHigh"
      />
      <div
        v-else-if="isWalkMode"
        class="flex flex-col items-center gap-[1cqi] leading-tight"
      >
        <span class="text-[6cqi] font-bold text-(--p-text-muted-color)"
          >DO → {{ hopSolfege }}</span
        >
        <span
          class="text-[4.4cqi] font-semibold tabular-nums transition-colors"
          :class="
            isStartNoteHit ? 'text-(--p-green-500)' : 'text-(--p-text-color)'
          "
          data-testid="circle-start-note"
          :data-hit="isStartNoteHit"
          >{{ isStartNoteHit ? '✓ ' : '' }}DO = {{ startNoteLabel }}</span
        >
        <CircleOfFifthsSungNote
          v-if="isIdleSungNoteVisible"
          :sungLabel="idleSungLabel"
          :sungState="idleSungState"
          :showTooLow="idleSungState === 'low'"
          :showTooHigh="idleSungState === 'high'"
        />
      </div>
      <div v-else class="flex flex-col items-center gap-[1cqi]">
        <CircleOfFifthsKeyInfo
          :keyIndex="selectedKeyIndex"
          :chordIndex="currentChordIndex"
        />
        <CircleOfFifthsSungNote
          v-if="isIdleSungNoteVisible"
          :sungLabel="idleSungLabel"
          :sungState="null"
          :showTooLow="false"
          :showTooHigh="false"
        />
      </div>
    </CircleOfFifthsWheel>
  </div>
</template>
