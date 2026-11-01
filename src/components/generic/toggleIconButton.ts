/* Screen widths from which a toggle's text label shows: Tailwind's, plus xs
 * (480px) below sm for rows with room for text on a large phone */
export type ToggleLabelBreakpoint = 'xs' | 'sm' | 'md' | 'lg'

export const TOGGLE_LABEL_XS_PX = 480

/* When a ToggleIconButton shows its text label: from a breakpoint up,
 * 'always', or 'never' (a circle at every width) */
export type ToggleLabelFrom = 'always' | ToggleLabelBreakpoint | 'never'
