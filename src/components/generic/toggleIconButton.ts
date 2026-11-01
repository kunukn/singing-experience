/* Screen widths (Tailwind breakpoints) from which a toggle's text label shows */
export type ToggleLabelBreakpoint = 'sm' | 'md' | 'lg'

/* When a ToggleIconButton shows its text label: from a breakpoint up,
 * 'always', or 'never' (a circle at every width) */
export type ToggleLabelFrom = 'always' | ToggleLabelBreakpoint | 'never'
