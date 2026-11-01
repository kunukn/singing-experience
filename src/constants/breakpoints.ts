/* Tailwind's xs (--breakpoint-xs: 30rem in style.css), for script. Change
 * together with style.css. */

/* Same query `max-xs:` compiles to, for useMediaQuery */
export const PHONE_MEDIA_QUERY = '(width < 30rem)'

/* xs in px, for VueUse's useBreakpoints, which takes px like breakpointsTailwind */
export const BREAKPOINT_XS_PX = 480
