<script setup lang="ts">
import type { NoteInfo } from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'

type Props = {
  noteInfo: NoteInfo | null
  isClean: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()
const { isDark } = useDarkMode()

const noteColor = computed(() =>
  props.noteInfo && props.isClean
    ? cleanTextColor(props.noteInfo.cents, isDark.value)
    : null,
)
</script>

<template>
  <div class="flex min-w-38 flex-col items-start justify-center">
    <div
      v-if="noteInfo && isClean"
      class="transition-colors duration-150"
      :style="{ color: noteColor ?? undefined }"
    >
      <span class="text-7xl font-bold tracking-tight md:text-8xl">
        {{ noteInfo.note }}
      </span>
      <span class="mt-2 inline-block align-top text-4xl font-light">
        {{ noteInfo.octave }}
      </span>
    </div>
    <div v-else class="text-(--p-text-muted-color)">
      <p class="text-sm">
        {{ t('pitchDetector.listening') }}
      </p>
    </div>

    <div
      v-if="noteInfo && isClean"
      class="mt-1 flex items-center gap-1 text-xs tabular-nums"
      :style="{ color: noteColor ?? undefined }"
    >
      <span>{{ t('pitchDetector.cents') }}</span>
      <span class="min-w-6 text-end tabular-nums">
        {{ noteInfo.cents > 0 ? '+' : '' }}{{ noteInfo.cents }}
      </span>
    </div>
  </div>
</template>
