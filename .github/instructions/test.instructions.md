---
applyTo: '**/*.test.ts'
---

# Testing Guidelines

These instructions apply when writing or modifying test files (`*.test.ts`). Playwright specs in `e2e/` have their own rules in [e2e.instructions.md](e2e.instructions.md).

## A Test Must Earn Its Place

A test earns its place when a real bug turns it red and a harmless refactor doesn't. For every test, name the product change that would fail it. "None" means it's tautological; "renaming or restructuring internals" means it's too structure-sensitive. Rewrite or delete either kind.

**Mutation check:** after writing a test, break the code it guards (flip a default, drop a branch, swap a constant) and confirm the test goes red. If it stays green, find out which is true: the test doesn't test that code, or the break changed nothing.

### Tautologies: tests that can't fail

- Don't assert what the implementation's shape already guarantees, such as that a function returns a member of the array it indexes.
- Don't recompute the expected value with the code's own formula and constants. Assert a contract a plausible bug would break instead: an ordering, a relationship between two outputs, or a hand-computed example (`440 Hz` is `A4`).
- A purity test ("same input → same output") is only worth it when it guards a stated rule. Say the rule in the test name.

### Structure-sensitive: tests that fail on harmless changes

- Test through the public surface: props and events in, rendered text, `data-*` state and emitted events out. "Testing Philosophy" below has the details for components.
- Derive limits from the source of truth instead of writing the number: `CLEAN_CENTS` / `CLOSE_CENTS` / `OFF_CENTS` from `pitchColors.ts`, the fields in `HIGH_SCORE_CONFIG_FIELDS`, a scale's own step list. Pin a literal only where it _is_ the spec under test.
- Persistence tests are the exception: there the stored shape is the contract, so assert it.

### Fixtures and mocks must match reality

- Send only inputs the real app can produce. A mock pitch provider reports what the detector reports: a frequency together with its note, octave and clarity, not a note the frequency doesn't belong to.
- Produce current-format data through the real writer, such as a store's own actions, so the fixture can't drift from the code. Hand-write storage JSON only for legacy or corrupt saves.
- Nothing driven by layout, the network or real audio runs in happy-dom. Cover that behaviour in e2e, or stub it per test with callbacks that fire the way the browser does.
- Keep comments that describe fixtures true. A comment naming the wrong value misleads the next author more than no comment would.

### Isolation

- Pinia stores and `useLocalStorage` refs are shared state, and happy-dom's `localStorage` survives between tests in a file. Reset both in `beforeEach` so each test starts as a new singer and test order doesn't matter:

  ```typescript
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })
  ```

- `localStorage.clear()` does not reach a `useLocalStorage` ref created at module load, such as the ones behind `useDarkMode`, `useMyVoiceRange` and `useSettings`: the ref keeps the value the last test gave it. Set those back through their own setter in the same `beforeEach`.
- Other module-level state, such as a flag that remembers a one-time request, survives too. Load a fresh module for it with `vi.resetModules()` and a dynamic `import()`.
- Assert new-singer defaults on a fresh store, never after another test has changed it.

## Testing Philosophy

Tests should verify **what the component does**, not **how it is implemented**.

A test that breaks when you rename a CSS class or restructure the DOM without changing
behaviour is testing the wrong thing.

### Test these ✅

- Rendered text content — labels, values, status indicators
- `data-*` attributes that represent state (`data-status`, `data-highlighted`)
- Emitted events and their payloads
- Computed style properties that encode **logic** (e.g. `width: 50%` from `holdProgress`)
- Presence or absence of elements driven by props or state

### Avoid testing these ❌

- Tailwind utility classes (`border-green-700`, `bg-gray-900/50`, `text-purple-400`)
- CSS class names used purely for visual styling
- DOM nesting or structural selectors (`.w-6 span`, `div > div > button`)
- Inline colours or visual-only style properties

```typescript
// ❌ Fragile — breaks on visual refactor, says nothing about behaviour
expect(wrapper.get('button').classes()).toContain('border-purple-500')
expect(wrapper.find('.w-6 span').text()).toBe('○')

// ✅ Robust — tests state, survives visual changes
expect(wrapper.attributes('data-highlighted')).toBe('true')
expect(wrapper.get('[data-testid="status-icon"]').text()).toBe('○')
```

## Test Framework & Environment

- **Runner**: Vitest (no `globals: true`) — all vitest APIs must be explicitly imported
- **Component testing**: `@vue/test-utils`
- **DOM environment**: `happy-dom` (configured in `vite.config.ts`)

## File Naming

| Extension      | Usage                                   |
| -------------- | --------------------------------------- |
| `.test.ts`     | Utility/logic functions and composables |
| `.vue.test.ts` | Vue SFC components                      |

Test files live next to the source file they test:

```
src/utils/noteUtils.ts
src/utils/noteUtils.test.ts

src/components/do-re-mi/useDoReMiGame.ts
src/components/do-re-mi/useDoReMiGame.test.ts

src/components/do-re-mi/DoReMiScale.vue
src/components/do-re-mi/DoReMiScale.vue.test.ts
```

