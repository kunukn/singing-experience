# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-04
Component: src/components/piano/PianoDisplay.vue (areKeyboardHintsVisible prop)
Expected: Omitting areKeyboardHintsVisible shows the key-hint chips, as the keyChar check (`=== false`) and its comment imply
Actual: Vue casts an absent optional boolean prop to false, so any consumer that omits it silently gets no chips
Repro: Render <PianoDisplay> without :areKeyboardHintsVisible on a desktop — no Z/X/Q… chips (was the song recorder's bug)
Workaround: Pass :areKeyboardHintsVisible explicitly; real fix is withDefaults(..., { areKeyboardHintsVisible: true })

2026-10-05
Component: npm run check / vite.config.ts AutoImport (src/auto-imports.d.ts)
Expected: Adding a composable under src/composables/ passes check:fix first time, and the running dev server resolves it
Actual: TS check runs before anything regenerates auto-imports.d.ts, so the first check:fix fails with "Cannot find name"; the running dev server also throws "<name> is not defined" until Vite restarts
Repro: Add src/composables/useFoo.ts, call useFoo() in a page, run npm run check:fix with the dev server up
Workaround: Re-run check:fix (its build step regenerates the d.ts); touch vite.config.ts to restart the dev server in place
