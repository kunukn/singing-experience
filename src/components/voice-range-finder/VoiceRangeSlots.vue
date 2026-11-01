<script setup lang="ts">
import type { MidiRange } from '@/utils/normalizeVoiceRange'
import {
  useVoiceRangeSlots,
  VOICE_RANGE_SLOT_NAME_MAX_LENGTH,
} from './useVoiceRangeSlots'
import {
  formatRange,
  VOICE_RANGE_NOTE_OPTIONS,
  withHighest,
  withLowest,
} from './voiceRangeNotes'

type Props = {
  /* The current My range, to pre-fill an empty slot and mark a matching one */
  midiMin: number
  midiMax: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  applyRange: [range: MidiRange]
}>()

const { t } = useI18n()

const { slots, saveSlot, clearSlot } = useVoiceRangeSlots(
  'syng.voiceRangeSlots',
)

const defaultSlotName = (index: number) =>
  t('voiceRangeFinder.slots.slotName', { number: index + 1 })

const slotLabel = (index: number) =>
  slots.value[index]?.name || defaultSlotName(index)

const isMatchingSlot = (index: number) => {
  const slot = slots.value[index]

  return (
    !!slot && slot.midiMin === props.midiMin && slot.midiMax === props.midiMax
  )
}

/* null while the dialog is closed */
const editingIndex = ref<number | null>(null)
const draftName = ref('')
const draftRange = ref<MidiRange>({ midiMin: 0, midiMax: 0 })

const isDialogVisible = computed({
  get: () => editingIndex.value !== null,
  set: (isVisible: boolean) => {
    if (!isVisible) editingIndex.value = null
  },
})

const isEditingFilledSlot = computed(
  () => editingIndex.value !== null && !!slots.value[editingIndex.value],
)

const draftHighest = computed({
  get: () => draftRange.value.midiMax,
  set: (midi: number) => {
    draftRange.value = withHighest(draftRange.value, midi)
  },
})

const draftLowest = computed({
  get: () => draftRange.value.midiMin,
  set: (midi: number) => {
    draftRange.value = withLowest(draftRange.value, midi)
  },
})

/* An empty slot starts from My range: the usual reason to fill one is to keep
 * the range just picked or sung. */
function openEditor(index: number) {
  const slot = slots.value[index]
  draftName.value = slot?.name ?? ''
  draftRange.value = slot
    ? { midiMin: slot.midiMin, midiMax: slot.midiMax }
    : { midiMin: props.midiMin, midiMax: props.midiMax }
  editingIndex.value = index
}

/* An empty slot has nothing to apply, so a tap opens its editor instead */
function selectSlot(index: number) {
  const slot = slots.value[index]
  if (!slot) {
    openEditor(index)

    return
  }

  emit('applyRange', { midiMin: slot.midiMin, midiMax: slot.midiMax })
}

function saveDraft() {
  if (editingIndex.value === null) return

  saveSlot(editingIndex.value, { ...draftRange.value, name: draftName.value })
  editingIndex.value = null
}

function clearEditingSlot() {
  if (editingIndex.value === null) return

  clearSlot(editingIndex.value)
  editingIndex.value = null
}
</script>

<template>
  <section class="flex flex-col gap-2" data-testid="range-slots">
    <h3 class="text-xs font-medium text-(--p-text-muted-color)">
      {{ t('voiceRangeFinder.slots.title') }}
    </h3>
    <div class="flex flex-wrap gap-2">
      <!-- Slot button and its ✎ sit tight together so they read as one control -->
      <div
        v-for="(slot, index) in slots"
        :key="index"
        class="flex items-center gap-0.5"
      >
        <PrimeButton
          :severity="isMatchingSlot(index) ? undefined : 'secondary'"
          :outlined="!slot"
          size="small"
          rounded
          :aria-pressed="slot ? isMatchingSlot(index) : undefined"
          :aria-label="
            slot
              ? t('voiceRangeFinder.slots.use', {
                  name: slotLabel(index),
                  range: formatRange(slot.midiMin, slot.midiMax),
                })
              : undefined
          "
          :data-testid="`range-slot-${index + 1}`"
          :data-active="isMatchingSlot(index)"
          @click="selectSlot(index)"
        >
          <span class="max-w-28 truncate">{{ slotLabel(index) }}</span>
          <span
            class="font-semibold tabular-nums"
            :class="{ 'opacity-70': !slot }"
            dir="ltr"
          >
            {{
              slot
                ? formatRange(slot.midiMin, slot.midiMax)
                : t('voiceRangeFinder.slots.empty')
            }}
          </span>
        </PrimeButton>
        <PrimeButton
          icon="pi pi-pencil"
          severity="secondary"
          size="small"
          rounded
          text
          :aria-label="
            t('voiceRangeFinder.slots.edit', { name: slotLabel(index) })
          "
          :data-testid="`range-slot-edit-${index + 1}`"
          @click="openEditor(index)"
        />
      </div>
    </div>

    <PrimeDialog
      v-model:visible="isDialogVisible"
      modal
      :header="
        editingIndex === null
          ? ''
          : t('voiceRangeFinder.slots.edit', { name: slotLabel(editingIndex) })
      "
      class="w-80 max-w-[90vw]"
      data-testid="range-slot-dialog"
    >
      <!-- Same label | select columns as the My range pickers -->
      <div class="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2">
        <label class="col-span-2 grid grid-cols-subgrid items-center">
          <span class="text-sm">{{ t('voiceRangeFinder.slots.name') }}</span>
          <PrimeInputText
            v-model="draftName"
            size="small"
            :maxlength="VOICE_RANGE_SLOT_NAME_MAX_LENGTH"
            :placeholder="
              editingIndex === null ? '' : defaultSlotName(editingIndex)
            "
            data-testid="range-slot-name"
          />
        </label>
        <label class="col-span-2 grid grid-cols-subgrid items-center">
          <span class="text-sm">{{ t('voiceRangeFinder.highest') }}</span>
          <PrimeSelect
            v-model="draftHighest"
            :options="VOICE_RANGE_NOTE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            size="small"
            scrollHeight="300px"
            data-testid="range-slot-highest"
          />
        </label>
        <label class="col-span-2 grid grid-cols-subgrid items-center">
          <span class="text-sm">{{ t('voiceRangeFinder.lowest') }}</span>
          <PrimeSelect
            v-model="draftLowest"
            :options="VOICE_RANGE_NOTE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            size="small"
            scrollHeight="300px"
            data-testid="range-slot-lowest"
          />
        </label>
      </div>

      <template #footer>
        <div class="flex w-full items-center gap-2">
          <PrimeButton
            v-if="isEditingFilledSlot"
            :label="t('generic.clear')"
            severity="danger"
            size="small"
            rounded
            text
            data-testid="range-slot-clear"
            @click="clearEditingSlot"
          />
          <PrimeButton
            :label="t('voiceRangeFinder.cancel')"
            severity="secondary"
            size="small"
            rounded
            text
            class="ms-auto"
            @click="isDialogVisible = false"
          />
          <PrimeButton
            :label="t('voiceRangeFinder.slots.save')"
            size="small"
            rounded
            data-testid="range-slot-save"
            @click="saveDraft"
          />
        </div>
      </template>
    </PrimeDialog>
  </section>
</template>
