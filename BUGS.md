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

2026-08-16
Component: src/components/piano/PianoSettingsRow.vue
Expected: No horizontal page scrollbar at any viewport width, in any locale.
Actual: Between roughly 768px and 797px the piano settings row is ~13px wider than the viewport in the Kalaallisut (kl) locale, whose toggle labels are the longest in src/locales (Nipaat takunniaruk / Erinarsortut marluk / Naqinnernut ikiuutit). Every other locale has headroom at those widths. Cause is structural: .settings-item uses grid-cols-subgrid, so all three grid rows share the same two columns — at md the three-toggle cluster and the voice-range select both sit in column 1, and whichever is wider pins the column for the whole row. Before ToggleIconButton gained whitespace-nowrap the labels wrapped here instead, so this band was already mislaid out, just differently.
Repro: In devtools run `localStorage.setItem('syng.locale','kl')`, reload http://localhost:5555/piano and set the viewport to exactly 768px wide.
Workaround: none applied. Two verified fixes exist, both rejected as disproportionate for one locale in a ~30px band — (a) let the toggle cluster span the full grid width at md only (measured 781px → 764px, keeps labels everywhere, no extra row), or (b) move ToggleIconButton's label breakpoint from md to lg (costs the labels in every locale at 768–1023, on piano, guitar and grace-kelly alike).
