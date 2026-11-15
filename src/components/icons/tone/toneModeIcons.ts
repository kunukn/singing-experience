import type { ToneMode } from '@/composables/toneEngine'

/*
 * Outline icon per tone sound, drawn on a 24×24 grid with a 2-unit round
 * stroke in currentColor (see ToneModeIcon). Record<ToneMode, …> makes a new
 * tone mode fail the type check until it has an icon.
 */
export const TONE_MODE_ICONS: Record<ToneMode, string> = {
  bell: 'M12 3v2M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0',
  tuning: 'M8 3v8a4 4 0 0 0 8 0V3M12 15v6',
  /* Same fork, narrower, with sound arcs: Tuning 2 is the louder variant */
  tuning2:
    'M9 3v8a3 3 0 0 0 6 0V3M12 14v7M6.5 5.5a3.5 3.5 0 0 0 0 5M3.5 4a6 6 0 0 0 0 8M17.5 5.5a3.5 3.5 0 0 1 0 5M20.5 4a6 6 0 0 1 0 8',
  /* Pipe façade: tallest in the middle, on a wind chest */
  organ: 'M4 17v-6M8 17V7M12 17V3M16 17V7M20 17v-6M3 17h18v4H3Z',
  /* Tube held at a slant, three finger holes */
  flute:
    'M3.23 17.23 17.23 3.23a2.5 2.5 0 0 1 3.54 3.54L6.77 20.77a2.5 2.5 0 0 1-3.54-3.54ZM9.5 14.5h.01M12 12h.01M14.5 9.5h.01',
  /* Key bed with two black keys (a 1-unit box the stroke fills solid); the
   * white-key gaps run on below them */
  keyboard:
    'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7.5 5v7h1V5M8 12v7M12 5v14M15.5 5v7h1V5M16 12v7',
  /* Two-bout body, long neck and headstock */
  bass: 'M7.83 11.51A5 5 0 1 0 12.49 16.17 3.5 3.5 0 1 0 7.83 11.51ZM13.47 10.53 19.44 4.56M18.73 3.85l2.12-2.12 1.42 1.42-2.12 2.12Z',
  square:
    'M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
}
