<script setup lang="ts">
import {
  CLARITY_STEP,
  MAX_CLARITY_THRESHOLD,
  MIN_CLARITY_THRESHOLD,
} from '@/composables/useSettings'
/* Explicit import: the bundled PrimeVueResolver only knows the deprecated
 * `Sidebar`, not v4's `Drawer`, so `<PrimeDrawer>` won't auto-resolve. */
import Drawer from 'primevue/drawer'

const { t } = useI18n()
const { clarityThreshold, isPreviewEnabled, resetToDefaults } = useSettings()
const { state: micPermission } = useMicrophonePermission()
const { isDark, toggleDark } = useDarkMode()
const isRtl = useIsRtl()

const showSettings = ref(false)

/* Drawer position is physical; open from the inline-end side so it
 * mirrors correctly in RTL (Arabic). */
const drawerPosition = computed(() => (isRtl.value ? 'left' : 'right'))

const clarityPercent = computed(() => Math.round(clarityThreshold.value * 100))

function reloadPage() {
  window.location.reload()
}

function onReset() {
  resetToDefaults()

  /* Restore dark mode to the OS preference (toggleDark is a plain flip, so
   * only act when the current state differs from the preferred one). */
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (isDark.value !== prefersDark) toggleDark()
}

const appVersion = import.meta.env.VITE_APP_VERSION
</script>

<template>
  <PrimeButton
    :aria-label="t('settings.title')"
    :title="t('settings.title')"
    text
    rounded
    severity="secondary"
    size="default"
    class="aspect-square max-h-10 text-lg md:aspect-auto"
    @click="showSettings = true"
  >
    <span class="inline-flex items-center gap-2">
      <i class="pi pi-cog" />
      <span class="hidden text-sm md:inline">{{ t('generic.settings') }}</span>
    </span>
  </PrimeButton>

  <Drawer
    v-model:visible="showSettings"
    :position="drawerPosition"
    :header="t('settings.title')"
    blockScroll
    :pt="{ content: { class: 'pb-2!' } }"
  >
    <div class="flex h-full flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="relative flex flex-1 flex-col gap-6">
          <div class="flex flex-col gap-2">
            <label class="font-medium">{{ t('settings.language') }}</label>
            <LanguageSwitcher />
          </div>

          <div class="flex items-center justify-between">
            <label
              for="preview-sound-toggle"
              class="font-medium"
              :class="{ 'opacity-50': micPermission === 'denied' }"
            >
              {{ t('generic.previewSoundLabel') }}
            </label>
            <div class="flex items-center gap-2">
              <PrimeToggleSwitch
                v-model="isPreviewEnabled"
                inputId="preview-sound-toggle"
                :disabled="micPermission === 'denied'"
                :aria-label="t('generic.previewSoundLabel')"
              />
              <i
                class="pi pi-microphone transition-opacity"
                :class="isPreviewEnabled ? 'opacity-100' : 'opacity-50'"
                aria-hidden="true"
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <label for="dark-mode-toggle" class="font-medium">
              {{ t('generic.toggleDarkMode') }}
            </label>
            <div class="flex items-center gap-2">
              <PrimeToggleSwitch
                :modelValue="isDark"
                inputId="dark-mode-toggle"
                :aria-label="t('generic.toggleDarkMode')"
                @update:modelValue="toggleDark"
              />
              <i
                :class="isDark ? 'pi pi-moon' : 'pi pi-sun'"
                aria-hidden="true"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-medium">
              {{ t('settings.micSensitivity.label') }}
            </label>
            <p class="text-sm text-(--p-text-muted-color)">
              {{ t('settings.micSensitivity.description') }}
            </p>
            <PrimeSlider
              v-model="clarityThreshold"
              :min="MIN_CLARITY_THRESHOLD"
              :max="MAX_CLARITY_THRESHOLD"
              :step="CLARITY_STEP"
              :aria-label="t('settings.micSensitivity.label')"
              class="mt-2"
            />
            <div
              class="flex justify-between text-xs text-(--p-text-muted-color)"
            >
              <span>{{ t('settings.micSensitivity.forgiving') }}</span>
              <span class="font-medium text-(--p-text-color)"
                >{{ clarityPercent }}%</span
              >
              <span>{{ t('settings.micSensitivity.strict') }}</span>
            </div>
          </div>

          <FullscreenToggle />

          <hr class="border-0 border-t border-(--p-content-border-color)" />

          <PrimeButton
            severity="secondary"
            outlined
            size="small"
            @click="onReset"
          >
            {{ t('settings.resetToDefaults') }}
          </PrimeButton>

          <PrimeButton
            severity="secondary"
            text
            size="small"
            icon="pi pi-refresh"
            :label="t('settings.reload')"
            :aria-label="t('settings.reload')"
            @click="reloadPage"
          />
        </div>
      </div>

      <div class="mt-2 flex shrink-0 flex-col items-end justify-center gap-2">
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/kunukn/singing-experience"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('settings.githubRepository')"
            class="text-xs leading-none text-(--p-text-muted-color)"
          >
            {{ t('settings.version') }}: {{ appVersion }}
          </a>
        </div>
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/kunukn/singing-experience/issues"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('settings.githubIssues')"
            class="flex items-center gap-2 text-xs leading-none text-(--p-text-muted-color)"
          >
            <span>{{ t('settings.feedback') }}</span>
            <GitHubIcon :size="20" />
          </a>
        </div>
      </div>
    </div>
  </Drawer>
</template>
