<script setup lang="ts">
import { refAutoReset, useLocalStorage } from '@vueuse/core'

export type AbcEditorMessage = {
  severity: 'error' | 'warn'
  text: string
}

type Props = {
  /* Off mid-take and during playback — importing replaces the take. */
  isImportDisabled: boolean
  /* Result of the last import: why it failed, or what it simplified. */
  message: AbcEditorMessage | null
  /* ABC of the sheet on screen; null before there's a take to restore. */
  sheetAbc: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  import: []
  /* The user changed the text (typed or cleared) — the last message is stale. */
  edit: []
}>()

/* The ABC text: the take's notation after recording or import, and the paste
 * box before an import. Editable so the user can tweak a note and re-import. */
const text = defineModel<string>({ required: true })

const { t } = useI18n()

const editorRef = ref<HTMLElement | null>(null)

/* Most singers never touch ABC, so the box starts folded away; anyone who
 * opens it keeps it open on later visits. */
const isExpanded = useLocalStorage('syng.songRecorderAbcExpanded', false)

/* Opening the box is usually a step towards pasting, so land the caret there. */
async function toggleExpanded() {
  isExpanded.value = !isExpanded.value
  if (!isExpanded.value) return

  await nextTick()
  editorRef.value?.querySelector('textarea')?.focus()
}

const isEmpty = computed(() => text.value.trim() === '')

/* How long the Copy button reads "Copied" — same as the piano note log. */
const COPIED_FEEDBACK_MS = 1500
const isCopied = refAutoReset(false, COPIED_FEEDBACK_MS)

async function copyAbc() {
  try {
    await navigator.clipboard.writeText(text.value)
    isCopied.value = true
  } catch {
    /* No clipboard access: select the text so the system copy shortcut works. */
    editorRef.value?.querySelector('textarea')?.select()
  }
}

function clearText() {
  text.value = ''
  emit('edit')
}

/* Puts the sheet's notation back — undoes a stray Clear or edits. */
function restoreFromSheet() {
  if (props.sheetAbc === null) return

  text.value = props.sheetAbc
  emit('edit')
}

const isFromSheetDisabled = computed(
  () => props.sheetAbc === null || text.value === props.sheetAbc,
)
</script>

<template>
  <div ref="editorRef" class="flex w-full flex-col gap-2">
    <PrimeButton
      severity="secondary"
      text
      size="small"
      :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
      :label="t('songRecorder.abcLabel')"
      :aria-expanded="isExpanded"
      aria-controls="song-recorder-abc-body"
      class="self-start"
      data-testid="song-recorder-abc-toggle"
      @click="toggleExpanded"
    />

    <div
      v-show="isExpanded"
      id="song-recorder-abc-body"
      class="flex flex-col gap-2"
    >
      <PrimeTextarea
        id="song-recorder-abc"
        v-model="text"
        rows="7"
        class="w-full font-mono text-sm"
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
        :aria-label="t('songRecorder.abcLabel')"
        :placeholder="t('songRecorder.abcPlaceholder')"
        data-testid="song-recorder-abc"
        @input="emit('edit')"
      />

      <!--
        Clear sits alone at the far start, as a quiet text button, so a reach for
        Copy can't land on it; From sheet can undo it whenever there's a take.
      -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <PrimeButton
          severity="secondary"
          text
          size="small"
          icon="pi pi-trash"
          :label="t('generic.clear')"
          :disabled="isEmpty"
          data-testid="song-recorder-abc-clear"
          @click="clearText"
        />
        <div class="flex flex-wrap items-center gap-2">
          <PrimeButton
            severity="secondary"
            size="small"
            icon="pi pi-replay"
            :label="t('songRecorder.fromSheet')"
            :title="t('songRecorder.fromSheetHint')"
            :disabled="isFromSheetDisabled"
            data-testid="song-recorder-abc-from-sheet"
            @click="restoreFromSheet"
          />
          <PrimeButton
            severity="secondary"
            size="small"
            :icon="isCopied ? 'pi pi-check' : 'pi pi-copy'"
            :label="isCopied ? t('generic.copied') : t('generic.copy')"
            :disabled="isEmpty"
            data-testid="song-recorder-abc-copy"
            @click="copyAbc"
          />
          <PrimeButton
            size="small"
            icon="pi pi-upload"
            :label="t('songRecorder.import')"
            :disabled="props.isImportDisabled || isEmpty"
            data-testid="song-recorder-abc-import"
            @click="emit('import')"
          />
        </div>
      </div>

      <PrimeMessage
        v-if="props.message"
        :severity="props.message.severity"
        size="small"
        data-testid="song-recorder-abc-message"
        :data-severity="props.message.severity"
      >
        {{ props.message.text }}
      </PrimeMessage>
    </div>
  </div>
</template>
