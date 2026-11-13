<script setup lang="ts">
/*
 * The heading every program page opens with: its name, and optionally one
 * line saying what to do. One component so size and spacing can't drift
 * between programs — see "Program Header" in docs/product/design-rules.md.
 */
type Props = {
  /* Key from programs.ts — the title is the name on the program's card */
  programKey: string
  subtitle?: string
  /* Hides the subtitle but keeps its space, so an end screen can drop the
   * how-to-play line without moving everything below it */
  isSubtitleHidden?: boolean
  /* Appended to the name — test pages mark themselves with it */
  titleSuffix?: string
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  isSubtitleHidden: false,
  titleSuffix: '',
})

const { t } = useI18n()

const title = computed(() => {
  const name = t(`home.programs.${props.programKey}.name`)

  return props.titleSuffix ? `${name} ${props.titleSuffix}` : name
})
</script>

<template>
  <header class="flex flex-col items-center gap-1 text-center">
    <h1 class="text-2xl font-semibold">{{ title }}</h1>
    <p
      v-if="subtitle"
      class="text-sm text-(--p-text-muted-color)"
      :class="{ invisible: isSubtitleHidden }"
      :aria-hidden="isSubtitleHidden || undefined"
      :data-hidden="isSubtitleHidden"
      data-testid="program-subtitle"
    >
      {{ subtitle }}
    </p>
  </header>
</template>
