<script setup lang="ts">
import { useLocalStorage, useMediaQuery } from '@vueuse/core'
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

const matchingSlotIndex = computed(() =>
  slots.value.findIndex((_slot, index) => isMatchingSlot(index)),
)

/* Three slot rows crowd the chart off a phone screen, so the list starts
 * collapsed there and open on wider screens. 'auto' follows the viewport until
 * the user toggles; from then on their choice sticks. */
const isPhone = useMediaQuery('(max-width: 639px)')
const storedExpanded = useLocalStorage<'auto' | 'open' | 'closed'>(
  'syng.voiceRangeSlotsExpanded',
  'auto',
)
const isExpanded = computed(() =>
  storedExpanded.value === 'auto'
    ? !isPhone.value
    : storedExpanded.value === 'open',
)

function toggleExpanded() {
  storedExpanded.value = isExpanded.value ? 'closed' : 'open'
}

const slotListId = useId()
const editorFormId = useId()

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

/* Overwriting a slot with a freshly sung range is the common edit; hidden
 * once the draft already matches, e.g. an empty slot pre-filled from it. */
const isDraftMyRange = computed(
  () =>
    draftRange.value.midiMin === props.midiMin &&
    draftRange.value.midiMax === props.midiMax,
)

function useMyRangeInDraft() {
  draftRange.value = { midiMin: props.midiMin, midiMax: props.midiMax }
}

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
    <div class="flex flex-wrap items-center gap-x-2">
      <h3>
        <PrimeButton
          severity="secondary"
          text
          size="small"
          :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
          :label="t('voiceRangeFinder.slots.title')"
          :aria-expanded="isExpanded"
          :aria-controls="slotListId"
          data-testid="range-slots-toggle"
          @click="toggleExpanded"
        />
      </h3>
      <!-- Collapsed, the slot that matches My range still says which one is in use -->
      <span
        v-if="!isExpanded && matchingSlotIndex !== -1"
        class="text-sm font-semibold tabular-nums"
        data-testid="range-slots-summary"
      >
        {{ slotLabel(matchingSlotIndex) }}
        <span dir="ltr">{{ formatRange(props.midiMin, props.midiMax) }}</span>
      </span>
    </div>
    <div
      v-show="isExpanded"
      :id="slotListId"
      class="flex flex-wrap gap-2"
      data-testid="range-slots-list"
    >
      <!--
        Slot button and its ✎ sit tight together so they read as one control.
        Both opt out of the control height and theme text size: slots are an
        optional extra and should read smaller than the Sing buttons above.
      -->
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
          class="min-h-0 py-1! text-xs! leading-tight"
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
            class="font-medium tabular-nums"
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
          class="size-6! min-h-0 min-w-0 p-0!"
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
      <!--
        A real form so Enter in the name field (or a phone's Go key) submits
        it like Save. Same label | select columns as the My range pickers.
      -->
      <form
        :id="editorFormId"
        class="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2"
        data-testid="range-slot-form"
        @submit.prevent="saveDraft"
      >
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
        <!-- type="button" so it fills the pickers instead of submitting -->
        <PrimeButton
          v-if="!isDraftMyRange"
          type="button"
          severity="secondary"
          size="small"
          rounded
          outlined
          class="col-span-2 justify-self-start"
          data-testid="range-slot-use-my-range"
          @click="useMyRangeInDraft"
        >
          <span>{{ t('voiceRangeFinder.slots.useMyRange') }}</span>
          <span class="font-semibold tabular-nums" dir="ltr">
            {{ formatRange(props.midiMin, props.midiMax) }}
          </span>
        </PrimeButton>
      </form>

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
          <!-- The footer renders outside the form; `form` links Save back to it -->
          <PrimeButton
            type="submit"
            :form="editorFormId"
            :label="t('voiceRangeFinder.slots.save')"
            size="small"
            rounded
            data-testid="range-slot-save"
          />
        </div>
      </template>
    </PrimeDialog>
  </section>
</template>
