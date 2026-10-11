<script setup lang="ts">
import {
  A4_FREQUENCY,
  toAccidentalGlyph,
  type NoteInfo,
} from '@/utils/noteUtils'
import { useReferencePitchMatch } from './useReferencePitchMatch'

type Props = {
  noteInfo: NoteInfo | null
  isClean: boolean
  isListening: boolean
  start: () => void | Promise<void>
}

const props = defineProps<Props>()

/* A4 in Hz — persisted by the page via useReferencePitch() */
const referenceA4 = defineModel<number>({ required: true })

const { t, locale } = useI18n()

const popover = ref<{ toggle: (event: Event) => void; hide: () => void }>()
const view = ref<'adjust' | 'match'>('adjust')

const isDefault = computed(() => referenceA4.value === A4_FREQUENCY)

const formattedHz = computed(() =>
  formatReferencePitch(referenceA4.value, locale.value),
)

const centsFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { signDisplay: 'exceptZero' }),
)

const formattedCentsFrom440 = computed(() =>
  centsFormatter.value.format(centsFromConcertPitch(referenceA4.value)),
)

function setReferencePitch(hz: number) {
  referenceA4.value = clampReferencePitch(hz)
}

function stepReferencePitch(direction: 1 | -1) {
  /* Snap to the whole Hz first, so 433.2 steps to 434 / 433 rather than 434.2 */
  const whole =
    direction === 1
      ? Math.floor(referenceA4.value)
      : Math.ceil(referenceA4.value)
  setReferencePitch(whole + direction * REFERENCE_PITCH_BUTTON_STEP)
}

const sliderValue = computed({
  get: () => referenceA4.value,
  set: (hz: number | number[]) =>
    setReferencePitch(Array.isArray(hz) ? hz[0] : hz),
})

const match = useReferencePitchMatch({
  noteInfo: () => props.noteInfo,
  isClean: () => props.isClean,
  referenceA4,
})

async function openMatch() {
  view.value = 'match'
  match.begin()
  if (!props.isListening) await props.start()
}

function retryMatch() {
  match.begin()
}

function useMatch() {
  if (match.resultHz.value === null) return

  setReferencePitch(match.resultHz.value)
  closeMatch()
}

function closeMatch() {
  match.cancel()
  view.value = 'adjust'
}

function togglePopover(event: Event) {
  popover.value?.toggle(event)
}

function onPopoverHide() {
  closeMatch()
}

/* SVG ring geometry: r 34 inside an 84 viewBox leaves room for the 6px stroke */
const RING_RADIUS = 34
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const ringDashOffset = computed(
  () => RING_CIRCUMFERENCE * (1 - match.progress.value),
)

const liveNoteLabel = computed(() =>
  props.noteInfo && props.isClean
    ? toAccidentalGlyph(props.noteInfo.note)
    : '–',
)

const liveCentsLabel = computed(() =>
  match.medianCents.value === null
    ? ''
    : `${centsFormatter.value.format(Math.round(match.medianCents.value))}¢`,
)

const formattedEstimate = computed(() =>
  match.estimateHz.value === null
    ? null
    : formatReferencePitch(match.estimateHz.value, locale.value),
)
</script>

