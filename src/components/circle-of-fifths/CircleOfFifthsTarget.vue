<script setup lang="ts">
import type { HopDirection, Solfege, SungState } from './useCircleOfFifthsGame'

defineProps<{
  keyLabel: string
  solfege: Solfege
  /* Off in the walk, where it's the same syllable every hop and the ladder
   * already shows it — the note to sing takes its place as the big line */
  showSolfege: boolean
  noteLabel: string
  hopDirection: HopDirection | null
  sungLabel: string | null
  sungState: SungState | null
  isCorrect: boolean
  showTooLow: boolean
  showTooHigh: boolean
  /* The chord the last lit key played; isNext marks the note to sing next,
   * isGuide the chord note a half step below it (MI, when going fourths) */
  chordNotes: readonly { label: string; isNext: boolean; isGuide: boolean }[]
  isChordRinging: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center leading-tight">
    <span class="text-[3.2cqi] text-(--p-text-muted-color)">{{
      keyLabel
    }}</span>
    <span
      v-if="showSolfege"
      class="text-[8cqi] font-bold transition-colors"
      :class="isCorrect ? 'text-(--p-green-400)' : 'text-(--p-text-color)'"
      data-testid="circle-target-solfege"
      >{{ solfege }}</span
    >
    <span
      class="tabular-nums"
      :class="
        showSolfege
          ? 'text-[3.6cqi] text-(--p-text-muted-color)'
          : [
              'text-[7cqi] font-bold transition-colors',
              isCorrect ? 'text-(--p-green-400)' : 'text-(--p-text-color)',
            ]
      "
      data-testid="circle-target-note"
      :data-correct="isCorrect"
    >
      <span
        v-if="hopDirection"
        class="font-bold text-(--p-text-color)"
        data-testid="circle-target-hop"
        :data-direction="hopDirection"
        :title="
          hopDirection === 'up'
            ? t('circleOfFifths.hopUp')
            : t('circleOfFifths.hopDown')
        "
        >{{ hopDirection === 'up' ? '↑' : '↓' }}</span
      >
      {{ noteLabel }}
    </span>

    <!-- Always laid out so its height is reserved: fading in and out never
      moves the 🎤 line below -->
    <span
      class="text-[3.6cqi] whitespace-nowrap text-(--p-text-muted-color) transition-opacity duration-300 motion-reduce:transition-none"
      :class="isChordRinging ? 'opacity-100' : 'opacity-0'"
      :aria-hidden="!isChordRinging"
      data-testid="circle-target-chord"
      :data-visible="isChordRinging"
    >
      <template v-for="(note, index) in chordNotes" :key="index">
        <span v-if="index > 0" class="mx-[0.8cqi]">·</span>
        <span
          :class="{
            'font-bold text-(--p-text-color)': note.isNext || note.isGuide,
          }"
          :data-next="note.isNext"
          :data-guide="note.isGuide"
          >{{ note.label }}<template v-if="note.isGuide">↗</template></span
        >
      </template>
      <span v-if="chordNotes.length === 0">&nbsp;</span>
    </span>

    <!-- What the singer is on now; the hint arrow lives here, away from the
      hop arrow, so the two never read as one -->
    <CircleOfFifthsSungNote
      class="mt-[0.8cqi]"
      :sungLabel="sungLabel"
      :sungState="sungState"
      :showTooLow="showTooLow"
      :showTooHigh="showTooHigh"
    />
  </div>
</template>
