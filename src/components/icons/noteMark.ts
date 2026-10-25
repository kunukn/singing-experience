/*
 * Brand note mark on a 40×40 grid: two tilted oval heads plus one filled
 * outline for both stems and the beam. Shared by NoteIcon, MusicNoteIcon and
 * the favicon string; public/icons/note.svg is a hand copy because a static
 * file can't import this.
 */
export const NOTE_HEADS = [
  { cx: 13.5, cy: 29.5, rx: 4, ry: 3, transform: 'rotate(-20 13.5 29.5)' },
  { cx: 26.5, cy: 26.5, rx: 4, ry: 3, transform: 'rotate(-20 26.5 26.5)' },
] as const

/*
 * Stems are 2.5 wide with their right edge on each head's rightmost point
 * (x 17.4 / 30.4); the beam keeps a −0.23 slope with vertical ends flush with
 * the stems. Each Q rounds a corner: radius 1 outside, 1.2 where a stem meets
 * the beam's underside. Stem bottoms end hidden inside the heads.
 */
export const NOTE_STEMS_BEAM_PATH =
  'M14.9 29.5V12.6Q14.9 11.6 15.87 11.37L29.43 8.23Q30.4 8 30.4 9V26.5H27.9V14.28Q27.9 13.08 26.73 13.35L18.57 15.25Q17.4 15.52 17.4 16.72V29.5Z'
