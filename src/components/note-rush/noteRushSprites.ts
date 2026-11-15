/*
 * The board's two characters, drawn on the chart canvas: the target notes
 * ("note buddies": a notehead with a stem, a flag and a face) and the singer's
 * avatar. Plain functions over a 2D context — the canvas component decides
 * where and in which state, these decide what it looks like.
 */
import {
  BOB_PERIOD_MS,
  HIT_POP_MS,
  MISS_DROOP_MS,
  PULSE_PERIOD_MS,
  RIPPLE_MS,
  SCORE_FLOAT_MS,
  SPAWN_POP_MS,
  animationProgress,
  easeOutBack,
  easeOutCubic,
} from './noteRushEffects'

export type NoteBuddyPhase = 'approaching' | 'capturable' | 'hit' | 'missed'

export type NoteBuddyColors = {
  fill: string
  stroke: string
  /* Eyes, mouth and the note name */
  face: string
  /* The ripple and the floating score of a hit */
  celebrate: string
}

type NoteBuddyParams = {
  x: number
  y: number
  label: string
  phase: NoteBuddyPhase
  colors: NoteBuddyColors
  /* The chart's clock, for the idle bob and pulse */
  now: number
  /* ms since the note entered the chart */
  ageMs: number
  /* ms since the note was hit or missed; Infinity once it has settled */
  resolvedMs: number
  /* Offsets the bob so neighbouring notes do not move in unison */
  seed: number
  /* Text floated above a fresh hit, e.g. "+1" or "×4" */
  scoreText: string
  /* false under reduced motion and on a frozen chart: draw the settled pose */
  isAnimated: boolean
}

/* px — the notehead's half-width and half-height: wide enough for a
 * three-character name such as "A♯3" under a pair of eyes. */
export const NOTE_HEAD_RADIUS_X = 16
const NOTE_HEAD_RADIUS_Y = 13
/* px — the stem rises from the head's trailing side; the flag curls off its top. */
const STEM_HEIGHT = 30
const STEM_WIDTH = 3
/* px — how far outside the chart a note is still worth drawing: head plus flag. */
export const NOTE_BUDDY_MARGIN = NOTE_HEAD_RADIUS_X + 14

/* px — eye offset from the head's centre, and the name's baseline centre below. */
const EYE_OFFSET_X = 5
const EYE_OFFSET_Y = -5
const LABEL_OFFSET_Y = 4.5

