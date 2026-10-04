<script setup lang="ts">
import { refAutoReset } from '@vueuse/core'

type Props = {
  abc: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const exportRef = ref<HTMLElement | null>(null)

/* How long the Copy button reads "Copied" — same as the piano note log. */
const COPIED_FEEDBACK_MS = 1500
const isCopied = refAutoReset(false, COPIED_FEEDBACK_MS)

async function copyAbc() {
  try {
    await navigator.clipboard.writeText(props.abc)
    isCopied.value = true
  } catch {
    /* No clipboard access: select the text so the system copy shortcut works. */
    exportRef.value?.querySelector('textarea')?.select()
  }
}
</script>

<template>
  <div ref="exportRef" class="flex w-full flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <label
        for="song-recorder-abc"
        class="text-sm text-(--p-text-muted-color)"
      >
        {{ t('songRecorder.abcLabel') }}
      </label>
      <PrimeButton
        severity="secondary"
        size="small"
        :icon="isCopied ? 'pi pi-check' : 'pi pi-copy'"
        :label="isCopied ? t('generic.copied') : t('generic.copy')"
        data-testid="song-recorder-abc-copy"
        @click="copyAbc"
      />
    </div>

    <PrimeTextarea
      id="song-recorder-abc"
      :modelValue="abc"
      readonly
      rows="7"
      class="w-full font-mono text-sm"
      spellcheck="false"
      data-testid="song-recorder-abc"
    />
  </div>
</template>
