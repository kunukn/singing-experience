type MicPermissionState = PermissionState | null

export function useMicrophonePermission() {
  const state = ref<MicPermissionState>(null)

  let permissionStatus: PermissionStatus | null = null

  function onPermissionChange() {
    if (permissionStatus) {
      state.value = permissionStatus.state
    }
  }

  onMounted(async () => {
    try {
      permissionStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      })
      state.value = permissionStatus.state
      permissionStatus.addEventListener('change', onPermissionChange)
    } catch {
      /* Permissions API not supported (e.g. older Safari) */
    }
  })

  onUnmounted(() => {
    if (permissionStatus) {
      permissionStatus.removeEventListener('change', onPermissionChange)
    }
  })

  return { state: readonly(state) }
}
