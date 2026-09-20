# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. Format defined in [.github/copilot-instructions.md](.github/copilot-instructions.md#bug-discovery-logging).

---

2026-08-03
Component: src/components/piano/PianoDisplay.vue
Expected: Panning the keyboard horizontally on a touch device should not sound a note.
Actual: @pointerdown plays a tone on the first touch of a scroll drag, so scrolling the keyboard sideways triggers unwanted notes.
Repro: On a phone, pick the Full voice range and drag the keyboard sideways to scroll.
Workaround: partial — a drag gutter under the keys (PianoDisplay, shown on touch when the keyboard overflows) gives a key-free place to start a pan. A drag started on a key still sounds a note; fixing that means delaying playback until the gesture is known not to be a pan, which costs attack latency on every tap. Fit-to-container key sizing reduces how often scrolling is needed but does not remove the trigger.

