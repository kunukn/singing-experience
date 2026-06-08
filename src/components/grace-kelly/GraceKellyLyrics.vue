<script setup lang="ts">
import { GRACE_KELLY_LYRIC_LINES } from './graceKellyLyrics'

type Props = {
  activeSyllableIndex: number
}

defineProps<Props>()

/* Lyric lines with each syllable tagged with its flat reading-order index, so
 * the template can match against activeSyllableIndex without a running counter. */
const lyricLines = computed(() => {
  let flatIndex = 0

  return GRACE_KELLY_LYRIC_LINES.map((line) =>
    line.map((word) =>
      word.map((syllable) => ({ ...syllable, flatIndex: flatIndex++ })),
    ),
  )
})
</script>

<template>
  <div class="my-4">
    <p v-for="(line, lineIndex) in lyricLines" :key="lineIndex">
      <template v-for="(word, wordIndex) in line" :key="wordIndex">
        {{ wordIndex > 0 ? ' ' : '' }}
        <span
          v-for="syllable in word"
          :key="syllable.flatIndex"
          :class="{
            'text-(--p-green-600) dark:text-(--p-green-400)':
              syllable.flatIndex === activeSyllableIndex,
          }"
          >{{ syllable.text }}</span
        >
      </template>
    </p>
  </div>
</template>
