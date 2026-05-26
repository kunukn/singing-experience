import { acquireMicStream, hasActiveMicGrant } from '@/utils/microphoneStream'

type MicPermissionState = PermissionState | null

export function useMicrophonePermission() {
  const state = ref<MicPermissionState>(null)

  let permissionStatus: PermissionStatus | null = null

  async function refreshState() {
    if (permissionStatus) {
      state.value = permissionStatus.state

      /* permissions.query says 'prompt' on iOS even with an active grant — verify via labels */
      if (state.value !== 'granted' && (await hasActiveMicGrant())) {
        state.value = 'granted'
      }

      return
    }

    state.value = (await hasActiveMicGrant()) ? 'granted' : 'prompt'
  }

  function onPermissionChange() {
    void refreshState()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void refreshState()
  }

  onMounted(async () => {
    try {
      permissionStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      })
      permissionStatus.addEventListener('change', onPermissionChange)
    } catch {
      /* Permissions API not supported (e.g. older Safari) — fall back to enumerateDevices */
    }

    await refreshState()
    navigator.mediaDevices?.addEventListener?.(
      'devicechange',
      onPermissionChange,
    )
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    if (permissionStatus) {
      permissionStatus.removeEventListener('change', onPermissionChange)
    }

    navigator.mediaDevices?.removeEventListener?.(
      'devicechange',
      onPermissionChange,
    )
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  async function requestPermission() {
    if (state.value === 'granted') return

    try {
      const stream = await acquireMicStream({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      state.value = 'granted'
    } catch {
      state.value = 'denied'
    }
  }

  return { state: readonly(state), requestPermission }
}
