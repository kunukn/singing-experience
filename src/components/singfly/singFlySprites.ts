/*
 * The bird, drawn on the game canvas. A plain function over a 2D context: the
 * canvas component decides where and in which state, this decides what it
 * looks like. Drawn facing right around (0, 0) and mirrored for RTL.
 */
import { BIRD_RADIUS } from './singFlyGeometry'
import { isBlinking, wingLift } from './singFlyEffects'

export type BirdPose = 'perched' | 'flying'

type BirdSpriteParams = {
  /* Centre of the body, bob included */
  x: number
  y: number
  /* +1 when the beak points right (LTR), -1 when it points left (RTL) */
  facing: 1 | -1
  pose: BirdPose
  isCrashed: boolean
  /* Beak open: a pitch is being sung right now */
  isSinging: boolean
  /* rad — nose up (-) or down (+), from the bird's vertical speed */
  tilt: number
  /* Multiplier on the wing swing, from the bird's vertical speed */
  flapStrength: number
  /* The canvas clock, for the wing beat and the blink */
  now: number
  /* false under reduced motion: draw the settled pose */
  isAnimated: boolean
}

const BODY_FILL = 'rgb(251, 191, 36)' // amber
const BODY_STROKE = 'rgb(180, 83, 9)' // burnt amber
const WING_FILL = 'rgb(245, 158, 11)' // a shade deeper than the body
const FACE_COLOR = 'rgb(15, 23, 42)'
const BEAK_FILL = 'rgb(234, 88, 12)'

/* px — the wing hangs off a shoulder just behind the body's centre. */
const SHOULDER_X = -1
const SHOULDER_Y = 1
const WING_LENGTH = 10
const WING_HALF_WIDTH = 3.5
/* rad — how far the wing swings above and below level in one beat (about 50°). */
const WING_SWING = 0.9
/* rad — a folded wing rests tip-down along the body. */
const WING_FOLDED_ANGLE = -0.35
/* px — how far the tail feathers reach behind the body. */
const TAIL_LENGTH = 4

export function drawBirdSprite(
  ctx: CanvasRenderingContext2D,
  params: BirdSpriteParams,
) {
  const { now, pose, isAnimated } = params

  ctx.save()
  ctx.translate(params.x, params.y)
  ctx.scale(params.facing, 1)
  /* After the mirror, so nose-up stays nose-up when the bird faces left */
  ctx.rotate(isAnimated ? params.tilt : 0)
  ctx.lineJoin = 'round'

  /* Tail first, so the body overlaps its root */
  ctx.fillStyle = BODY_STROKE
  ctx.beginPath()
  ctx.moveTo(-BIRD_RADIUS + 2, -2)
  ctx.lineTo(-BIRD_RADIUS - TAIL_LENGTH, -4)
  ctx.lineTo(-BIRD_RADIUS - TAIL_LENGTH, 3)
  ctx.lineTo(-BIRD_RADIUS + 2, 2)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = BODY_FILL
  ctx.strokeStyle = BODY_STROKE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  /* Wing: an ellipse pointing backward from the shoulder. A positive rotation
   * lifts its tip, since the wing points along -x. */
  let wingAngle = WING_FOLDED_ANGLE
  if (pose === 'flying') {
    wingAngle = isAnimated
      ? WING_SWING * params.flapStrength * wingLift(now)
      : 0
  }
  ctx.save()
  ctx.translate(SHOULDER_X, SHOULDER_Y)
  ctx.rotate(wingAngle)
  ctx.fillStyle = WING_FILL
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(
    -WING_LENGTH / 2,
    0,
    WING_LENGTH / 2,
    WING_HALF_WIDTH,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  /* Eye: a dot, a cross once crashed, or a short closed line during a blink */
  ctx.fillStyle = FACE_COLOR
  ctx.strokeStyle = FACE_COLOR
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (params.isCrashed) {
    ctx.moveTo(1.5, -3.5)
    ctx.lineTo(4.5, -0.5)
    ctx.moveTo(4.5, -3.5)
    ctx.lineTo(1.5, -0.5)
    ctx.stroke()
  } else if (isAnimated && isBlinking(now)) {
    ctx.moveTo(1.5, -2)
    ctx.lineTo(4.5, -2)
    ctx.stroke()
  } else {
    ctx.arc(3, -2, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  /* Burnt amber once crashed: the usual orange disappears against the red of
   * the pipe that killed the bird. */
  ctx.fillStyle = params.isCrashed ? BODY_STROKE : BEAK_FILL
  ctx.beginPath()
  if (params.isSinging && !params.isCrashed) {
    /* Open: the two halves part around the beak line */
    ctx.moveTo(BIRD_RADIUS, -3.5)
    ctx.lineTo(BIRD_RADIUS + 5, -2.5)
    ctx.lineTo(BIRD_RADIUS, -0.5)
    ctx.closePath()
    ctx.moveTo(BIRD_RADIUS, 0.5)
    ctx.lineTo(BIRD_RADIUS + 4, 2.5)
    ctx.lineTo(BIRD_RADIUS, 3.5)
    ctx.closePath()
  } else {
    ctx.moveTo(BIRD_RADIUS + 5, 0) // tip points outward
    ctx.lineTo(BIRD_RADIUS, -2) // base flush to body
    ctx.lineTo(BIRD_RADIUS, 2)
    ctx.closePath()
  }
  ctx.fill()

  ctx.restore()
}
