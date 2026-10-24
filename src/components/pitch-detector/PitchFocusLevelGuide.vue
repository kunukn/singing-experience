<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import {
  unrefElement,
  useElementVisibility,
  useLocalStorage,
} from '@vueuse/core'
import type { FocusLevel } from './focusLevel'
import PitchFocusLevelLadder from './PitchFocusLevelLadder.vue'

type Props = {
  level: FocusLevel | null
}

defineProps<Props>()

const { t } = useI18n()

const popover = ref<{
  toggle: (event: Event) => void
  show: (event: Pick<Event, 'currentTarget'>) => void
}>()
const button = useTemplateRef<ComponentPublicInstance>('button')

function togglePopover(event: Event) {
  popover.value?.toggle(event)
}

/* Shown once, the first time the Focus tab is opened. Marked seen as it
 * opens rather than on dismiss, so a reload mid-read doesn't show it again. */
const hasSeenGuide = useLocalStorage('syng.focusLevelGuideSeen', false)

/* Both tab panels stay mounted (v-show), so mounting doesn't mean the tab is
 * open. A button under a display: none panel reports not visible, which
 * keeps the tab state out of this component. */
const isButtonVisible = useElementVisibility(button)

const stopFirstVisitWatch = watch(isButtonVisible, async (isVisible) => {
  if (!isVisible || hasSeenGuide.value) return

  stopFirstVisitWatch()
  hasSeenGuide.value = true
  await nextTick()
  const buttonElement = unrefElement(button)
  /* PrimeVue anchors to `currentTarget` and ignores outside clicks on it, so
   * pressing ? while open still closes the popover like a normal toggle. */
  if (buttonElement) popover.value?.show({ currentTarget: buttonElement })
})
</script>

<template>
  <div>
    <!-- Labelled at every width with its own icon: icon-only, it was a second
         ? next to the header's "How it works" and the two read as one -->
    <PrimeButton
      ref="button"
      severity="secondary"
      text
      rounded
      size="small"
      icon="pi pi-trophy"
      class="whitespace-nowrap"
      :pt="{ icon: { class: 'text-base!' } }"
      :label="t('pitchDetector.focus.guide.title')"
      data-testid="focus-level-guide"
      @click="togglePopover"
    />

    <PrimePopover ref="popover" class="focus-level-guide-popover">
      <div class="w-72 max-w-full">
        <PitchFocusLevelLadder :level="level" />
      </div>
    </PrimePopover>
  </div>
</template>

<style scoped>
/* Keeps a gutter on a phone; PrimeVue otherwise pins it flush to the edge */
:global(.focus-level-guide-popover) {
  max-width: calc(100vw - 2rem);
}
</style>
