# Contributing to Singing Experience

Thank you for your interest in contributing! This project has a focused contribution policy to keep it simple and maintainable.

## What We Accept

### Bug Fixes

If you've found a bug — broken behavior, a crash, incorrect pitch detection, UI glitches, accessibility issues — we welcome a fix.

### Improvements to Existing Features

We accept PRs that improve the features already in the app:

- **Pitch Detector** — accuracy, performance, UI/UX polish, voice range presets, pitch history chart
- **DO RE MI Game** — gameplay flow, visual feedback, note detection, scale options
- **Tone Detector** — multi-tone detection accuracy, UI/UX polish, settings controls, tone visualization
- **PWA / Offline** — service worker reliability, install experience, caching behavior
- **General** — accessibility, responsiveness, internationalization, documentation

## What We Do Not Accept

### New Features or New Pages

This project is not accepting new feature contributions. PRs that add entirely new pages, game modes will be ignored.

## Want to Build Something New?

This project is licensed under [0BSD](LICENSE) — essentially "do what you want, but don't blame me." You're free to fork or clone it and build whatever you like on top of it. If you have an idea for a new feature that doesn't fit this project, take it and make it your own!

## Before You Submit

1. Open an issue first to discuss the change — this avoids wasted effort on PRs that won't be merged.
2. Follow the existing code style and conventions (see `CLAUDE.md` for details).
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages (`fix:`, `refactor:`, `perf:`, `docs:`, etc.). A `commit-msg` hook runs commitlint and rejects messages that don't follow the format.
4. Run `npm run check` to verify your changes don't introduce errors. (Pre-commit auto-formats staged files; pre-push runs `check` automatically.)
5. Fill out the PR template completely.

## Development Setup

```sh
git clone https://github.com/kunukn/singing-experience.git
cd singing-experience
npm install
npm run dev
```

## Available Scripts

### Naming convention

When adding a new script to `package.json`, follow these rules so the list stays scannable:

- **Format**: `<group>:<action>` — colon-separated, lowercase, no camelCase, no kebab inside the name (`build:validate`, not `validateBuild` or `validate-build`).
- **Groups**: `dev`, `build`, `test`, `check`, `format`. Pick one — do not invent new groups without discussion.
- **Bare names** (no colon) are reserved for the canonical action of a group: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`, `check`, `deploy`. Everything else must have a group prefix.
- **Action describes intent, not tooling.** Use `build:validate` (not `playwright:smoke`), `check:fix` (not `format-and-check`). The reader should understand the script without opening its body.
- **No duplicates / aliases.** If two scripts run the same command, delete one and update callers (CI, hooks, docs).
- **When you rename a script**, grep the repo for the old name — the husky hooks in [.husky/](.husky/), the GitHub workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml), and the docs ([CLAUDE.md](CLAUDE.md), [.github/copilot-instructions.md](.github/copilot-instructions.md), and this file) all reference scripts by name.

### Scripts

- `npm run dev` — Start the development server on port 5555
- `npm run build` — Type-check and build for production
- `npm run build:preview` — Build then preview the production bundle locally
- `npm run build:validate` — Build then run a Playwright smoke test against the preview server
- `npm run preview` — Preview the production build locally (build first)
- `npm run typecheck` — Run TypeScript type checking with timing output
- `npm run lint` — Run linting with timing output
- `npm run lint:fix` — Run linting and auto-fix
- `npm run format` — Format files using Prettier
- `npm test` — Run tests once
- `npm run test:watch` — Run tests in watch mode
- `npm run test:ui` — Run tests with the Vitest UI
- `npm run check` — Run all pre-push checks (typecheck + lint + tests + build + validate) in parallel. Pre-push runs this automatically; humans run it manually only when verifying before pushing.
- `npm run check:fix` — Format then run `check`. Intended for AI/agent workflows that bypass the husky hooks — agents should run this before handing control back. Humans normally don't need it: pre-commit auto-formats staged files via lint-staged, and pre-push runs `check`.
- `npm run deploy` — Deploy `dist/` to the `gh-pages` branch

## License

By contributing, you agree that your contributions will be licensed under the [0BSD License](LICENSE).
