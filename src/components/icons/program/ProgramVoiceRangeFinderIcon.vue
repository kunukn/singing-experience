<template>
  <ProgramIconTile hue="rose">
    <!-- Highest and lowest note on their ledger lines, the reach between them -->
    <path
      d="M21 10h12M7 30h12"
      stroke="var(--icon-strong)"
      stroke-width="1.5"
    />
    <ellipse
      cx="27"
      cy="10"
      rx="4"
      ry="3"
      transform="rotate(-20 27 10)"
      fill="var(--icon-strong)"
    />
    <ellipse
      cx="13"
      cy="30"
      rx="4"
      ry="3"
      transform="rotate(-20 13 30)"
      fill="var(--icon-light)"
      stroke="var(--icon-strong)"
      stroke-width="2"
    />
    <path
      d="M20 14v12M16.5 17.5 20 14l3.5 3.5M16.5 22.5 20 26l3.5-3.5"
      stroke="var(--icon-accent)"
      stroke-width="2.5"
    />
  </ProgramIconTile>
</template>
