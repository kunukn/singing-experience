import { useLocalStorage } from '@vueuse/core'

/* Exported for storageKeys.test.ts, which registers every key the app writes */
export const DARK_MODE_STORAGE_KEY = 'syng.darkMode'
const DARK_CLASS = 'p-dark'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDark = useLocalStorage(DARK_MODE_STORAGE_KEY, prefersDark)

function applyDarkMode(dark: boolean) {
  document.documentElement.classList.toggle(DARK_CLASS, dark)
}

export function useDarkMode() {
  applyDarkMode(isDark.value)
  watch(isDark, applyDarkMode)

  function toggleDark() {
    isDark.value = !isDark.value
  }

  return { isDark: readonly(isDark), toggleDark }
}
