<template>
  <ProgramIconTile hue="amber" accentHue="blue">
    <!-- Fretboard: nut, two frets, three strings and a fingered note -->
    <rect
      x="5"
      y="11"
      width="30"
      height="18"
      rx="2.5"
      fill="var(--icon-strong)"
    />
    <path d="M10 11v18" stroke="var(--icon-light)" stroke-width="3" />
    <path
      d="M19 11v18M28 11v18"
      stroke="var(--icon-light)"
      stroke-width="1.5"
      opacity="0.6"
    />
    <path
      d="M5 15.5h30M5 20h30M5 24.5h30"
      stroke="var(--icon-light)"
      stroke-width="1.25"
    />
    <circle
      cx="23.5"
      cy="20"
      r="3.5"
      fill="var(--icon-accent)"
      stroke="var(--icon-light)"
      stroke-width="1.5"
    />
  </ProgramIconTile>
</template>
