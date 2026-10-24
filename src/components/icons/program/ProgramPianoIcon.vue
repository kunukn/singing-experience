<template>
  <ProgramIconTile hue="blue" accentHue="emerald">
    <!-- Voice-range ribbon with the sung note landing on a lit key -->
    <path
      d="M9 9h22"
      stroke="var(--icon-strong)"
      stroke-width="2.5"
      opacity="0.35"
    />
    <path d="M29.75 9v4" stroke="var(--icon-accent)" stroke-width="2" />
    <circle cx="29.75" cy="9" r="3" fill="var(--icon-accent)" />
    <rect x="7" y="16" width="26" height="18" rx="3" fill="var(--icon-light)" />
    <path
      d="M26.5 16H30a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-3.5z"
      fill="var(--icon-strong)"
      opacity="0.55"
    />
    <path
      d="M13.5 25v9M20 25v9M26.5 16v18"
      stroke="var(--icon-strong)"
      stroke-width="1.5"
    />
    <path
      d="M11.7 16h3.6v8.5a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1zM18.2 16h3.6v8.5a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1z"
      fill="var(--icon-strong)"
    />
    <rect
      x="7"
      y="16"
      width="26"
      height="18"
      rx="3"
      stroke="var(--icon-strong)"
      stroke-width="2.5"
    />
  </ProgramIconTile>
</template>
