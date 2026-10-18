<script setup lang="ts">
import type { Difficulty } from '@/constants/difficulty'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { pitchClassOf } from '@/utils/scaleHighlight'
import type {
  CircleDirection,
  CircleMode,
  CircleView,
  OctaveShift,
} from './circleOfFifths'
import {
  CIRCLE_KEYS,
  FIFTH_SEMITONES,
  keyIndexOfPitchClass,
  keyNoteLabel,
  minorKeyIndexOfPitchClass,
  shiftRange,
  wheelNoteLabel,
} from './circleOfFifths'
import type { LadderHighlight } from './CircleOfFifthsSolfegeLadder.vue'
import { toCircleScreen } from './circleOfFifthsScreen'
import {
  DOMINANT_SEVENTH_OFFSETS,
  TRIAD_OFFSETS,
} from './useCircleOfFifthsPlayback'
import type {
  CircleOfFifthsGameResult,
  SungState,
} from './useCircleOfFifthsGame'

const {
  game,
  titleSuffix,
  disableIdlePreview = false,
  overridePreviewMidi = null,
  overridePreviewCents = null,
} = defineProps<{
  game: CircleOfFifthsGameResult
  titleSuffix?: string
  /* Test pages: never open the mic for the idle preview */
  disableIdlePreview?: boolean
  /* Test pages: the simulated singer's note, shown instead of the mic's */
  overridePreviewMidi?: number | null
  /* Test pages: the simulated singer's cents from that note */
  overridePreviewCents?: number | null
}>()

const mode = defineModel<CircleMode>('mode', { required: true })
const direction = defineModel<CircleDirection>('direction', { required: true })
const view = defineModel<CircleView>('view', { required: true })
const difficulty = defineModel<Difficulty>('difficulty', { required: true })
const holdDurationSec = defineModel<number>('holdDurationSec', {
  required: true,
})
const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const octaveShift = defineModel<OctaveShift>('octaveShift', { required: true })

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
  sungCents,
  chordMidis,
  isChordRinging,
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
  playKeyTone,
  playSelectedKey,
  playTarget,
  setDirection,
  setRange,
  setDifficulty,
  setHoldDuration,
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
/* Which of the five screens is showing — the template switches on this */
const screen = computed(() => toCircleScreen(phase.value, mode.value))
/* Fifths hops DO → SO in the key just sung; fourths hears that note as SO of
 * the next key and resolves to its DO */
const hopLabel = computed(() =>
  direction.value === 'clockwise' ? 'DO → SO' : 'SO → DO',
)
const WALK_LADDER_HIGHLIGHTS: readonly LadderHighlight[] = [
  { solfege: 'DO', tone: 'major' },
  { solfege: 'SO', tone: 'major' },
]
/* The dominant 7th in the key it resolves to: built on SO, so SO TI RE FA */
const DOMINANT_SEVENTH_IN_KEY = DOMINANT_SEVENTH_OFFSETS.map((offset) =>
  pitchClassOf(offset + FIFTH_SEMITONES),
)
/* The green pattern's notes and Find LA's, coloured like their buttons */
const EXPLORE_LADDER_HIGHLIGHTS: readonly LadderHighlight[] = [
  { solfege: 'DO', tone: 'major' },
  { solfege: 'MI', tone: 'major' },
  { solfege: 'SO', tone: 'major' },
  { solfege: 'LA', tone: 'minor' },
]

/*
 * Walk: DO → DO, following the key being sung (SO of C stays in C), on C
 * between walks. Explore: LA → LA, since Find LA drops below DO, on the
 * tapped key — held invisibly on C until there is one, so the first tap
 * doesn't push the wheel down.
 */
