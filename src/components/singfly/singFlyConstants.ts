import type { Difficulty } from './singFlyOptions'

/* Visible time width of the chart in milliseconds. */
export const HISTORY_WINDOW_MS = 5000

/* Gap between consecutive pipe centers per difficulty. At ~0.14 px/ms
 * (700px / HISTORY_WINDOW_MS) that's ~392 / ~266 / ~196 px between pipes —
 * normal 1900ms gives a comfortable slide between any two notes in a voice
 * range (widened from the original 1500ms, whose pillars read as cramped);
 * easy widens it generously so a casual singer has time to find and hold
 * each pitch, hard tightens it (eased from the original 1200ms, which read
 * as frantic). The smallest interval (1400ms) still dwarfs PIPE_JITTER_MS
 * so pipes never visually collide. */
export const DIFFICULTY_PIPE_INTERVAL_MS: Record<Difficulty, number> = {
  easy: 2800,
  normal: 1900,
  hard: 1400,
}

/* Max semitone distance between two consecutive pipes' notes. easy caps the
 * leap so the player never has to jump a large interval; normal/hard stay
 * unbounded (Infinity → full voice-range pick, the original behavior). */
export const DIFFICULTY_MAX_NOTE_STEP_SEMITONES: Record<Difficulty, number> = {
  easy: 4,
  normal: Infinity,
  hard: Infinity,
}

/* Position of the pickup line, as a fraction of the visible chart width
 * measured from the label-axis side toward the live edge. The bird sits on
 * this line. 0.20 keeps the bird near the label axis so pipes have a long
 * approach from the live edge before reaching it, with a short capture
 * window between the bird and the label axis. */
export const GAME_PICKUP_LINE_RATIO = 0.2

/* Half-height of the pipe gap, in MIDI semitones, per difficulty. THE single
 * source of truth for "is the bird in the gap": the renderer draws the gap
 * this many semitones above/below the target, the scoring gate passes when
 * |singerMidi - target.midi| <= this, and the collision test crashes when it
 * exceeds this (see isPitchInGap in singFlyGeometry). One number → drawn
 * gap, scored band and crash band are identical at every canvas size and
 * voice range. easy widens it so a casual singer a semitone off (e.g. D#3
 * against a D3 pipe) still flies through and scores; hard demands near-exact
 * pitch. */
export const DIFFICULTY_GAP_HALF_SEMITONES: Record<Difficulty, number> = {
  easy: 2,
  normal: 1.5,
  hard: 1,
}

/* Minimum semitones a singer may stray past the selected voice range
 * (midiMax/midiMin) before the bird crashes into the ceiling/floor — the floor
 * the wall placement never goes below. The effective tolerance is
 * boundaryToleranceSemitones = max(this, gapHalfSemitones), so the wall recedes
 * to the difficulty's gap half (an edge note's full opening must clear it) but
 * never sits closer than this when the gap is tiny. The wall itself is fully
 * fatal (debounced by CRASH_GRACE_MS so an octave/fifth pitch fluke can't
 * instant-kill — same protection wall crashes get). */
export const OUT_OF_RANGE_TOLERANCE_SEMITONES = 1

/* Empty visible buffer (semitones) kept between the range-edge line and the
 * lethal floor/ceiling wall. The visible chart band extends this far PAST the
 * wall so the wall always renders as a real bar (never a sliver) and a
 * range-edge note's full gap clears it. rangePadSemitones (singFlyGeometry)
 * = boundary tolerance + this. */
export const RANGE_PAD_BUFFER_SEMITONES = 1

/* Clarity gate for SingFly's detection (passed to usePitchDetection instead
 * of the 0.9 scoring-game default). SingFly is a continuous tone→height game,
 * so it deliberately runs a far more forgiving gate than the note-scoring
 * games — soft/breathy singing should still fly the bird. But a gate of 0
 * accepts breath, plosives and room tone: pitchy resolves them to an in-range
 * frequency at very low clarity, the stabilizer adopts the sustained ones, and
 * the bird dives into a wall (an accidental death the player never sang). This
 * floor sits ABOVE typical breath/room-noise clarity (≲0.3–0.4) yet well BELOW
 * the clean-singing default, so real soft singing still moves the bird while
 * breath is rejected → the bird HOLDS its last position instead of false-
 * crashing. Equals MIN_CLARITY_THRESHOLD: the conservative floor below which
 * the returned frequency is no longer a meaningful pitch. */
export const SINGFLY_CLARITY_THRESHOLD = 0.5

/* --- Pitch stabilizer (useStablePitch) anti-flicker tunables ---
 * Raw detection emits occasional single-frame spikes (pitchy octave/fifth
 * errors, noise transients). These tame them before the pitch drives the
 * bird and the collision/scoring logic, without lagging normal singing. */

/* Rolling-median window. ~80ms ≈ 5 frames at 60fps, so the median outvotes
 * up to two consecutive bad frames regardless of how far off they are — a
 * cheap pre-filter ahead of the temporal dwell below. */
export const STABILIZE_MEDIAN_WINDOW_MS = 80
/* Cold start (no held tone yet): a pitch must persist this long before it is
 * adopted, so a stray blip at the start of a phrase never seeds the bird. */
export const STABILIZE_START_HOLD_MS = 100
/* A "far" jump (≥ STABILIZE_FAR_SEMITONES) away from the held tone must persist
 * this long before it is adopted — a brief octave/fifth spike is ignored, a
 * deliberate leap lands after ~100ms. */
