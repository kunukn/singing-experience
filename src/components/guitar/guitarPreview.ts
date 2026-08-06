/*
 * Which singer a live-pitch lane belongs to: 'low' is the single voice in
 * normal mode and the lower band in duet mode, 'high' the second singer.
 * Mirrors the piano's lane ids — the geometry differs per instrument, the lane
 * identity does not.
 */
export type GuitarPreviewLaneId = 'low' | 'high'