const ladder = computed(() => {
  const homeKeyIndex = keyIndexOfPitchClass(walkStartMidi.value)
  if (isWalkMode.value) {
    return {
      keyIndex: currentTarget.value?.keyIndex ?? homeKeyIndex,
      startSolfege: 'DO' as const,
      highlights: WALK_LADDER_HIGHLIGHTS,
      chordSemitones:
        direction.value === 'clockwise'
          ? TRIAD_OFFSETS
          : DOMINANT_SEVENTH_IN_KEY,
      isPlaceholder: false,
    }
  }

  const keyIndex = currentTarget.value?.keyIndex ?? selectedKeyIndex.value

  return {
    keyIndex: keyIndex ?? homeKeyIndex,
    startSolfege: 'LA' as const,
    highlights: EXPLORE_LADDER_HIGHLIGHTS,
    chordSemitones: TRIAD_OFFSETS,
    isPlaceholder: keyIndex === null,
  }
})
const ladderActiveSolfege = computed(() => currentTarget.value?.solfege ?? null)
const subtitle = computed(() => {
  if (!isWalkMode.value) return t('circleOfFifths.exploreHint')

  return direction.value === 'clockwise'
    ? t('circleOfFifths.walkHintFifths')
    : t('circleOfFifths.walkHintFourths')
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))
/* Whole seconds while playing — a ticking tenths digit is stressful to watch; the complete screen keeps the decimal */
const liveElapsedSeconds = computed(() => Math.floor(elapsedMs.value / 1000))

