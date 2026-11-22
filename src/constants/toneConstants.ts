/* How long a note label stays highlighted after clicking to play — long enough to see, short enough to feel responsive */
export const TONE_CLICK_HIGHLIGHT_DURATION_MS = 700

/* Default duration a tone is played audibly (seconds) — used by playTone when no duration is passed */
export const TONE_PLAY_DURATION_S = 1

/*
 * How far ahead of the audio clock a pressed key is scheduled (seconds). A note
 * stamped with the clock's current time is already in the past when the audio
 * thread renders it, and a voice's oscillators and envelopes can then miss
 * their attack: the note sounds without its strike, or not at all. Measured in
 * Chromium and WebKit: about 1 press in 15 at no lead, none at 30 ms.
 */
export const TONE_PRESS_LEAD_S = 0.03
