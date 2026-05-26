/* Suppress preview indicator for this long after a tone is played */
const IDLE_DEAF_PERIOD_MS = 1000

type IdlePreviewOptions = {
  isGameActive: Ref<boolean> | ComputedRef<boolean>
  isPlayingSequence?: Ref<boolean> | ComputedRef<boolean>
  isEnabled?: Ref<boolean> | WritableComputedRef<boolean>
}

export function useIdlePreview(options: IdlePreviewOptions) {
  const { isGameActive, isPlayingSequence, isEnabled } = options

  const { state: micPermission, requestPermission } = useMicrophonePermission()

  const detection = usePitchDetection()

  const isDeaf = ref(false)
  let deafTimer: ReturnType<typeof setTimeout> | null = null

  function triggerDeafPeriod() {
    if (deafTimer) clearTimeout(deafTimer)

    isDeaf.value = true
    deafTimer = setTimeout(() => {
      isDeaf.value = false
      deafTimer = null
    }, IDLE_DEAF_PERIOD_MS)
  }

  const previewMidi = computed(() => {
    if (isDeaf.value || isPlayingSequence?.value) return null
    if (isEnabled !== undefined && !isEnabled.value) return null

    return detection.noteInfo.value?.midiNote ?? null
  })

  const previewFrequency = computed(() => {
    if (previewMidi.value === null) return null

    return detection.frequency.value
  })

  /* Note label shown only when the detected pitch is clean */
  const previewNoteLabel = computed(() => {
    if (previewMidi.value === null) return null
    if (!detection.isClean.value) return null

    const info = detection.noteInfo.value
    if (!info) return null

    return `${info.note}${info.octave}`
  })

  const isPreviewListening = computed(() => detection.isListening.value)

  const shouldListen = computed(
    () =>
      !isGameActive.value &&
      micPermission.value === 'granted' &&
      (isEnabled === undefined || isEnabled.value),
  )

  watch(
    shouldListen,
    async (active) => {
      if (active) {
        await detection.start()
      } else {
        detection.stop()
      }
    },
    { immediate: true },
  )

  /* Request microphone permission when the user toggles preview on */
  if (isEnabled !== undefined) {
    watch(
      () => isEnabled.value,
      async (enabled) => {
        if (enabled && micPermission.value !== 'granted') {
          await requestPermission()
          if (micPermission.value === 'denied') {
            isEnabled.value = false
          }
        }
      },
    )
  }

  onUnmounted(() => {
    detection.stop()
    if (deafTimer) {
      clearTimeout(deafTimer)
      deafTimer = null
    }
  })

  return {
    previewMidi,
    previewFrequency,
    previewNoteLabel,
    isPreviewListening,
    micPermission,
    triggerDeafPeriod,
    /* Raw detection refs — callers that want stabilization can pipe these
     * through useStablePitch. Exposed as read-only to prevent external mutation. */
    rawNoteInfo: detection.noteInfo,
    rawIsClean: detection.isClean,
    rawFrequency: detection.frequency,
    rawClarity: detection.clarity,
  }
}