<template>
  <PrimeButton
    :severity="isDefault ? 'secondary' : 'warn'"
    variant="outlined"
    size="small"
    rounded
    class="tabular-nums"
    :data-default="isDefault"
    data-testid="reference-pitch-chip"
    :aria-label="`${t('tuner.referencePitch.title')}: ${t('tuner.referencePitch.chip', { hz: formattedHz })}`"
    @click="togglePopover"
  >
    {{ t('tuner.referencePitch.chip', { hz: formattedHz }) }}
  </PrimeButton>

  <PrimePopover
    ref="popover"
    class="reference-pitch-popover"
    @hide="onPopoverHide"
  >
    <div
      class="w-64 max-w-[calc(100vw-4rem)]"
      data-testid="reference-pitch-panel"
    >
      <template v-if="view === 'adjust'">
        <div class="reference-pitch-title">
          {{ t('tuner.referencePitch.title') }}
        </div>

        <div class="mt-3 flex items-center justify-between gap-2">
          <PrimeButton
            icon="pi pi-minus"
            severity="secondary"
            rounded
            :disabled="referenceA4 <= MIN_REFERENCE_PITCH"
            :aria-label="t('tuner.referencePitch.lower')"
            @click="stepReferencePitch(-1)"
          />
          <div class="text-center">
            <div class="text-3xl leading-none font-bold tabular-nums">
              {{ formattedHz }}
              <span class="text-sm font-normal text-(--p-text-muted-color)">{{
                t('generic.hz')
              }}</span>
            </div>
            <div
              class="mt-1 text-xs text-(--p-text-muted-color) tabular-nums"
              data-testid="reference-pitch-cents"
            >
              {{
                isDefault
                  ? t('tuner.referencePitch.concertPitch')
                  : t('tuner.referencePitch.versus440', {
                      cents: formattedCentsFrom440,
                    })
              }}
            </div>
          </div>
          <PrimeButton
            icon="pi pi-plus"
            severity="secondary"
            rounded
            :disabled="referenceA4 >= MAX_REFERENCE_PITCH"
            :aria-label="t('tuner.referencePitch.higher')"
            @click="stepReferencePitch(1)"
          />
        </div>

        <PrimeSlider
          v-model="sliderValue"
          :min="MIN_REFERENCE_PITCH"
          :max="MAX_REFERENCE_PITCH"
          :step="REFERENCE_PITCH_STEP"
          :aria-label="t('tuner.referencePitch.title')"
          class="mt-5"
        />
        <div
          class="mt-2 flex justify-between text-xs text-(--p-text-muted-color) tabular-nums"
        >
          <span>{{ MIN_REFERENCE_PITCH }}</span>
          <span>{{ A4_FREQUENCY }}</span>
          <span>{{ MAX_REFERENCE_PITCH }}</span>
        </div>

        <div class="mt-3 flex flex-wrap justify-center gap-1.5">
          <PrimeButton
            v-for="preset in REFERENCE_PITCH_PRESETS"
            :key="preset"
            :severity="referenceA4 === preset ? 'primary' : 'secondary'"
            :variant="referenceA4 === preset ? undefined : 'outlined'"
            size="small"
            rounded
            class="min-w-12 tabular-nums"
            :aria-pressed="referenceA4 === preset"
            @click="setReferencePitch(preset)"
          >
            {{ preset }}
          </PrimeButton>
        </div>

        <div class="mt-4 flex flex-col gap-1.5">
          <PrimeButton
            icon="pi pi-headphones"
            rounded
            :label="t('tuner.referencePitch.match')"
            data-testid="reference-pitch-match"
            @click="openMatch"
          />
          <PrimeButton
            severity="secondary"
            variant="text"
            rounded
            :disabled="isDefault"
            :label="t('tuner.referencePitch.reset')"
            @click="setReferencePitch(A4_FREQUENCY)"
          />
        </div>
      </template>

      <template v-else>
        <div class="flex items-center gap-1">
          <PrimeButton
            icon="pi pi-arrow-left rtl:rotate-180"
            severity="secondary"
            variant="text"
            rounded
            size="small"
            class="min-h-0"
            :aria-label="t('generic.back')"
            @click="closeMatch"
          />
          <div class="reference-pitch-title">
            {{ t('tuner.referencePitch.match') }}
          </div>
        </div>
        <p class="mt-1 text-sm text-(--p-text-muted-color)">
          {{ t('tuner.referencePitch.matchHint') }}
        </p>

        <div class="mt-3 flex items-center gap-4">
          <svg
            width="84"
            height="84"
            viewBox="0 0 84 84"
            class="flex-none"
            role="progressbar"
            :aria-valuenow="Math.round(match.progress.value * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="t('tuner.referencePitch.holdSteady')"
          >
            <circle
              cx="42"
              cy="42"
              :r="RING_RADIUS"
              fill="none"
              stroke="var(--p-content-border-color)"
              stroke-width="6"
            />
            <circle
              cx="42"
              cy="42"
              :r="RING_RADIUS"
              fill="none"
              stroke="var(--p-primary-color)"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="RING_CIRCUMFERENCE"
              :stroke-dashoffset="ringDashOffset"
              transform="rotate(-90 42 42)"
              class="reference-pitch-ring"
            />
            <text
              x="42"
              y="41"
              text-anchor="middle"
              font-size="20"
              font-weight="700"
              fill="var(--p-text-color)"
            >
              {{ liveNoteLabel }}
            </text>
            <text
              x="42"
              y="57"
              text-anchor="middle"
              font-size="11"
              fill="var(--p-text-muted-color)"
            >
              {{ liveCentsLabel }}
            </text>
          </svg>

          <div class="text-sm text-(--p-text-muted-color)" aria-live="polite">
            <div>
              {{
                match.resultHz.value === null
                  ? t('tuner.referencePitch.holdSteady')
                  : t('tuner.referencePitch.matchFound')
              }}
            </div>
            <div
              v-if="formattedEstimate"
              class="text-(--p-text-color) tabular-nums"
              data-testid="reference-pitch-estimate"
            >
              {{
                t('tuner.referencePitch.estimate', { hz: formattedEstimate })
              }}
            </div>
          </div>
        </div>

        <div class="mt-4 flex gap-1.5">
          <PrimeButton
            severity="secondary"
            rounded
            class="flex-1"
            :label="t('tuner.referencePitch.retry')"
            @click="retryMatch"
          />
          <PrimeButton
            rounded
            class="flex-1"
            :disabled="match.resultHz.value === null"
            :label="t('tuner.referencePitch.use')"
            data-testid="reference-pitch-use"
            @click="useMatch"
          />
        </div>
      </template>
    </div>
  </PrimePopover>
</template>

<style scoped>
.reference-pitch-title {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.reference-pitch-ring {
  transition: stroke-dashoffset 0.1s linear;
}

/*
 * PrimeVue aligns the popover to the chip's start edge and, when that would
 * overflow, pins it flush to the viewport edge — on a phone it touches the
 * screen. The chip is always centred on the page, so centring the popover
 * keeps it under the chip with a gutter. `translate` (not `transform`) leaves
 * PrimeVue's scale-in animation alone; the arrow still lines up because
 * PrimeVue measures the rendered position.
 */
:global(.reference-pitch-popover) {
  left: 50% !important;
  translate: -50% 0;
  max-width: calc(100vw - 2rem);
}

@media (prefers-reduced-motion: reduce) {
  .reference-pitch-ring {
    transition: none;
  }
}
</style>
