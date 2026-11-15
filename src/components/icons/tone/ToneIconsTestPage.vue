<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { TONE_MODE_ICONS } from './toneModeIcons'

const modes = Object.keys(TONE_MODE_ICONS) as ToneMode[]

/* Dropdown size, select trigger, larger UI, detail check */
const iconSizeClasses = ['size-4', 'size-5', 'size-6', 'size-10']

const selectedMode = ref<ToneMode>('flute')
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
    <h1 class="text-2xl font-semibold">Tone icons (Test)</h1>

    <ToneModeSelect v-model="selectedMode" class="self-start" />

    <ul class="flex flex-col gap-2">
      <li
        v-for="mode in modes"
        :key="mode"
        :data-mode="mode"
        class="flex items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-2"
      >
        <ToneModeIcon
          v-for="sizeClass in iconSizeClasses"
          :key="sizeClass"
          :mode="mode"
          :class="[sizeClass, 'shrink-0']"
        />
        <span class="text-sm">{{ mode }}</span>
      </li>
    </ul>
  </div>
</template>
