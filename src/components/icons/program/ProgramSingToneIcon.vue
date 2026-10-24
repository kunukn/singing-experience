<template>
  <ProgramIconTile hue="orange">
    <!-- Dashed target tone; the sung pitch rises to meet it and locks on -->
    <path
      d="M7 15h26"
      stroke="var(--icon-strong)"
      stroke-width="2"
      stroke-dasharray="3 3"
      opacity="0.55"
    />
    <path
      d="M7 30c6 0 7-15 14-15h2"
      stroke="var(--icon-strong)"
      stroke-width="2.5"
    />
    <circle
      cx="28"
      cy="15"
      r="5"
      fill="var(--icon-light)"
      stroke="var(--icon-strong)"
      stroke-width="2.5"
    />
    <circle cx="28" cy="15" r="1.75" fill="var(--icon-strong)" />
  </ProgramIconTile>
</template>
