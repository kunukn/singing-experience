import { describe, expect, test } from 'vitest'
import { createActor } from 'xstate'
import { songRecorderMachine } from './songRecorderMachine'

function startActor() {
  const actor = createActor(songRecorderMachine)
  actor.start()

  return actor
}

function toReview() {
  const actor = startActor()
  actor.send({ type: 'RECORD' })
  actor.send({ type: 'COUNT_IN_DONE' })
  actor.send({ type: 'STOP' })

  return actor
}

describe('songRecorderMachine', () => {
  test('starts idle', () => {
    expect(startActor().getSnapshot().value).toBe('idle')
  })

  test('goes idle → countIn → recording', () => {
    const actor = startActor()
    actor.send({ type: 'RECORD' })
    expect(actor.getSnapshot().value).toBe('countIn')

    actor.send({ type: 'COUNT_IN_DONE' })
    expect(actor.getSnapshot().value).toBe('recording')
  })

  test('abandons the take when stopped during the count-in', () => {
    const actor = startActor()
    actor.send({ type: 'RECORD' })
    actor.send({ type: 'STOP' })
    expect(actor.getSnapshot().value).toBe('idle')
  })

  test.each(['STOP', 'LIMIT_REACHED'] as const)(
    'should enter review on %s while recording',
    (type) => {
      const actor = startActor()
      actor.send({ type: 'RECORD' })
      actor.send({ type: 'COUNT_IN_DONE' })
      actor.send({ type })
      expect(actor.getSnapshot().value).toEqual({ review: 'stopped' })
    },
  )

  test('returns to idle on ERROR while recording', () => {
    const actor = startActor()
    actor.send({ type: 'RECORD' })
    actor.send({ type: 'COUNT_IN_DONE' })
    actor.send({ type: 'ERROR' })
    expect(actor.getSnapshot().value).toBe('idle')
  })

  test('ignores PLAY outside review', () => {
    const actor = startActor()
    actor.send({ type: 'PLAY' })
    expect(actor.getSnapshot().value).toBe('idle')
  })

  test('cycles the playback transport inside review', () => {
    const actor = toReview()
    actor.send({ type: 'PLAY' })
    expect(actor.getSnapshot().value).toEqual({ review: 'playing' })

    actor.send({ type: 'PAUSE' })
    expect(actor.getSnapshot().value).toEqual({ review: 'paused' })

    actor.send({ type: 'RESUME' })
    expect(actor.getSnapshot().value).toEqual({ review: 'playing' })

    actor.send({ type: 'PLAYBACK_DONE' })
    expect(actor.getSnapshot().value).toEqual({ review: 'stopped' })
  })

  test('stops playback from paused', () => {
    const actor = toReview()
    actor.send({ type: 'PLAY' })
    actor.send({ type: 'PAUSE' })
    actor.send({ type: 'STOP_PLAYBACK' })
    expect(actor.getSnapshot().value).toEqual({ review: 'stopped' })
  })

  test('goes idle → review on IMPORT', () => {
    const actor = startActor()
    actor.send({ type: 'IMPORT' })
    expect(actor.getSnapshot().value).toEqual({ review: 'stopped' })
  })

  test('IMPORT during playback lands on a stopped transport', () => {
    const actor = toReview()
    actor.send({ type: 'PLAY' })
    actor.send({ type: 'IMPORT' })
    expect(actor.getSnapshot().value).toEqual({ review: 'stopped' })
  })

  test('ignores IMPORT mid-take', () => {
    const actor = startActor()
    actor.send({ type: 'RECORD' })
    actor.send({ type: 'IMPORT' })
    expect(actor.getSnapshot().value).toBe('countIn')

    actor.send({ type: 'COUNT_IN_DONE' })
    actor.send({ type: 'IMPORT' })
    expect(actor.getSnapshot().value).toBe('recording')
  })

  test('RESET from any review state returns to idle', () => {
    const actor = toReview()
    actor.send({ type: 'PLAY' })
    actor.send({ type: 'RESET' })
    expect(actor.getSnapshot().value).toBe('idle')
  })
})
