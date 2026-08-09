import type { DuetLane } from '@/composables/useDuetPitchDetection'
import type { NoteName } from '@/utils/noteUtils'
import { toAccidentalGlyph } from '@/utils/noteUtils'

/*
 * The simulated-voice harness behind the board test pages (/piano-test,
 * /guitar-test). It stands in for useIdlePreview + useDuetPitchDetection: same
 * lane shape, same gating, but driven by sliders instead of a microphone — so a
 * developer can exercise the duet split, the lane colours and the preview
 * geometry with no mic, no permission prompt and no second singer in the room.
 */

/* Both boards spell their lane ids the same way, so one type feeds both. */
export type SimulatedSingerLaneId = 'low' | 'high'

export type SimulatedSingerState = {
  note: NoteName
  octave: number
  cents: number
  clarity: number
  jitter: number
}

export type SimulatedSinger = {
  label: string
  laneId: SimulatedSingerLaneId
  state: SimulatedSingerState
  detection: ReturnType<typeof useSimulatedPitchDetection>
}

type SimulatedSingerSeed = {
  label: string
  note: NoteName
  octave: number
}

type SimulatedSingersOptions = {
  /* The shared "See your voice" setting — nothing is previewed while it is off,
   * exactly as on the live pages. */
  isPreviewEnabled: Ref<boolean>
  /* "Two singers" — adds the high lane. */
  isDuetEnabled: Ref<boolean>
  low: SimulatedSingerSeed
  high: SimulatedSingerSeed
}

/* Mirrors the mic-deaf window the real pages arm on every note played, so a
 * sounded tone is never mistaken for singing. Matches DEAF_PERIOD_MS in
 * useDuetPitchDetection. */
const DEAF_PERIOD_MS = 1000

const EMPTY_LANE: DuetLane = {
  previewMidi: null,
  previewFrequency: null,
  previewNoteLabel: null,
}

export function useSimulatedSingers(options: SimulatedSingersOptions) {
  function createSinger(
    seed: SimulatedSingerSeed,
    laneId: SimulatedSingerLaneId,
  ): SimulatedSinger {
    const state = reactive<SimulatedSingerState>({
      note: seed.note,
      octave: seed.octave,
      cents: 0,
      clarity: 0.95,
      jitter: 2,
    })

    return {
      label: seed.label,
      laneId,
      state,
      detection: useSimulatedPitchDetection(toRefs(state)),
    }
  }

  const lowSinger = createSinger(options.low, 'low')
  const highSinger = createSinger(options.high, 'high')
  const singers = [lowSinger, highSinger]

  const visibleSingers = computed(() =>
    options.isDuetEnabled.value ? singers : [lowSinger],
  )

  /* A live rAF signal (never the mic), so frequencyToNote's hysteresis behaves
   * as it would with a real singer. */
  onMounted(() => singers.forEach((singer) => singer.detection.start()))
  onUnmounted(() => singers.forEach((singer) => singer.detection.stop()))

  const isDeaf = ref(false)
  let deafTimeoutId: ReturnType<typeof setTimeout> | null = null

  function armDeafPeriod() {
    isDeaf.value = true

    if (deafTimeoutId !== null) clearTimeout(deafTimeoutId)

    deafTimeoutId = setTimeout(() => {
      isDeaf.value = false
      deafTimeoutId = null
    }, DEAF_PERIOD_MS)
  }

  onUnmounted(() => {
    if (deafTimeoutId !== null) clearTimeout(deafTimeoutId)
  })

  /* Same lane semantics as useDuetPitchDetection.toLane: nothing while the
   * preview is off or the deaf period is armed, and nothing for an unclean
   * reading — which is what makes the Clarity slider meaningful. */
  function toLane(singer: SimulatedSinger): DuetLane {
    if (!options.isPreviewEnabled.value || isDeaf.value) return EMPTY_LANE

    const noteInfo = singer.detection.noteInfo.value
    if (!noteInfo || !singer.detection.isClean.value) return EMPTY_LANE

    return {
      previewMidi: noteInfo.midiNote,
      previewFrequency: singer.detection.frequency.value,
      previewNoteLabel: toAccidentalGlyph(`${noteInfo.note}${noteInfo.octave}`),
    }
  }

  /* Single-voice mode renders through the same lane pipeline as duet mode, just
   * with one entry — matching the live pages. */
  const previewLanes = computed<
    Array<DuetLane & { laneId: SimulatedSingerLaneId }>
  >(() =>
    visibleSingers.value.map((singer) => ({
      ...toLane(singer),
      laneId: singer.laneId,
    })),
  )

  return { singers, visibleSingers, previewLanes, armDeafPeriod }
}
