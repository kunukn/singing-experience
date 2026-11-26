---
applyTo: 'e2e/**/*.ts,playwright.config.ts'
---

# E2E testing instructions

Playwright specs live in `e2e/*.spec.ts` and drive the real app in headless Chromium.

- `npm run e2e` runs them. It starts Vite on port 5555, or reuses an `npm run dev` already there.
- `npm run e2e:ui` opens Playwright's UI mode.
- They are not part of `npm run check`, the pre-push hook or CI. `check` only typechecks and lints them. Run them when you change a flow a spec covers, and when you add a spec.

`*.spec.ts` means Playwright and `*.test.ts` means Vitest. Unit and component rules are in [test.instructions.md](test.instructions.md).

A test earns its place when a real bug turns it red and a harmless refactor doesn't. For every test, name the product change that would fail it. "None" means it's tautological; "renaming or restructuring internals" means it's too structure-sensitive. Rewrite or delete either kind.

**Mutation check:** after writing a spec, break the code it guards (drop an `await`, flip a default, make a comparison always true) and confirm the spec goes red. If it stays green, find out which is true: the spec doesn't test that code, or the break changed nothing. Removing one of three `&&` conditions is often a break that changes nothing.

## What belongs here

Use e2e for what happy-dom can't run: several pages in a row, lazy-loaded chunks and languages, storage that survives a reload, layout, computed styles, canvas colours. Rules and maths belong in Vitest, next to the code.

## No microphone

Specs never use the microphone: no granted permission, no fake-media browser flags. A sung flow runs on the program's `-test` route, where a simulated singer stands in for the voice (see "Test Pages" in [AGENTS.md](../../AGENTS.md)). If a flow can't be driven there, extend the test page instead of reaching for the real mic.

## Tautologies: tests that can't fail

- A "nothing happened" assertion needs proof that the app had its chance. `toHaveCount(0)` straight after `goto` passes on a page that hasn't started. Wait for the moment first, then assert: the request that shows the app is waiting ([language.spec.ts](../../e2e/language.spec.ts)), or the game clock passing a full hold ([do-re-mi.spec.ts](../../e2e/do-re-mi.spec.ts)).
- `count()`, `all()` and `innerText()` read the page as it is, without waiting. On a page that is still loading, a loop over `all()` runs zero times and the test passes. Wait for something visible first, and assert the list isn't empty.
- Don't recompute the expected value with the app's own formula. Assert a relationship a bug would break: before against after, one page against another, a value the run produced against where it shows up next.

## Structure-sensitive: tests that fail on harmless changes

- Query by role and accessible name. Where a role can't reach, such as a canvas or a step's state, use the `data-testid` and `data-*` state attributes the component already exposes for its Vitest tests. Never use CSS classes or DOM structure.
- Read limits from the page instead of writing them down: the number of scale steps, the hold duration in the subtitle, the cards on a catalogue page. A literal `8` breaks the day a scale mode has seven notes.
- Don't compare against literal token values (`oklch(…)`, a hex colour). Compare against a reference measured in the same run instead: dark against light, before against after.
- No `^` or `$` in a `getByText` regex. It is matched against the element's text with the template's surrounding spaces still on it. Anchors are fine in `getByRole(…, { name })`, where the name is trimmed.
- The config pins the browser to `en-US`, so English copy is safe to assert. Assert copy where the copy is the point, and a role or state attribute where it isn't.

## Fixtures must match reality

- Seed storage only with values the app writes itself, under its own `syng.*` keys and in its own format. `syng.locale` holds a bare `da`, not JSON. Seed it with `page.addInitScript`, so it is there before the app starts.
- Prefer state made through the UI to hand-written JSON: play the simulated game to get a best score. Hand-write storage only for a legacy or corrupt save.
- Use values the run produced, such as the finish time on the end screen, instead of assuming them.

## Isolation and time

- Every test gets a fresh browser context with empty storage, and the suite runs fully parallel. A test never depends on another test having run.
- No `page.waitForTimeout`. Wait on something the app shows: an attribute, the game clock, a request. For dates use `page.clock`.

## Scratch output

Screenshots, traces and throwaway probe specs go in `.temp/`. `playwright-report/` and `test-results/` are gitignored.