export const STABILIZE_JUMP_HOLD_MS = 100
/* Distance (semitones) that classifies a change from the held tone as a
 * suspicious "far" jump (→ JUMP_HOLD) rather than an ordinary change. 7 = a
 * fifth: catches the classic octave (12) and fifth (7) pitch-detector errors. */
export const STABILIZE_FAR_SEMITONES = 7
/* Universal fluke gate: ANY change of at least STABILIZE_ACCEPT_BAND_SEMITONES
 * (but below FAR) must hold this long before the bird adopts it, so a brief
 * detector spike / background-noise blip (e.g. C3→F#2 for ~30ms) is ignored.
 * Well under every pipe interval, so a deliberate note change is imperceptibly
 * delayed. */
export const STABILIZE_ACCEPT_HOLD_MS = 50
/* Below this semitone distance a change is treated as micro-drift (vibrato,
 * expressive wobble, a smooth glissando the bird chases frame-by-frame) and
 * adopted instantly — sustained singing has zero added latency. It is also the
 * candidate-coherence band: a dwell only completes if successive medians stay
 * within this of the candidate anchor, so a wandering spike never adopts while
 * a steady new note does. */
export const STABILIZE_ACCEPT_BAND_SEMITONES = 2

/* --- Bird motion (useBirdMotion) — constant-time, never teleport ---
 * Sits after the stabilizer: the stabilizer decides WHICH note, this decides
 * HOW the bird travels there. Exponential ease toward the target, with a
 * distance-aware speed cap so the bird reaches ANY *confirmed* note in roughly
 * the same short time (BIRD_MOTION_TRAVERSAL_MS) regardless of interval size —
 * a small move and an octave take ~the same time, so big leaps in hard mode are
 * actually catchable. The never-teleport / anti-fluke guarantee does NOT rest
 * on this cap: this stage is fed the ALREADY-stabilized pitch, so a fluke is
 * gated upstream by the stabilizer's STABILIZE_JUMP_HOLD_MS and again by
 * CRASH_GRACE_MS in useSingFly; the BIRD_MOTION_MAX_DT_MS clamp still bounds
 * any single step. The output is the single value driving both the drawn bird
 * and collision, so they stay in lockstep. */

/* Ease time constant. Small moves (vibrato, glissando, the stabilizer's
 * instant near-drift) track snappily; it also shapes the soft landing on the
 * last semitone after a big jump's capped run. */
export const BIRD_MOTION_TAU_MS = 70
/* Floor on bird speed (semitones/s). For small moves (≲3 st) the TAU ease per
 * frame is already below this, so the floor never bites and the bird keeps
 * today's gentle vibrato/glissando feel — small moves are unchanged. */
export const BIRD_MOTION_BASE_RATE_SEMITONES_PER_S = 40
/* The effective per-frame speed cap is
 *   max(BASE_RATE, |diff| / (this/1000)) semitones/s.
 * Picked so this distance-proportional term sits just ABOVE the BIRD_MOTION_TAU_MS
 * ease for a normal ~16ms frame: a confirmed jump is therefore governed by the
 * 70ms ease itself, not throttled by the cap (the OLD fixed 40 st/s cap is what
 * made big jumps crawl). Net: any jump reaches the gap in ~TAU·ln(distance) —
 * an octave in ~175ms, a fifth in ~135ms — roughly constant and always well
 * under every DIFFICULTY_PIPE_INTERVAL_MS, so a deliberate leap beats the pipe.
 * The cap (plus the BIRD_MOTION_MAX_DT_MS clamp) still bounds a single
 * abnormal-dt step, so a fluke that slipped past the stabilizer can't teleport;
 * the real anti-fluke gates remain STABILIZE_JUMP_HOLD_MS + CRASH_GRACE_MS. */
export const BIRD_MOTION_TRAVERSAL_MS = 75
/* dt clamp. After a RAF stall / backgrounded tab an unclamped dt would let the
 * speed cap produce one huge step (a teleport); clamping dt keeps the
 * never-teleport guarantee true even then. */
export const BIRD_MOTION_MAX_DT_MS = 50

/* --- Bird flight-path trace (SingFlyCanvas) ---
 * A faint breadcrumb of where the bird flew, scrolling left with the field. */

/* Capture cadence. ~every 4 frames at 60fps; over the ~1s visible window
 * that's ~16 dots — a readable dotted trail without crowding. */
export const TRACE_SAMPLE_INTERVAL_MS = 60
/* Dot radius (CSS px). Thin — well under BIRD_RADIUS (9) and the gap labels,
 * so the trace reads as a quiet reference, not a focal element. */
export const TRACE_DOT_RADIUS = 1.6
/* A trace point's max visible age: it spawns at the pickup line and exits at
 * the label axis. Equals the time the field takes to scroll that 0.2-of-width
 * span, so the trace stays glued to the pipes it passed. Used to prune the
 * buffer and to guard draw/scrub. */
export const TRACE_MAX_AGE_MS = HISTORY_WINDOW_MS * GAME_PICKUP_LINE_RATIO
/* A sung note must hold the same semitone continuously for at least this long
 * before its label is stamped onto the trace. Tweak after play-testing. */
export const TRACE_LABEL_MIN_HOLD_MS = 300
