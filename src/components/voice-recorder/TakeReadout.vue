<script setup lang="ts">
import type { TakeAnalysis } from './analyzeTake'

type Props = {
  analysis: TakeAnalysis
}

const props = defineProps<Props>()

function round(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : value.toFixed(2)
}

const rows = computed(() => {
  const { tuning, quality, notes, profile, rating, soundGateDb } =
    props.analysis

  return [
    ['Notes', String(notes.length)],
    ['Slides merged', String(notes.filter((note) => note.hasSlideIn).length)],
    ['Tuning offset (¢)', round(tuning.offsetCents)],
    ['Drift (¢)', round(tuning.driftCents)],
    ['Sound gate (dB)', round(soundGateDb)],
    ['Voiced (s)', round(quality.voicedMs / 1000)],
    ['Active (s)', round(quality.activeMs / 1000)],
    ['Voiced share', round(profile?.voicedShare)],
    ['Onsets per second', round(profile?.onsetsPerSecond)],
    ...(profile?.axes ?? []).map((axis) => [
      `Axis: ${axis.key}`,
      round(axis.value),
    ]),
    ['Overall', round(rating?.overall)],
    ['Centring', round(rating?.centring)],
    ['Steadiness', round(rating?.steadiness)],
    ['Stay in key', round(rating?.stayInKey)],
    ['Vibrato share', round(rating?.vibratoShare)],
    ['Clean start share', round(rating?.cleanStartShare)],
    ['Median clarity', round(rating?.medianClarity)],
  ]
})
</script>

<template>
  <section class="flex flex-col gap-2" data-testid="take-readout">
    <h2 class="text-sm font-semibold">Raw numbers (Test)</h2>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 text-xs tabular-nums">
      <template v-for="[label, value] in rows" :key="label">
        <dt class="text-(--p-text-muted-color)">{{ label }}</dt>
        <dd>{{ value }}</dd>
      </template>
    </dl>
  </section>
</template>
