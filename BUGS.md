# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. Format defined in [.github/copilot-instructions.md](.github/copilot-instructions.md#bug-discovery-logging).

---

2026-07-05
Component: src/components/notes/NotesSettingsRow.vue
Expected: A prop passed by a parent is declared in the child so the binding has effect.
Actual: NotesListenDisplay.vue passes `:showToneLabelToggle="false"` to NotesSettingsRow, but NotesSettingsRow does not declare a `showToneLabelToggle` prop — the binding is a no-op dead prop.
Repro: Open src/components/notes/NotesListenDisplay.vue (~line 98) and search NotesSettingsRow.vue for `showToneLabelToggle` — it isn't in the component's props.
Workaround: none (harmless; either remove the binding or declare/use the prop).
