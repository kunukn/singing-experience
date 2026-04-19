# App - Coding Guidelines

This document provides coding standards and architectural principles for GitHub Copilot when working with this Vue project.

## Core Technologies

- **Frontend Framework**: Vue with TypeScript
- **UI Libraries**: Tailwind CSS + Vue Single File Components (SFC) for styling.
- **State Management**: Pinia (global state)
- **Linting**: oxlint
- **Testing**: vitest
- **Package Manager**: npm

## Directory Structure

```
/src
  /components
    /generic          # Reusable UI components (buttons, inputs, cards)
    /[Feature]        # Feature-specific components
  /views             # Page components (route-based)
  /composables       # Custom Vue composables
  /utils             # Utility functions
  /assets            # Static assets
  /stores            # Pinia stores
  /constants         # Application constants
```

## Key Coding Rules

### Response Style

Be succinct. Every response should deliver maximum substance with minimum words.

- **Lead with the answer** — state the solution or key point first, then explain only if necessary
- **Drop filler** — remove words like "just", "really", "basically", "simply", "obviously", "of course"
- **No pleasantries** — skip "Sure!", "Great question!", "I'd be happy to help!", "Let me explain..."
- **No hedging** — avoid "I think", "It might be", "Perhaps you could" when you are confident
- **Short sentences** — prefer concise, direct phrasing over long-winded explanations
- **No repetition** — state things once; do not rephrase the same point in different words
- **Show, don't tell** — prefer a code snippet over a paragraph describing what the code would look like
- **Proper English** — maintain correct grammar and complete sentences; this is not shorthand or telegraphic

Example:

```
// ❌ Verbose
"Sure! I'd be happy to help with that. The issue you're experiencing is most likely
caused by your authentication middleware not properly validating the token expiry.
Let me take a look at the code and suggest a fix for you."

// ✅ Succinct
"Bug is in the auth middleware — token expiry check uses `<` instead of `<=`. Here's the fix:"
```

### Component Guidelines

**CRITICAL**: Always use Generic components from `/src/components/generic/` instead of HTML elements:

- Use `<Button />` instead of `<button />`
- Use `<Select />` instead of `<select />`

**Organization**:

- One component per file (PascalCase naming)
- Keep components close to where they're used
- Feature-specific components grouped by feature
- Generic components in the generic directory

### TypeScript Rules

- **Always use `type` instead of `interface`** for all type definitions
- Prefer type composition over inheritance
- Use type utilities: `Pick`, `Omit`, `Partial`, etc.
- Keep types close to where they're used

Example:

```typescript
type UserProfile = {
  id: string
  name: string
  email: string
}

type UserPreferences = Pick<UserProfile, 'id' | 'name'>
```

### Naming Conventions

- **Functions**: verbs in camelCase - `fetchUserData`, `handleSubmit`
- **Variables**: nouns in camelCase - `userProfile`, `isLoading`
- **Booleans**: prefix with `is`/`has`/`should` - `isVisible`, `hasPermission`
- **Components**: PascalCase
- **Avoid abbreviations** unless widely understood (use `index` not `idx`)
- No redundant words (use `user` not `userObject`)
- Group related variables with consistent prefixes (`userFirstName`, `userLastName`)

### Vue Template Prop Casing

Use **camelCase** for component props in Vue templates, matching the JavaScript variable name. Do **not** use kebab-case for prop bindings. Also, do **not** add HTML comments before component usage.

```vue
<!-- ❌ Wrong - kebab-case props and unnecessary comment -->
<!-- Scale visualization -->
<DoReMiScale
  :current-step-index="currentStepIndex"
  :hold-progress="holdProgress"
/>

<!-- ✅ Correct - camelCase props, no redundant comment -->
<DoReMiScale
  :currentStepIndex="currentStepIndex"
  :holdProgress="holdProgress"
/>
```

### Auto Imports

This project uses `unplugin-auto-import` to auto-import common APIs from `vue`, `vue-router`, and local composables. **Do not manually import** these — they are globally available:

- **Vue**: `ref`, `computed`, `reactive`, `readonly`, `watch`, `watchEffect`, `onMounted`, `onUnmounted`, `nextTick`, `toRef`, `toRefs`, `toValue`, `provide`, `inject`, `shallowRef`, `defineComponent`, etc.
- **Vue Router**: `useRoute`, `useRouter`, `onBeforeRouteLeave`, `onBeforeRouteUpdate`, `useLink`
- **Composables** from `src/composables/`: all named exports are auto-imported