const targetDisplay = computed(() => {
  const target = currentTarget.value
  if (!target || !isSinging.value) return null

  return {
    /* "E major", not a bare "E" — alone it reads as a note to sing */
    keyLabel: t('circleOfFifths.keyMajor', {
      key: CIRCLE_KEYS[target.keyIndex].label,
    }),
    solfege: target.solfege,
    noteLabel: wheelNoteLabel(target.midi),
    /* Spelled by the key the target sits in: C while singing SO of C, F
     * while singing DO of F after C7. The next note is in the chord only
     * going clockwise — SO is its top note. Going counter-clockwise the
     * dominant 7th's TI sits a half step below DO, so it guides the way. */
    chordNotes: chordMidis.value.map((midi) => ({
      label: keyNoteLabel(midi, target.keyIndex),
      isNext: (midi - target.midi) % 12 === 0,
      isGuide: pitchClassOf(target.midi - midi) === 1,
    })),
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
  rawNoteInfo: micPreviewNoteInfo,
} = useIdlePreview({
  isGameActive: computed(() => !isIdle.value),
  isPlayingSequence,
  isEnabled: effectivePreviewEnabled,
})

const previewMidi = computed(() => {
  if (!isIdle.value) return null

  return overridePreviewMidi ?? micPreviewMidi.value
})

/* Cents from the previewed note, which is always the nearest one */
const previewCents = computed(() => {
  if (previewMidi.value === null) return null
  if (overridePreviewMidi !== null) return overridePreviewCents

  return micPreviewNoteInfo.value?.cents ?? null
})

/* Finding LA is about the relative minor, so both outlines move to the inner
 * ring: the slot is Em under G, and a sung note lights the minor key it's home
 * to. Half steps hides that ring, so it keeps the pitch wedges. */
const outlineRing = computed(() =>
  !isIdle.value &&
  currentTarget.value?.solfege === 'LA' &&
  view.value === 'fifths'
    ? 'minor'
    : 'major',
)
function outlineKeyIndexOf(midi: number) {
  return outlineRing.value === 'minor'
    ? minorKeyIndexOfPitchClass(midi)
    : keyIndexOfPitchClass(midi)
}

/* Any octave lights the key's wedge — the mic preview on the start screens,
 * the singer's live note during a round… */
const heardKeyIndex = computed(() => {
  const midi = isIdle.value ? previewMidi.value : sungMidi.value

  return midi === null ? null : outlineKeyIndexOf(midi)
})
/* The wedge of the note to sing, outlined dashed. The note's own wedge, not
 * the walk's next key: they match on every hop, but in Explore MI of C is E.
 * Before a walk it's the first note, while the preview listens for it. */
const targetNoteKeyIndex = computed(() => {
  if (isSinging.value && currentTarget.value)
    return outlineKeyIndexOf(currentTarget.value.midi)
  if (screen.value === 'walkIdle' && isIdleSungNoteVisible.value)
    return outlineKeyIndexOf(walkStartMidi.value)

  return null
})
/* …but only the walk's exact first note earns the ✓, since the walk needs it */
const isStartNoteHit = computed(
  () =>
    screen.value === 'walkIdle' && previewMidi.value === walkStartMidi.value,
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
  if (screen.value !== 'walkIdle' || previewMidi.value === null) return null
  if (previewMidi.value === walkStartMidi.value) return 'correct'

  return previewMidi.value < walkStartMidi.value ? 'low' : 'high'
})

/* Tapped keys play through the speaker — keep the preview from hearing them */
function handleSelect(keyIndex: number) {
  triggerDeafPeriod()
  /* Walk: hear the note you'll sing. Explore: pick the key and hear its chord */
  if (screen.value === 'walkIdle') {
    playKeyTone(keyIndex)
  } else {
    selectKey(keyIndex)
  }
}

function handlePlaySelectedKey() {
  triggerDeafPeriod()
  playSelectedKey()
}

/* What the wheel highlights on each screen: walk progress on the walk
 * screens, the tapped and explored keys on the explore screens */
const wheelProps = computed(() => {
  const isExploreScreen =
    screen.value === 'exploreIdle' || screen.value === 'patternSinging'

  return {
    litKeyIndices: isExploreScreen ? [] : litKeyIndices.value,
    exploredKeyIndices: isExploreScreen ? exploredKeyIndices.value : [],
    exploredMinorKeyIndices: isExploreScreen
      ? exploredMinorKeyIndices.value
      : [],
    selectedKeyIndex: isExploreScreen ? selectedKeyIndex.value : null,
    /* Only the key being sung is "current" — after the walk the wheel shows
     * the lit circle on its own */
    currentKeyIndex: isSinging.value ? currentKeyIndex.value : null,
    isInteractive:
      screen.value === 'walkIdle' || screen.value === 'exploreIdle',
    isPathClosed: screen.value === 'walkComplete',
    /* Explore's buttons wait on a key — point at the wheel until one is tapped */
    isBeckoning:
      screen.value === 'exploreIdle' && selectedKeyIndex.value === null,
  }
})

watch(direction, (next) => setDirection(next), { immediate: true })
watch(difficulty, (level) => setDifficulty(level), { immediate: true })
watch(holdDurationSec, (sec) => setHoldDuration(sec * 1000), {
  immediate: true,
})
watch(
  [rangeIndex, octaveShift],
  ([index, octaves]) => {
    const range = VOICE_RANGES[index]
    if (range) setRange(shiftRange(range, octaves))
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
    :data-screen="screen"
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
      <CircleOfFifthsSolfegeLadder
        :class="{ invisible: ladder.isPlaceholder }"
        :keyIndex="ladder.keyIndex"
        :startSolfege="ladder.startSolfege"
        :highlights="ladder.highlights"
        :chordSemitones="ladder.chordSemitones"
        :activeSolfege="ladderActiveSolfege"
      />
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
          v-if="screen === 'walking'"
          class="font-mono text-lg text-(--p-text-muted-color) tabular-nums"
        >
          ⏱ {{ liveElapsedSeconds }}s
        </p>
      </template>

      <template v-else-if="screen === 'walkComplete'">
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
          v-model:octaveShift="octaveShift"
          v-model:difficulty="difficulty"
          v-model:holdDurationSec="holdDurationSec"
          :showDirection="screen === 'walkIdle'"
        />

        <div
          v-if="screen === 'walkIdle'"
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
      v-bind="wheelProps"
      :view="view"
      :nextKeyIndex="nextKeyIndex"
      :holdProgress="holdProgress"
      :heardKeyIndex="heardKeyIndex"
      :targetNoteKeyIndex="targetNoteKeyIndex"
      :isHeardCorrect="isIdle ? isStartNoteHit : isSingingCorrectNote"
      :outlineRing="outlineRing"
      @select="handleSelect"
    >
      <CircleOfFifthsTarget
        v-if="targetDisplay"
        :keyLabel="targetDisplay.keyLabel"
        :solfege="targetDisplay.solfege"
        :showSolfege="!isWalkMode"
        :noteLabel="targetDisplay.noteLabel"
        :hopDirection="hopDirection"
        :sungLabel="sungLabel"
        :sungState="sungState"
        :sungCents="sungCents"
        :isCorrect="isSingingCorrectNote"
        :showTooLow="showTooLow"
        :showTooHigh="showTooHigh"
        :chordNotes="targetDisplay.chordNotes"
        :isChordRinging="isChordRinging"
      />
      <div
        v-else-if="screen === 'walkIdle' || screen === 'walkComplete'"
        class="flex flex-col items-center gap-[1cqi] leading-tight"
      >
        <span class="text-[6cqi] font-bold text-(--p-text-muted-color)">{{
          hopLabel
        }}</span>
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
          :sungCents="previewCents"
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
          :sungCents="previewCents"
          :showTooLow="false"
          :showTooHigh="false"
        />
      </div>
    </CircleOfFifthsWheel>
  </div>
</template>