## Imports

Vitest globals are **not** enabled — always import what you use:

```typescript
/* ✅ Correct — explicit imports */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
```

Import order in test files:

1. Vitest imports (`describe`, `test`, `expect`, `vi`, etc.)
2. Vue / test-utils imports (`mount`, `nextTick`, etc.)
3. Plugin setup imports (`createPinia`, `createRouter`, `createI18n`, etc.)
4. Source code imports (the module under test)
5. Mock data / helper imports

## Test Structure

### `describe` blocks

Use the component, composable, or function name. Add a dash-separated context when testing a specific feature:

```typescript
/* Utility function — name only */
describe('noteUtils', () => { ... })

/* Component — name only */
describe('DoReMiScale', () => { ... })

/* Composable — with context */
describe('useDoReMiGame - hold detection', () => { ... })
```

### `test` blocks

Use `test()` (not `it()`). Start with `should` for behavior tests. Use a verb phrase for utility functions:

```typescript
/* ✅ Behavior — "should [expected outcome]" */
test('should render the correct note label', () => { ... })
test('should advance step after holding the correct note', () => { ... })
test('should not be complete on initial state', () => { ... })

/* ✅ Utility — verb phrase describing the return/behavior */
test('returns A4 at 440 Hz', () => { ... })
test('converts midi note to frequency', () => { ... })

/* ❌ Avoid vague or capitalized names */
test('Format Note', () => { ... })
test('works', () => { ... })
```

### Parameterized tests

Use `test.each` for testing multiple inputs:

```typescript
test.each([
  { input: 440, expected: 'A4' },
  { input: 261.63, expected: 'C4' },
])('should detect "$expected" from $input Hz', ({ input, expected }) => {
  expect(frequencyToNoteName(input)).toBe(expected)
})
```

## Mocking

### Module mocks — `vi.mock()`

Place at the top of the file, before any test code:

```typescript
import { vi } from 'vitest'

vi.mock('./usePitchDetection', () => ({
  usePitchDetection: vi.fn(),
}))
```

### Function mocks — `vi.fn()`

Use for callbacks and functions you need to verify calls on:

```typescript
const onComplete = vi.fn()
const wrapper = mount(DoReMiScale, { props: { onComplete } })

await wrapper.find('button').trigger('click')
expect(onComplete).toHaveBeenCalledTimes(1)
```

### Spies — `vi.spyOn()`

Use for observing existing functions without replacing them:

```typescript
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
// ... test ...
warnSpy.mockRestore()
```

## Rendering Components

Mount SFCs with `mount` from `@vue/test-utils`. Pass plugins via `global.plugins`:

```typescript
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

const wrapper = mount(MyComponent, {
  props: { label: 'Hello' },
  global: {
    plugins: [createPinia()],
  },
})
```

### With Router and i18n

```typescript
import { createRouter, createMemoryHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

const router = createRouter({ history: createMemoryHistory(), routes: [...] })
const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const wrapper = mount(App, {
  global: { plugins: [createPinia(), router, i18n] },
})
```

### Querying elements

```typescript
/* Must exist — throws if missing */
wrapper.get('button')
wrapper.get('[data-testid="score"]')

/* May be absent — returns DOMWrapper or errorWrapper */
wrapper.find('.optional-element').exists() // → boolean

/* All matches */
wrapper.findAll('li')
```

### Asserting content and attributes

```typescript
expect(wrapper.exists()).toBe(true)
expect(wrapper.text()).toContain('Do')
expect(wrapper.get('h1').text()).toBe('Sing!')
expect(wrapper.get('button').attributes('disabled')).toBeDefined()
expect(wrapper.attributes('data-status')).toBe('current')
```

### Triggering events

```typescript
await wrapper.get('button').trigger('click')
await wrapper.get('input').setValue('hello')
await nextTick()
```

## Testing Composables

Call composables directly — no `renderHook` needed. Use `nextTick` to flush reactive updates:

```typescript
import { nextTick } from 'vue'

test('should detect correct note', async () => {
  const game = useDoReMiGame({ pitchDetection: mockProvider })

  await game.start()
  setMockFrequency(440)
  await nextTick()

  expect(game.isSingingCorrectNote.value).toBe(true)
})
```

Use `vi.useFakeTimers()` / `vi.advanceTimersByTime()` when composables use `setTimeout`, `setInterval`, or `requestAnimationFrame`:

```typescript
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

test('should accumulate hold time', async () => {
  await game.start()
  simulateSingingNote(mock, 'C', 3)
  await nextTick()

  vi.advanceTimersByTime(500)

  expect(game.holdTimeMs.value).toBeGreaterThan(0)
})
```

## Assertions

Use the correct matcher for the value type:

| Value type                           | Matcher                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| Primitives (string, number, boolean) | `toBe()`                                                  |
| Objects and arrays                   | `toEqual()`                                               |
| Array length                         | `toHaveLength()`                                          |
| Approximate numbers                  | `toBeCloseTo(n, precision)`                               |
| DOM/wrapper exists                   | `wrapper.exists()` → `toBe(true/false)`                   |
| DOM text content                     | `wrapper.text()` → `toContain()` / `toBe()`               |
| DOM attributes                       | `wrapper.attributes('name')` → `toBe()` / `toBeDefined()` |
| Mock called                          | `toHaveBeenCalledTimes(n)` / `toHaveBeenCalledWith(args)` |
| Mock not called                      | `not.toHaveBeenCalled()`                                  |

