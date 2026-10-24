# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-24
Component: src/locales/_.json (Notes program)
Expected: Notes program strings are translated in every locale
Actual: notes.tabs.listen is English ("Listen") in ar, bn, hi, id, ja, kl, ru, sw and zh; home.programs.notes.name/description are English in ar, bn, ru, sw and zh; notes.clefLabels._ and notes.outliers.heading are English in ru, sw and zh
Repro: Switch language to Russian, open Notes — title reads "Notes", tab reads "Listen"
Workaround: none
