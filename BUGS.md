# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. Format defined in [.github/copilot-instructions.md](.github/copilot-instructions.md#bug-discovery-logging).

---

2026-09-20
Component: src/components/generic/VoiceRangeRibbon.vue
Expected: A screen reader can tell which voice type is currently selected.
Actual: Selection is conveyed only by bar opacity and a data-selected attribute; the segment buttons expose no aria-current or aria-pressed. VoiceRangeLegend sets aria-current for the same state.
Repro: Pitch detector, eye toggle on, pick Tenor — the tenor bar brightens but its accessible name and state are unchanged.
Workaround: none

2026-09-20
Component: src/components/generic/VoiceRangeRibbon.vue
Expected: Interactive targets meet the WCAG 2.5.8 minimum of 24x24 CSS px.
Actual: Each segment button is RIBBON_LANE_WIDTH (5px) wide, so selecting a voice by its bar is a 5px-wide target.
Repro: Pitch detector, eye toggle on, try clicking a specific voice bar beside the note axis.
Workaround: The voice range select, and now the legend rows, offer the same action at a usable size.
