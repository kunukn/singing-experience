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

2026-08-15
Component: src/composables/useGuitarSampler.ts
Expected: Playing the tuning reference (♪) in a tuning whose 6th string is C2 — Drop C (CGCFAD) or Open C — sounds all six strings.
Actual: The C2 string throws "buffer is either not set or not loaded" from Tone and stays silent; the other five play. C2 has no sample and is faked in playAt() by building a fresh Tone.Player on D2.mp3 and calling player.start(whenS) synchronously, without awaiting the buffer. prepare()'s `await _tone.loaded()` cannot cover it — that Player does not exist yet when prepare() runs. Pre-existing; verified present on a checkout without the C5 sample change.
Repro: Open /tuner, choose CGCFAD (or Open C), click ♪, watch the console.
Workaround: click ♪ a second time — the buffer has usually decoded by then, and the branch disposes the previous Player before creating the next. A fix means either awaiting the Player's load in prepare() (create it there and cache it, rather than per-play) or adding a real C2.mp3.
