# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. Format defined in [.github/copilot-instructions.md](.github/copilot-instructions.md#bug-discovery-logging).

---

2026-07-05
Component: src/components/notes/NotesSettingsRow.vue
Expected: A prop passed by a parent is declared in the child so the binding has effect.
Actual: NotesListenDisplay.vue passes `:showToneLabelToggle="false"` to NotesSettingsRow, but NotesSettingsRow does not declare a `showToneLabelToggle` prop — the binding is a no-op dead prop.
Repro: Open src/components/notes/NotesListenDisplay.vue (~line 98) and search NotesSettingsRow.vue for `showToneLabelToggle` — it isn't in the component's props.
Workaround: none (harmless; either remove the binding or declare/use the prop).

2026-08-03
Component: src/components/piano/PianoDisplay.vue
Expected: Panning the keyboard horizontally on a touch device should not sound a note.
Actual: @pointerdown plays a tone on the first touch of a scroll drag, so scrolling the keyboard sideways triggers unwanted notes.
Repro: On a phone, pick the Full voice range and drag the keyboard sideways to scroll.
Workaround: partial — a drag gutter under the keys (PianoDisplay, shown on touch when the keyboard overflows) gives a key-free place to start a pan. A drag started on a key still sounds a note; fixing that means delaying playback until the gesture is known not to be a pan, which costs attack latency on every tap. Fit-to-container key sizing reduces how often scrolling is needed but does not remove the trigger.

2026-08-06
Component: src/components/pitch-game/pitchGameMachine.ts, src/components/warm-up/useWarmUpGame.ts, src/composables/toneEngine.ts
Expected: `npm run check:fix` leaves files untouched when no one has edited them.
Actual: The format step rewrites three unrelated files, collapsing multi-line union types onto one line — the committed formatting predates the current Prettier version, so every check:fix run adds them to the working tree as unrelated diff noise.
Repro: On a clean tree, run `npm run check:fix`, then `git status` — the three files above show as modified.
Workaround: `git checkout --` the three files before committing, or reformat them once in a dedicated style commit.