```typescript
// ❌ Wrong - unnecessary manual imports
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDoReMiGame } from '@/composables/useDoReMiGame'

const count = ref(0)

// ✅ Correct - use auto-imported APIs directly
const count = ref(0)
```

See `src/auto-imports.d.ts` for the full list of available auto-imports.

### Code Organization

- Flat is better than nested
- No generic 'helpers' folders
- Keep business logic in composables or utils
- Separate API calls into the `/src/apis/` directory
- Prefer absolute import paths when not in the same folder. E.g. `import { Gallery } from '@/Gallery'` instead of `import { Gallery } from '../../Gallery'`

### Early Return Spacing

Always add a blank line after a single-line `return` (including early/guard returns) before the next statement. This improves readability by visually separating the guard clause from the rest of the logic.

```typescript
// ❌ Bad - no blank line after single-line return
if (!locationId) return
const fetchedLocation = await cpmsGatewayApi.getLocation(locationId, undefined)

// ✅ Good - blank line after single-line return
if (!locationId) return

const fetchedLocation = await cpmsGatewayApi.getLocation(locationId, undefined)
```

### State Management

- Use Pinia for global state
- Keep component state local when possible

### Testing

- Write tests for critical business logic
- Keep test files close to the code they test
- Use Vitest for unit and integration tests

Prefer testing business logic outcomes (submitted values, rendered output) over intermediate DOM state.

### Code Documentation

- Write self-documenting code through clear naming and structure
- Only add comments for complex business logic or non-obvious decisions
- Document public APIs and interfaces with JSDoc
- Avoid obvious comments that just repeat what the code does
- **Use `/* */` block comments for multiline comments**, not multiple `//` lines
- **Always comment magic numbers** — numeric literals whose meaning isn't obvious from context (e.g., audio dB levels, timing thresholds, algorithm constants, pixel offsets). Extract to a named constant when reuse is likely; otherwise add an inline comment.
- **Always comment complex patterns** — non-trivial code that requires domain knowledge to understand (e.g., audio synthesis configs, bitwise operations, regex patterns, mathematical formulas). A brief comment explaining *why* the values or pattern exist prevents future readers from guessing.

Examples:

```typescript
// ✅ Correct - block comment for multiline
/*
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua,
 * ut enim ad minim veniam.
 */

// ❌ Wrong - multiple single-line comments
// Lorem ipsum dolor sit amet, consectetur adipiscing elit.
// Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua,
// ut enim ad minim veniam.

// ✅ OK - single-line comment stays as //
// This is a brief note about the next line
```

```typescript
// ❌ Bad - magic number with no explanation
const volume = -12

// ✅ Good - magic number explained
const volume = -12 // dB — extra quiet; square waves are perceptually louder

// ❌ Bad - complex pattern with no context
const filter = { Q: 2, type: 'lowpass', rolloff: -12 }

// ✅ Good - complex pattern explained
// Q 2 = mild resonance peak; -12 dB/oct rolloff for a warm low-end
const filter = { Q: 2, type: 'lowpass', rolloff: -12 }
```

### TypeScript Verification

**CRITICAL**: After completing all code changes, **always** run `npm run guard` as the final step to verify there are no errors. Do not consider the task complete until this command passes successfully. If errors are found, fix them before finishing.

```bash
npm run guard
```

### Commit Message Format

Follow Conventional Commits specification:

**Format**: `<type>[optional scope]: <description>`

**Types**:

- `feat:` - A new feature (MINOR version)
- `fix:` - A bug fix (PATCH version)
- `docs:` - Documentation only changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvement
- `test:` - Adding or correcting tests
- `chore:` - Build process or tooling changes

## Quick Reference Checklist

- ✅ Check `/src/components/generic/` before creating new components
- ✅ Use generic components instead of HTML elements
- ✅ Use `type` not `interface`
- ✅ Use Pinia for global state
- ✅ Use Tailwind CSS for styling as the default choice
- ✅ Follow Conventional Commits for commit messages
- ✅ Run `npm run guard` as the final step to verify no errors
- ✅ Add a blank line after single-line `return` statements
- ✅ Use `/* */` for multiline comments, `//` for single-line only
- ✅ Comment magic numbers and complex patterns that are hard to reason about without context
- ✅ Use camelCase for Vue template prop bindings (`:currentStepIndex`, not `:current-step-index`)
- ✅ Do not manually import `ref`, `computed`, `watch`, etc. from `vue` — they are auto-imported
