<template>
  <ProgramIconTile hue="teal">
    <!-- Reference-pitch ring above the cents track, needle dead centre -->
    <circle
      cx="20"
      cy="14"
      r="7"
      fill="var(--icon-light)"
      stroke="var(--icon-strong)"
      stroke-width="2.5"
    />
    <circle cx="20" cy="14" r="2.5" fill="var(--icon-strong)" />
    <rect
      x="7"
      y="26.5"
      width="26"
      height="5"
      rx="2.5"
      stroke="var(--icon-strong)"
      stroke-width="1.5"
    />
    <path d="M20 24.5v9" stroke="var(--icon-strong)" stroke-width="3" />
  </ProgramIconTile>
</template>
