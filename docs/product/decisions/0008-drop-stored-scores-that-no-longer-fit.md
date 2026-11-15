# 0008 — Drop stored scores that no longer fit

- **Status:** Accepted
- **Date:** 2026-11-15

## Context

Best scores are saved on the device, one for each game and each mix of settings. Note Rush gained a difficulty level, so its saved scores, which carry only a game length and a hold duration, stopped matching anything a player can now play. They can't be beaten or replaced, so they would stay on the Best scores page for good. The same thing happens every time a game gains, loses or renames a setting that makes a run harder or easier.

## Decision

A stored score that no longer fits its game's current settings is deleted, never migrated. Each game lists the settings it saves, and the score store deletes anything else when it loads.

## Alternatives considered

- **Migrate with a default value**, for example treat old Note Rush scores as Hard because the old game played like Hard. It keeps the score, but it puts a label on a run the player never chose, and each setting change would need its own migration code that stays in the app for ever.
- **Hide but keep.** Nothing is lost if a setting change is undone, but dead entries pile up in storage, and both the Best scores page and the in-game badge would have to filter them.
- **A version number on the stored scores.** One bump would drop every game's scores to clean up one game, or it would need a version for each game, which is the settings list under another name.
- **Leave them.** The cheapest option, and the one that shows the player scores they can never beat.

## Consequences

A setting change costs the player their old scores for that game. That is accepted: this is a practice app and the scores are a nudge, not a record to protect. It makes changing a game's settings cheap, since the only step is updating the game's list in `HIGH_SCORE_CONFIG_FIELDS`. A list that falls out of step with its `recordScore` call would delete good scores on the next load, so the two change in the same commit. The store checks setting names, not values; a removed option value still follows the rule but has no automated guard yet. Guarded by `useHighScoreStore.test.ts`.
