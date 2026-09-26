import { describe, expect, test } from 'vitest'
import { createActor } from 'xstate'
import { singTheKeysMachine } from './singTheKeysMachine'

function createRunningActor() {
  const actor = createActor(singTheKeysMachine).start()

  return actor
}

describe('singTheKeysMachine', () => {
  test('starts idle and moves to playing on START', () => {
    const actor = createRunningActor()

    expect(actor.getSnapshot().value).toBe('idle')
    actor.send({ type: 'START' })
    expect(actor.getSnapshot().value).toBe('playing')
  })

  test('DONE ends the run and START replays it', () => {
    const actor = createRunningActor()

    actor.send({ type: 'START' })
    actor.send({ type: 'DONE' })
    expect(actor.getSnapshot().value).toBe('done')
    actor.send({ type: 'START' })
    expect(actor.getSnapshot().value).toBe('playing')
  })

  test('STOP returns to idle from playing', () => {
    const actor = createRunningActor()

    actor.send({ type: 'START' })
    actor.send({ type: 'STOP' })
    expect(actor.getSnapshot().value).toBe('idle')
  })

  test('ignores DONE while idle', () => {
    const actor = createRunningActor()

    actor.send({ type: 'DONE' })
    expect(actor.getSnapshot().value).toBe('idle')
  })
})
