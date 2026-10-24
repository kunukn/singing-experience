<template>
  <ProgramIconTile hue="sky">
    <!-- Target bars rushing in from the right; your pitch dot meets the next one -->
    <rect
      x="9"
      y="10.5"
      width="12"
      height="5"
      rx="2.5"
      fill="var(--icon-strong)"
    />
    <rect
      x="15"
      y="23.5"
      width="12"
      height="5"
      rx="2.5"
      fill="var(--icon-strong)"
    />
    <path
      d="M24 13h4M31 13h3M30 26h4"
      stroke="var(--icon-strong)"
      stroke-width="2"
      opacity="0.5"
    />
    <circle
      cx="9"
      cy="26"
      r="3"
      fill="var(--icon-light)"
      stroke="var(--icon-strong)"
      stroke-width="2"
    />
  </ProgramIconTile>
</template>
