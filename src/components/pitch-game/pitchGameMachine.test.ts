import { createActor } from 'xstate'
import { describe, expect, test } from 'vitest'
import { pitchGameMachine } from './pitchGameMachine'

/* Pure FSM tests — no Vue. Proves the graph only allows the legal lifecycle
 * transitions; a stray COMPLETE outside `playing` is structurally rejected. */

function actor() {
  const a = createActor(pitchGameMachine)
  a.start()
  return a
}

describe('pitchGameMachine', () => {
  test('starts idle', () => {
    expect(actor().getSnapshot().value).toBe('idle')
  })

  test('idle → playing on START', () => {
    const a = actor()
    a.send({ type: 'START' })
    expect(a.getSnapshot().value).toBe('playing')
  })

  test('COMPLETE is ignored outside playing (structural, no guard)', () => {
    const a = actor()
    a.send({ type: 'COMPLETE' })
    expect(a.getSnapshot().value).toBe('idle')
  })

  test('playing → complete on COMPLETE', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'COMPLETE' })
    expect(a.getSnapshot().value).toBe('complete')
  })

  test('RESET returns to idle from playing and complete', () => {
    const fromPlaying = actor()
    fromPlaying.send({ type: 'START' })
    fromPlaying.send({ type: 'RESET' })
    expect(fromPlaying.getSnapshot().value).toBe('idle')

    const fromComplete = actor()
    fromComplete.send({ type: 'START' })
    fromComplete.send({ type: 'COMPLETE' })
    fromComplete.send({ type: 'RESET' })
    expect(fromComplete.getSnapshot().value).toBe('idle')
  })

  test('replay: complete → playing on START', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'COMPLETE' })
    a.send({ type: 'START' })
    expect(a.getSnapshot().value).toBe('playing')
  })

  test('a second COMPLETE after the first is ignored (one end per round)', () => {
    const a = actor()
    a.send({ type: 'START' })
    a.send({ type: 'COMPLETE' })
    a.send({ type: 'COMPLETE' })
    expect(a.getSnapshot().value).toBe('complete')
  })
})
