# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-11-27
Component: src/components/singfly/singFlyGeometry.ts (`getBoundaryRects`)
Expected: An exported function has a production caller.
Actual: `getBoundaryRects` is called only by `singFlyGeometry.test.ts`; the game draws from `buildPlayfield`. About 300 lines of tests guard code the app never runs.
Repro: `grep -rn getBoundaryRects src` lists only its own file and the test.
Workaround: none

2026-11-27
Component: src/components/singfly/useSingFly.ts (`UseSingFlyOptions.isClean`)
Expected: Every declared option is read by the composable.
Actual: `isClean` is declared on line 57 and passed by `SingFlyDisplay.vue`, but `useSingFly` never reads it.
Repro: `grep -n isClean src/components/singfly/useSingFly.ts` shows only the type declaration.
Workaround: none
