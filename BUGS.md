# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-04
Component: src/components/piano/PianoDisplay.vue (areKeyboardHintsVisible prop)
Expected: Omitting areKeyboardHintsVisible shows the key-hint chips, as the keyChar check (`=== false`) and its comment imply
Actual: Vue casts an absent optional boolean prop to false, so any consumer that omits it silently gets no chips
Repro: Render <PianoDisplay> without :areKeyboardHintsVisible on a desktop — no Z/X/Q… chips (was the song recorder's bug)
Workaround: Pass :areKeyboardHintsVisible explicitly; real fix is withDefaults(..., { areKeyboardHintsVisible: true })
