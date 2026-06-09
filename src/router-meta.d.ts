import 'vue-router'

/*
 * Module augmentation must use `interface` to merge into vue-router's existing
 * `RouteMeta` interface — `type` cannot extend a declaration across modules.
 */
declare module 'vue-router' {
  interface RouteMeta {
    /* Opt a page out of the default centered max-w-3xl column so it spans the
     * full viewport width (read in App.vue). */
    fullWidth?: boolean
    /* Show the landing-only LanguageSwitcher (read in TopBar.vue). Absent on the
     * initial START_LOCATION render, so the switcher stays hidden until the route
     * resolves rather than flashing on non-landing pages. */
    isLandingPage?: boolean
  }
}
