import { describe, expect, test } from 'vitest'

import {
  games,
  hiddenPrograms,
  programByRoute,
  programs,
  tools,
} from '@/constants/programs'
import { ROUTE_META } from '@/constants/routeMeta'

import readme from '../../README.md?raw'

describe('hiddenPrograms', () => {
  test.each(hiddenPrograms)(
    'should give $route a top-bar entry and nothing public',
    ({ key, route }) => {
      const listedPrograms = [...programs, ...games, ...tools]

      expect(programByRoute.get(route)?.key).toBe(key)
      expect(listedPrograms.some((program) => program.key === key)).toBe(false)
      /* ROUTE_META keys become sitemap entries, see routeMeta.ts */
      expect(Object.keys(ROUTE_META)).not.toContain(route)
      expect(readme).not.toContain(route)
    },
  )
})
