<script setup lang="ts">
import { programHelpByKey } from '@/constants/programHelp'

type Props = {
  programKey: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const popover = ref<{ toggle: (event: Event) => void }>()

const help = computed(() => programHelpByKey[props.programKey])
const stepNumbers = computed(() =>
  Array.from({ length: help.value?.stepCount ?? 0 }, (_, index) => index + 1),
)

function togglePopover(event: Event) {
  popover.value?.toggle(event)
}
</script>

<template>
  <div v-if="help">
    <PrimeButton
      :aria-label="t('programHelp.buttonLabel')"
      :title="t('programHelp.buttonLabel')"
      text
      rounded
      severity="secondary"
      class="aspect-square max-h-10 md:aspect-auto"
      data-testid="program-help"
      @click="togglePopover"
    >
      <span class="inline-flex items-center gap-2">
        <!-- Sized via the token like the settings cog beside it -->
        <i class="pi pi-question-circle [--p-icon-size:1.25rem]" />
        <span class="hidden text-sm md:inline">{{
          t('programHelp.buttonLabel')
        }}</span>
      </span>
    </PrimeButton>

    <PrimePopover ref="popover" class="program-help-popover">
      <!-- Scrolls here, not on the popover root, whose overflow would clip the arrow -->
      <div
        class="flex max-h-[calc(100dvh-8rem)] w-80 max-w-full flex-col gap-4 overflow-y-auto text-sm"
      >
        <div>
          <h3 class="mb-1 text-base font-semibold">
            {{ t(`home.programs.${programKey}.name`) }}
          </h3>
          <p class="text-(--p-text-muted-color)">
            {{ t(`home.programs.${programKey}.description`) }}
          </p>
        </div>

        <div>
          <h4 class="mb-1 font-semibold">{{ t('programHelp.howTo') }}</h4>
          <ol class="list-decimal space-y-1 ps-5">
            <li v-for="step in stepNumbers" :key="step">
              {{ t(`programHelp.${programKey}.step${step}`) }}
            </li>
          </ol>
        </div>

        <div v-if="help.terms.length > 0">
          <h4 class="mb-1 font-semibold">{{ t('programHelp.terms') }}</h4>
          <dl class="space-y-2">
            <div v-for="term in help.terms" :key="term">
              <dt class="font-medium">{{ t(`glossary.${term}.name`) }}</dt>
              <dd class="text-(--p-text-muted-color)">
                {{ t(`glossary.${term}.description`) }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </PrimePopover>
  </div>
</template>

<style scoped>
/* Keeps a gutter on a phone; PrimeVue otherwise pins it flush to the edge */
:global(.program-help-popover) {
  max-width: calc(100vw - 2rem);
}
</style>
