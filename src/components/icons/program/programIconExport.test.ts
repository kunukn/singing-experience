/*
 * Keeps docs/icons/*.svg (the README's program icons) in sync with the Vue
 * icon components. After changing an icon, regenerate with:
 *   npx vitest run -u src/components/icons/program/programIconExport.test.ts
 */
import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { games, programs, tools } from '@/constants/programs'
import ProgramIconTile from './ProgramIconTile.vue'
import { toStandaloneSvg } from './programIconExport'

const allPrograms = [...programs, ...tools, ...games]

function renderIcon(icon: (typeof allPrograms)[number]['icon']) {
  return mount(icon, { global: { components: { ProgramIconTile } } }).html()
}

describe('toStandaloneSvg', () => {
  test('should replace PrimeVue vars with Aura hex tokens', () => {
    const svg = toStandaloneSvg(renderIcon(tools[0].icon))

    expect(svg).not.toContain('--p-')
    expect(svg).not.toContain('class=')
    expect(svg).toContain('--icon-strong: #059669')
    expect(svg).toContain('@media (prefers-color-scheme: dark)')
  })
})

describe('programIconExport - README files', () => {
  test.each(
    allPrograms.map((program) => ({ slug: program.route.slice(1), program })),
  )('should match the README file for $slug', async ({ slug, program }) => {
    await expect(toStandaloneSvg(renderIcon(program.icon))).toMatchFileSnapshot(
      `../../../../docs/icons/${slug}.svg`,
    )
  })
})