Use `wrapper.get()` when the element must exist. Use `wrapper.find().exists()` when asserting presence/absence.

## Test Data

### Inline — for simple, single-use data

```typescript
test('should return correct note name', () => {
  expect(frequencyToNoteName(440)).toBe('A4')
})
```

### Factory functions — for reusable or complex data

Define at the top of the test file with sensible defaults and allow overrides:

```typescript
const createMockPitchDetection = (
  overrides?: Partial<PitchDetectionProvider>,
) => ({
  frequency: ref<number | null>(null),
  noteInfo: ref(null),
  isListening: ref(false),
  start: vi.fn(),
  stop: vi.fn(),
  ...overrides,
})

test('should call stop on reset', () => {
  const mock = createMockPitchDetection()
  // ...
})
```

### Separate mock files — for large datasets

Use `*.mock.ts` or `*.mock.json` next to the module being mocked; import shared ones by absolute path:

```typescript
import { createMockToneEngine } from '@/composables/toneEngine.mock'
```

## Setup & Teardown

Use `beforeEach` to reset state before each test:

```typescript
beforeEach(() => {
  mockFn.mockReset()
})
```

Use `afterEach` only when cleanup must differ from setup (e.g., restoring timers or patched globals).

## Component State via Data Attributes

When a component has meaningful state that tests need to verify, expose it through
`data-*` attributes on the relevant element. This creates a stable, semantic contract
between the component and its tests that is independent of visual styling.

### Adding attributes to components

Place `data-*` attributes on the root element or the element whose state you need to
assert. Use names that describe the **state or role**, never the visual appearance:

```vue
<!-- ✅ Semantic — describes what the data means -->
<div
  :data-status="status"
  :data-highlighted="isHighlighted"
  :data-included="!excluded"
>

<!-- ❌ Visual — leaks styling concerns into the API -->
<div :data-green="status === 'completed'">
```

Common patterns used in this codebase:

| Attribute          | Example values                             | What it expresses                          |
| ------------------ | ------------------------------------------ | ------------------------------------------ |
| `data-status`      | `"completed"` / `"current"` / `"upcoming"` | Step progression state                     |
| `data-highlighted` | `"true"` / `"false"`                       | Whether the item is highlighted            |
| `data-included`    | `"true"` / `"false"`                       | Whether the item is part of the active set |
| `data-testid`      | `"status-icon"`, `"scale-step-0"`          | Semantic element identity for querying     |

### Asserting in tests

Use `wrapper.attributes()` to read `data-*` values, and `[data-testid="..."]` selectors
to find elements without relying on CSS structure:

```typescript
// State via data attributes
expect(wrapper.attributes('data-status')).toBe('completed')
expect(wrapper.attributes('data-highlighted')).toBe('true')
expect(wrapper.attributes('data-included')).toBe('false')

// Element identity via data-testid
expect(wrapper.get('[data-testid="status-icon"]').text()).toBe('✓')
expect(wrapper.findAll('[data-testid^="scale-step"]')).toHaveLength(13)
```

### Before / after example

```typescript
// ❌ Before — asserts CSS class names; breaks on any visual refactor
test('should apply highlighted styling when isHighlighted is true', () => {
  const wrapper = mountItem({ isHighlighted: true })
  expect(wrapper.get('button').classes()).toContain('border-purple-500')
})

test('should apply completed border styling', () => {
  const wrapper = mountItem({ status: 'completed' })
  const inner = wrapper.find('[data-note]')
  expect(inner.classes()).toContain('border-green-700')
})

// ✅ After — asserts state via data attributes; survives visual refactors
test('should apply highlighted state when isHighlighted is true', () => {
  const wrapper = mountItem({ isHighlighted: true })
  expect(wrapper.attributes('data-highlighted')).toBe('true')
})

test('should report completed status via data attribute', () => {
  const wrapper = mountItem({ status: 'completed' })
  expect(wrapper.attributes('data-status')).toBe('completed')
})
```

## Common Pitfalls

- **Always import vitest APIs explicitly** — `vi`, `describe`, `test`, `expect`, `beforeEach`, `afterEach` are not global
- **Use `wrapper.find().exists()`** for optional elements — `wrapper.get()` throws if the element is missing
- **Await `nextTick()`** after reactive state changes before asserting DOM or reactive values
- **Use `vi.useFakeTimers()`** for composables that rely on timing — restore with `vi.useRealTimers()` in `afterEach`
- **Avoid hardcoded dates** — use `vi.useFakeTimers()` or relative values from `Date.now()`
- **Reset mocks in `beforeEach`** — prevents test pollution from mock state leaking between tests
- **Always pass required plugins** (`createPinia()`, router, i18n) via `global.plugins` when mounting components that depend on them
