/* Screen widths from which a toggle's text label shows: Tailwind's, plus the
 * app's xs (BREAKPOINT_XS_PX) for rows with room for text on a large phone */
export type ToggleLabelBreakpoint = 'xs' | 'sm' | 'md' | 'lg'

/* When a ToggleIconButton shows its text label: from a breakpoint up,
 * 'always', or 'never' (a circle at every width) */
export type ToggleLabelFrom = 'always' | ToggleLabelBreakpoint | 'never'