function drawFace(
  ctx: CanvasRenderingContext2D,
  phase: NoteBuddyPhase,
  color: string,
) {
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'

  for (const eyeX of [-EYE_OFFSET_X, EYE_OFFSET_X]) {
    ctx.beginPath()
    if (phase === 'hit') {
      /* Happy: eyes squeezed into upward arcs, "^ ^" */
      ctx.arc(eyeX, EYE_OFFSET_Y + 1, 2.4, Math.PI, Math.PI * 2)
      ctx.stroke()
    } else if (phase === 'missed') {
      /* Sad: flat closed eyes */
      ctx.moveTo(eyeX - 2, EYE_OFFSET_Y)
      ctx.lineTo(eyeX + 2, EYE_OFFSET_Y)
      ctx.stroke()
    } else {
      /* Wide-eyed once the note can be caught */
      ctx.arc(
        eyeX,
        EYE_OFFSET_Y,
        phase === 'capturable' ? 2.3 : 1.7,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }
}

export function drawNoteBuddy(
  ctx: CanvasRenderingContext2D,
  params: NoteBuddyParams,
) {
  const { x, y, phase, colors, now, isAnimated } = params
  const resolvedMs = isAnimated ? params.resolvedMs : Infinity

  let offsetY = 0
  let scaleX = 1
  let scaleY = 1
  let tilt = 0
  let alpha = 1

  if (isAnimated) {
    /* Grows in with a small overshoot as it enters at the live edge */
    const spawn = easeOutBack(animationProgress(params.ageMs, SPAWN_POP_MS))
    scaleX = spawn
    scaleY = spawn
  }

  if (phase === 'approaching' || phase === 'capturable') {
    if (isAnimated) {
      /* 2px idle bob; the seed spreads the notes across the cycle */
      offsetY =
        2 * Math.sin((now / BOB_PERIOD_MS) * Math.PI * 2 + params.seed * 1.7)
    }
  } else if (phase === 'hit') {
    /* Squash wide then spring back: one half-sine over the pop */
    const bump = Math.sin(Math.PI * animationProgress(resolvedMs, HIT_POP_MS))
    scaleX *= 1 + 0.3 * bump
    scaleY *= 1 - 0.15 * bump
  } else {
    /* Sags 6px, tips over a little and dims */
    const droop = easeOutCubic(animationProgress(resolvedMs, MISS_DROOP_MS))
    offsetY = 6 * droop
    tilt = 0.3 * droop
    alpha = 1 - 0.3 * droop
  }

  if (phase === 'capturable' && isAnimated) {
    /* "Sing me now": a ring that swells and fades, once per pulse */
    const pulse = (now % PULSE_PERIOD_MS) / PULSE_PERIOD_MS
    ctx.beginPath()
    ctx.ellipse(
      x,
      y + offsetY,
      NOTE_HEAD_RADIUS_X + 3 + 7 * pulse,
      NOTE_HEAD_RADIUS_Y + 3 + 7 * pulse,
      0,
      0,
      Math.PI * 2,
    )
    ctx.globalAlpha = 0.6 * (1 - pulse)
    ctx.strokeStyle = colors.stroke
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  if (phase === 'hit' && resolvedMs < RIPPLE_MS) {
    const ripple = easeOutCubic(animationProgress(resolvedMs, RIPPLE_MS))
    ctx.beginPath()
    /* Spreads 26px beyond the head */
    ctx.arc(x, y, NOTE_HEAD_RADIUS_X + 26 * ripple, 0, Math.PI * 2)
    ctx.globalAlpha = 0.7 * (1 - ripple)
    ctx.strokeStyle = colors.celebrate
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.save()
  ctx.translate(x, y + offsetY)
  ctx.rotate(tilt)
  ctx.scale(scaleX, scaleY)
  ctx.globalAlpha = alpha

  /* Stem and flag first, so the head overlaps the stem's foot */
  const stemX = NOTE_HEAD_RADIUS_X - STEM_WIDTH / 2
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = STEM_WIDTH
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(stemX, -2)
  ctx.lineTo(stemX, -STEM_HEIGHT)
  /* The flag: a curl off the top of the stem, out and back down */
  ctx.bezierCurveTo(
    stemX + 11,
    -STEM_HEIGHT + 5,
    stemX + 13,
    -STEM_HEIGHT + 12,
    stemX + 7,
    -STEM_HEIGHT + 19,
  )
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(0, 0, NOTE_HEAD_RADIUS_X, NOTE_HEAD_RADIUS_Y, 0, 0, Math.PI * 2)
  ctx.fillStyle = colors.fill
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = colors.stroke
  ctx.stroke()

  drawFace(ctx, phase, colors.face)

  ctx.font = 'bold 10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colors.face
  ctx.fillText(params.label, 0, LABEL_OFFSET_Y)

  ctx.restore()

  if (phase === 'hit' && resolvedMs < SCORE_FLOAT_MS) {
    const float = easeOutCubic(animationProgress(resolvedMs, SCORE_FLOAT_MS))
    ctx.font = 'bold 15px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = 1 - float
    ctx.fillStyle = colors.celebrate
    /* Starts clear of the head and rises 26px, left of the stem */
    ctx.fillText(
      params.scoreText,
      x - 4,
      y - NOTE_HEAD_RADIUS_Y - 10 - 26 * float,
    )
    ctx.globalAlpha = 1
  }
}

type SingerAvatarParams = {
  x: number
  y: number
  color: string
  /* +1 when the notes come from the right (LTR), -1 from the left (RTL) */
  facing: 1 | -1
  /* Recent heights of the avatar, newest first; drawn as its tail */
  tailYs: readonly number[]
}

/* px — the avatar's body, up from the old 5px dot so it reads as a character. */
export const SINGER_AVATAR_RADIUS = 9
/* px — distance between two beads of the tail. */
const TAIL_STEP = 5

export function drawSingerAvatar(
  ctx: CanvasRenderingContext2D,
  params: SingerAvatarParams,
) {
  const { x, y, color, facing, tailYs } = params

  /* Tail: beads trailing behind, shrinking and fading, following where the
   * voice has just been so it wiggles with the singing. */
  ctx.fillStyle = color
  for (let index = tailYs.length - 1; index >= 0; index--) {
    const fade = 1 - (index + 1) / (tailYs.length + 1)
    ctx.globalAlpha = 0.5 * fade
    ctx.beginPath()
    ctx.arc(
      x - facing * (SINGER_AVATAR_RADIUS + index * TAIL_STEP),
      tailYs[index],
      1.5 + (SINGER_AVATAR_RADIUS - 3) * fade,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  ctx.globalAlpha = 1

  ctx.beginPath()
  ctx.arc(x, y, SINGER_AVATAR_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  /* Eyes look toward the incoming notes: whites nudged that way, pupils more */
  for (const eyeX of [-3, 3]) {
    ctx.beginPath()
    ctx.arc(x + eyeX + facing * 1.5, y - 1.5, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x + eyeX + facing * 2.5, y - 1.5, 1.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
    ctx.fill()
  }
}
