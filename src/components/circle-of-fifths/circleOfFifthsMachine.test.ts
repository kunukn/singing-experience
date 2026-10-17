import { describe, expect, test } from 'vitest'
import { createActor } from 'xstate'
import { circleOfFifthsMachine } from './circleOfFifthsMachine'

function actor() {
  const instance = createActor(circleOfFifthsMachine)
  instance.start()
  return instance
}

describe('circleOfFifthsMachine', () => {
  test('starts idle', () => {
    expect(actor().getSnapshot().value).toBe('idle')
  })

  test('walks from idle to walkComplete', () => {
    const instance = actor()
    instance.send({ type: 'START_WALK' })
    expect(instance.getSnapshot().value).toBe('walking')
    instance.send({ type: 'COMPLETE' })
    expect(instance.getSnapshot().value).toBe('walkComplete')
  })

  test('replays the walk straight from walkComplete', () => {
    const instance = actor()
    instance.send({ type: 'START_WALK' })
    instance.send({ type: 'COMPLETE' })
    instance.send({ type: 'START_WALK' })
    expect(instance.getSnapshot().value).toBe('walking')
  })

  test('returns to idle when a pattern completes', () => {
    const instance = actor()
    instance.send({ type: 'START_PATTERN' })
    expect(instance.getSnapshot().value).toBe('patternSinging')
    instance.send({ type: 'COMPLETE' })
    expect(instance.getSnapshot().value).toBe('idle')
  })

  test('ignores COMPLETE while idle', () => {
    const instance = actor()
    instance.send({ type: 'COMPLETE' })
    expect(instance.getSnapshot().value).toBe('idle')
  })

  test('cannot start a pattern in the middle of a walk', () => {
    const instance = actor()
    instance.send({ type: 'START_WALK' })
    instance.send({ type: 'START_PATTERN' })
    expect(instance.getSnapshot().value).toBe('walking')
  })

  test.each(['STOP', 'RESET'] as const)('stops a walk on %s', (type) => {
    const instance = actor()
    instance.send({ type: 'START_WALK' })
    instance.send({ type })
    expect(instance.getSnapshot().value).toBe('idle')
  })
})
