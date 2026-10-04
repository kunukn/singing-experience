<script setup lang="ts">
import { refAutoReset } from '@vueuse/core'

/* The log text. Editable, so the user can fix a wrong note or break phrases
 * onto lines; the page appends each played note to the end. */
const text = defineModel<string>({ required: true })

const { t } = useI18n()

const isEmpty = computed(() => text.value === '')

const logRef = ref<HTMLElement | null>(null)

function findTextarea() {
  return logRef.value?.querySelector('textarea')
}

/* How long the Copy button reads "Copied". That swap is the whole
 * confirmation — the app has no success toast. */
const COPIED_FEEDBACK_MS = 1500
const isCopied = refAutoReset(false, COPIED_FEEDBACK_MS)

async function copyLog() {
  try {
    await navigator.clipboard.writeText(text.value)
    isCopied.value = true
  } catch {
    /* No clipboard access (permission refused, or a non-secure origin where
     * navigator.clipboard is undefined): select the text instead, so the
     * system copy shortcut still works. */
    findTextarea()?.select()
  }
}

/* Keep the newest note in view once the log outgrows the box — but only for
 * notes the piano appended. Typing must not yank the view to the bottom, and
 * focus can't tell the two apart: Safari leaves the textarea focused when a
 * piano key is clicked. flush 'post' so scrollHeight already includes the
 * appended text. */
let isUserEdit = false
watch(
  text,
  () => {
    if (isUserEdit) {
      isUserEdit = false

      return
    }

    const textarea = findTextarea()
    if (!textarea) return

    textarea.scrollTop = textarea.scrollHeight
  },
  { flush: 'post' },
)
</script>

<template>
  <div ref="logRef" class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <PrimeButton
        severity="secondary"
        size="small"
        icon="pi pi-trash"
        :label="t('generic.clear')"
        :disabled="isEmpty"
        data-testid="piano-note-log-clear"
        @click="text = ''"
      />
      <PrimeButton
        severity="secondary"
        size="small"
        :icon="isCopied ? 'pi pi-check' : 'pi pi-copy'"
        :label="isCopied ? t('generic.copied') : t('generic.copy')"
        :disabled="isEmpty"
        data-testid="piano-note-log-copy"
        @click="copyLog"
      />
    </div>

    <PrimeTextarea
      v-model="text"
      rows="4"
      class="w-full"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      :aria-label="t('generic.noteLogLabel')"
      data-testid="piano-note-log"
      @input="isUserEdit = true"
    />
  </div>
</template>
