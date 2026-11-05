<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import { useScaleName } from '@/components/scale-detector/useScaleName'
import { buildScale } from '@/utils/noteUtils'

import type { NoteUse, TakeKey } from './analyzeTake'
import { scaleNoteChips, scalePreviewRootMidi } from './takeKeyScale'

/* Slower than the DO RE MI preview's 250 ms, so each note can be heard before the next. */
const SCALE_NOTE_INTERVAL_MS = 400

type Props = {
  takeKey: TakeKey
  notesUsed: NoteUse[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  play: []
}>()

const { t, locale } = useI18n()
const { scaleName } = useScaleName()
const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const { setToneMode } = useTonePlayer()
const { toneMode } = storeToRefs(useToneModeStore())
setToneMode(toneMode.value)

const chips = computed(() => scaleNoteChips(props.takeKey, props.notesUsed))
const sameNotesNames = computed(() =>
  new Intl.ListFormat(locale.value, { type: 'unit' }).format(
    props.takeKey.familiarTwins.map(({ root, mode }) => scaleName(root, mode)),
  ),
)
/* The closing root is the eighth note played, and it lights the first tag again. */
const soundingChipIndex = computed(() =>
  currentPlayingIndex.value < 0
    ? -1
    : currentPlayingIndex.value % chips.value.length,
)

function chipSeverity(index: number, isSung: boolean) {
  if (index === soundingChipIndex.value) return 'contrast'

  return isSung ? undefined : 'secondary'
}

function toggleScale() {
  if (isPlayingSequence.value) {
    stopSequence()

    return
  }

  emit('play')
  const rootMidi = scalePreviewRootMidi(props.takeKey.root, props.notesUsed)
  void playSequence(
    buildScale(rootMidi, props.takeKey.mode),
    SCALE_NOTE_INTERVAL_MS,
  )
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    data-testid="take-key-scale"
    :data-playing="isPlayingSequence"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-col gap-1 text-(--p-text-muted-color)">
        <p class="text-sm" data-testid="notes-used-key">
          {{
            t('voiceRecorder.notes.likelyKey', {
              key: scaleName(takeKey.root, takeKey.mode),
            })
          }}
        </p>
        <p
          v-if="sameNotesNames"
          class="flex flex-wrap gap-1 text-xs"
          data-testid="notes-used-same-notes"
        >
          <span>{{ t('scaleDetector.sameNotes') }}</span>
          <span>{{ sameNotesNames }}</span>
        </p>
      </div>
      <PrimeButton
        v-if="isPlayingSequence"
        :label="t('generic.stop')"
        size="small"
        severity="danger"
        rounded
        data-testid="take-key-scale-stop"
        @click="toggleScale"
      />
      <PrimeButton
        v-else
        :label="t('voiceRecorder.notes.playScale')"
        size="small"
        severity="secondary"
        rounded
        data-testid="take-key-scale-play"
        @click="toggleScale"
      />
    </div>
    <ol class="flex flex-wrap gap-1" dir="ltr">
      <li
        v-for="(chip, index) in chips"
        :key="chip.pitchClass"
        data-testid="take-key-scale-note"
        :data-sung="chip.isSung"
        :data-sounding="index === soundingChipIndex"
      >
        <PrimeTag
          :value="chip.label"
          :severity="chipSeverity(index, chip.isSung)"
        />
      </li>
    </ol>
    <p class="text-xs text-(--p-text-muted-color)">
      {{ t('voiceRecorder.notes.sungHint') }}
    </p>
  </div>
</template>
