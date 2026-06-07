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
