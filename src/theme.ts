import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const Theme = definePreset(Aura, {
  semantic: {
    formField: {
      /* Small controls are the app's default size (see AGENTS.md); Aura's
       * 0.75rem (12px) is too small for children. Semantic rather than
       * per-component, so buttons, selects and select buttons in one row
       * share a text size. */
      sm: { fontSize: '0.875rem' },
    },
  },
})

export default Theme
