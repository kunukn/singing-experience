# Contributing to Singing Experience

Thank you for your interest in contributing! This project has a focused contribution policy to keep it simple and maintainable.

## What We Accept

### Bug Fixes

If you've found a bug — broken behavior, a crash, incorrect pitch detection, UI glitches, accessibility issues — we welcome a fix.

### Improvements to Existing Features

We accept PRs that improve the features already in the app:

- **Pitch Detector** — accuracy, performance, UI/UX polish, voice range presets, pitch history chart
- **DO RE MI Game** — gameplay flow, visual feedback, note detection, scale options
- **PWA / Offline** — service worker reliability, install experience, caching behavior
- **General** — accessibility, responsiveness, internationalization, documentation

## What We Do Not Accept

### New Features or New Pages

This project is not accepting new feature contributions. PRs that add entirely new pages, game modes, or tools will be closed.

### Dedicated Guitar / Instrument Tuner

The existing pitch detector can be used for instrument tuning, and improvements to it are welcome. However, PRs that add a dedicated guitar tuner page or standalone instrument tuner feature will not be accepted.

## Want to Build Something New?

This project is licensed under [0BSD](LICENSE) — essentially "do what you want, but don't blame me." You're free to fork or clone it and build whatever you like on top of it. If you have an idea for a new feature that doesn't fit this project, take it and make it your own!

## Before You Submit

1. Open an issue first to discuss the change — this avoids wasted effort on PRs that won't be merged.
2. Follow the existing code style and conventions (see `CLAUDE.md` for details).
3. Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages (`fix:`, `refactor:`, `perf:`, `docs:`, etc.).
4. Run `npm run guard` to verify your changes don't introduce errors.
5. Fill out the PR template completely.

## Development Setup

```sh
git clone https://github.com/kunukn/singing-experience.git
cd singing-experience
npm install
npm run dev
```

## License

By contributing, you agree that your contributions will be licensed under the [0BSD License](LICENSE).
