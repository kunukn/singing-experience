import { createActor } from 'xstate'
import { describe, expect, test } from 'vitest'
import { singFlyMachine } from './singFlyMachine'

/* Pure FSM tests — no Vue. The bug class this machine fixes is "an end
 * transition / its side-effects had no single owner"; here we prove the graph
 * itself only allows the legal transitions and carries the crash cause. */

function actor() {
  const a = createActor(singFlyMachine)
  a.start()
  return a
}

describe('singFlyMachine', () => {
  test('starts idle with no crash cause', () => {
    const a = actor()
    expect(a.getSnapshot().value).toBe('idle')
    expect(a.getSnapshot().context.crashCause).toBeNull()
  })

  test('idle → playing on START', () => {
    const a = actor()
    a.send({ type: 'START' })
    expect(a.getSnapshot().value).toBe('playing')
  })

  test('CRASH/WON are ignored outside playing (structural, no guard)', () => {
    const a = actor()
    a.send({ type: 'CRASH', cause: { kind: 'incomplete' } })
    a.send({ type: 'WON' })
    expect(a.getSnapshot().value).toBe('idle')
  })

  test('playing → crashed carries the pipe cause', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'CRASH', cause: { kind: 'pipe', pipeId: 3 } })
    const snap = a.getSnapshot()
    expect(snap.value).toBe('crashed')
    expect(snap.context.crashCause).toEqual({ kind: 'pipe', pipeId: 3 })
  })

  test('playing → crashed carries the boundary cause', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'CRASH', cause: { kind: 'boundary', side: 'floor' } })
    expect(a.getSnapshot().context.crashCause).toEqual({
      kind: 'boundary',
      side: 'floor',
    })
  })

  test('playing → won', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'WON' })
    expect(a.getSnapshot().value).toBe('won')
  })

  test('replay (crashed → playing) clears the previous crash cause', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'CRASH', cause: { kind: 'pipe', pipeId: 1 } })
    a.send({ type: 'START' })
    const snap = a.getSnapshot()
    expect(snap.value).toBe('playing')
    expect(snap.context.crashCause).toBeNull()
  })

  test('RESET returns to idle from any terminal state', () => {
    for (const cause of [
      { kind: 'pipe', pipeId: 0 } as const,
      { kind: 'incomplete' } as const,
    ]) {
      const a = actor()
      a.send({ type: 'START' })
      a.send({ type: 'CRASH', cause })
      a.send({ type: 'RESET' })
      expect(a.getSnapshot().value).toBe('idle')
    }

    const won = actor()
    won.send({ type: 'START' })
    won.send({ type: 'WON' })
    won.send({ type: 'RESET' })
    expect(won.getSnapshot().value).toBe('idle')
  })

  test('a second CRASH after the first is ignored (one end per round)', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'CRASH', cause: { kind: 'pipe', pipeId: 2 } })
    a.send({ type: 'CRASH', cause: { kind: 'boundary', side: 'ceiling' } })
    expect(a.getSnapshot().context.crashCause).toEqual({
      kind: 'pipe',
      pipeId: 2,
    })
  })
})
