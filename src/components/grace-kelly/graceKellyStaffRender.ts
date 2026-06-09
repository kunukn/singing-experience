/* abcjs font strings are '<family> <size>'. Centralized so the lyric and label
 * sizes stay in sync across the single-voice sheet, the sing sheet, and the
 * stacked all-parts overview — one edit changes all three. */
const STAFF_FONT_FAMILY = 'sans-serif'
/* The `w:` lyric line under the staff; 1px smaller than labels so syllables read
 * less crowded. */
export const STAFF_LYRIC_FONT = `${STAFF_FONT_FAMILY} 10`
/* Staff title and composer credit drawn above the staff. */
export const STAFF_LABEL_FONT = `${STAFF_FONT_FAMILY} 13`

/* Right edge (px, relative to the container) of the rightmost drawn music —
 * the final barline or note. Used to size a staff so it hugs the music instead
 * of trailing empty staff out to the oversized probe width. Shared by the
 * single-voice sheet and the all-parts overview. */
export function measureMusicWidth(container: HTMLElement): number {
  const containerLeft = container.getBoundingClientRect().left
  let maxRight = 0
  for (const element of container.querySelectorAll('.abcjs-bar, .abcjs-note')) {
    const right = element.getBoundingClientRect().right - containerLeft
    if (right > maxRight) maxRight = right
  }

  return maxRight
}
