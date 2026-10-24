/*
 * Passthrough for a size="small" PrimeButton whose icon should match the 20px
 * header icons. `.p-button-sm .p-button-icon` sets the small font size
 * directly, ignoring --p-icon-size, and as unlayered CSS it beats a layered
 * Tailwind utility — hence `text-xl!`. -my-1 lets the taller glyph overhang
 * the padding, so the button keeps the 35px control height of its row.
 */
export const LARGE_SMALL_BUTTON_ICON_PT = {
  icon: { class: 'text-xl! -my-1' },
} as const
