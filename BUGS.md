# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-24
Component: src/components/generic/DarkModeToggle.vue
Expected: Every component in src/components is rendered somewhere, or removed
Actual: DarkModeToggle (🌙/☀️ button) is never used; dark mode is toggled from the ToggleSwitch in SettingsPanel.vue
Repro: grep -rn "DarkModeToggle" src — only its own file and components.d.ts match
Workaround: none needed; delete the file
