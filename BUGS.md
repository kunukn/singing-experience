# Bugs log

Out-of-scope bugs noticed during other work. One entry per bug, newest at the bottom. The bar for an entry and its format are defined in [AGENTS.md](AGENTS.md#bug-discovery-logging).

---

2026-10-03
Component: package.json (`build` script), tsconfig.json
Expected: `npm run build` fails on a type error, as the type-check step before `vite build` implies.
Actual: The step runs against the root tsconfig.json, which has `"files": []` and only `references`, so without `--build` it checks nothing and exits 0. Type errors reach `vite build` (and any deploy that runs only `npm run build`) unnoticed. Same before and after the vue-tsc → vue-tsgo swap.
Repro: Add `export const x: number = "a"` to any file in src, run `npx --no-install vue-tsgo; echo $?` → prints 0.
Workaround: `npm run typecheck` / `npm run check` check tsconfig.app.json explicitly. tsconfig.node.json (vite.config.ts) is checked by nothing.
