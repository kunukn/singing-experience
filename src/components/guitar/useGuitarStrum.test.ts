import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type Mock,
} from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { useGuitarStrum } from './useGuitarStrum'

const STRING_WIDTH = 60
const ROW_HEIGHT = 30
/* Centre of a column, where its string runs. */
const lineX = (stringIndex: number) => (stringIndex + 0.5) * STRING_WIDTH
/* Centre of a row. */
const rowY = (fret: number) => (fret + 0.5) * ROW_HEIGHT

type PointerOptions = {
  pointerId?: number
  pointerType?: string
  clientX: number
  clientY?: number
}

describe('useGuitarStrum', () => {
  let board: HTMLElement
  let scope: EffectScope
  let isAudioRunning: boolean
  let onPluck: Mock<(stringIndex: number, fret: number) => void>
  let unlockAudio: Mock<() => void>
  let consumeStrumClick: () => boolean

  function firePointer(type: string, options: PointerOptions) {
    const event = new PointerEvent(type, {
      bubbles: true,
      pointerId: options.pointerId ?? 1,
      pointerType: options.pointerType ?? 'touch',
      clientX: options.clientX,
      clientY: options.clientY ?? rowY(3),
    })
    board.dispatchEvent(event)
  }

  /* Each step gets its own moment, so the cooldown only bites where a test means
   * it to. */
  function swipe(fromX: number, toX: number, stepPx = 20) {
    firePointer('pointerdown', { clientX: fromX })
    const direction = Math.sign(toX - fromX)
    for (let x = fromX; x !== toX;) {
      x = Math.abs(toX - x) < stepPx ? toX : x + direction * stepPx
      vi.advanceTimersByTime(100)
      firePointer('pointermove', { clientX: x })
    }
    firePointer('pointerup', { clientX: toX })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    board = document.createElement('div')
    document.body.append(board)
    isAudioRunning = true
    onPluck = vi.fn<(stringIndex: number, fret: number) => void>()
    unlockAudio = vi.fn<() => void>()

    scope = effectScope()
    scope.run(() => {
      ;({ consumeStrumClick } = useGuitarStrum({
        target: shallowRef(board),
        stringWidth: STRING_WIDTH,
        rowHeight: ROW_HEIGHT,
        isAudioRunning: () => isAudioRunning,
        unlockAudio,
        onPluck,
      }))
    })
  })

  afterEach(() => {
    scope.stop()
    board.remove()
    vi.useRealTimers()
  })

  test('should pluck all six strings in order on a full swipe', () => {
    swipe(0, 360)

    expect(onPluck.mock.calls.map(([stringIndex]) => stringIndex)).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  test('should pluck in reverse order on an upstroke', () => {
    swipe(360, 0)

    expect(onPluck.mock.calls.map(([stringIndex]) => stringIndex)).toEqual([
      5, 4, 3, 2, 1, 0,
    ])
  })

  test('should not skip strings when one move jumps several columns', () => {
    swipe(0, 360, 360)

    expect(onPluck).toHaveBeenCalledTimes(6)
  })

  test('should not pluck on a wobbly tap on a string line', () => {
    firePointer('pointerdown', { clientX: lineX(2) - 2 })
    firePointer('pointermove', { clientX: lineX(2) + 2 })
    firePointer('pointerup', { clientX: lineX(2) + 2 })

    expect(onPluck).not.toHaveBeenCalled()
    expect(consumeStrumClick()).toBe(false)
  })

  test('should still sound a string crossed inside the threshold', () => {
    firePointer('pointerdown', { clientX: lineX(2) - 2 })
    firePointer('pointermove', { clientX: lineX(2) + 2 })
    firePointer('pointermove', { clientX: lineX(2) + 8 })

    expect(onPluck).toHaveBeenCalledOnce()
    expect(onPluck).toHaveBeenCalledWith(2, 3)
  })

  test('should hold the starting fret when the finger drifts between rows', () => {
    firePointer('pointerdown', { clientX: 0, clientY: rowY(3) })
    firePointer('pointermove', { clientX: lineX(0) + 1, clientY: rowY(5) })
    firePointer('pointermove', { clientX: lineX(1) + 1, clientY: rowY(8) })

    expect(onPluck.mock.calls).toEqual([
      [0, 3],
      [1, 3],
    ])
  })

  test('should measure from the board edge rather than the viewport', () => {
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
    } as DOMRect)

    firePointer('pointerdown', { clientX: 100, clientY: 50 + rowY(4) })
    firePointer('pointermove', { clientX: 100 + lineX(0) + 1 })

    expect(onPluck.mock.calls).toEqual([[0, 4]])
  })

  test('should not retrigger a string inside the cooldown', () => {
    firePointer('pointerdown', { clientX: lineX(1) - 10 })
    firePointer('pointermove', { clientX: lineX(1) + 10 })
    firePointer('pointermove', { clientX: lineX(1) - 10 })
    expect(onPluck).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(100)
    firePointer('pointermove', { clientX: lineX(1) + 10 })
    expect(onPluck).toHaveBeenCalledTimes(2)
  })

  test('should stop when the browser takes the gesture as a pan', () => {
    firePointer('pointerdown', { clientX: 0 })
    firePointer('pointercancel', { clientX: 0 })
    firePointer('pointermove', { clientX: 360 })

    expect(onPluck).not.toHaveBeenCalled()
  })

  test('should ignore a mouse', () => {
    firePointer('pointerdown', { pointerType: 'mouse', clientX: 0 })
    firePointer('pointermove', { pointerType: 'mouse', clientX: 360 })

    expect(onPluck).not.toHaveBeenCalled()
    expect(unlockAudio).not.toHaveBeenCalled()
  })

  test('should track two fingers independently', () => {
    firePointer('pointerdown', { pointerId: 1, clientX: lineX(0) - 10 })
    firePointer('pointerdown', { pointerId: 2, clientX: lineX(3) - 10 })
    firePointer('pointermove', { pointerId: 1, clientX: lineX(0) + 10 })
    firePointer('pointermove', { pointerId: 2, clientX: lineX(3) + 10 })

    expect(onPluck.mock.calls.map(([stringIndex]) => stringIndex)).toEqual([
      0, 3,
    ])
  })

  test('should drop plucks while audio is not running, then sound again', () => {
    isAudioRunning = false
    swipe(0, 360)
    expect(onPluck).not.toHaveBeenCalled()
    expect(consumeStrumClick()).toBe(false)

    isAudioRunning = true
    swipe(0, 360)
    expect(onPluck).toHaveBeenCalledTimes(6)
  })

  test('should try to unlock audio on press and on lift', () => {
    firePointer('pointerdown', { clientX: 0 })
    expect(unlockAudio).toHaveBeenCalledOnce()

    firePointer('pointerup', { clientX: 0 })
    expect(unlockAudio).toHaveBeenCalledTimes(2)
  })

  test('should report the leftover click of a strum exactly once', () => {
    swipe(0, 360)

    expect(consumeStrumClick()).toBe(true)
    expect(consumeStrumClick()).toBe(false)
  })

  test('should forget an unclaimed strum when the next press starts', () => {
    swipe(0, 360)
    firePointer('pointerdown', { clientX: 0 })

    expect(consumeStrumClick()).toBe(false)
  })
})
