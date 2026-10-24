<template>
  <ProgramIconTile hue="purple">
    <!-- A row of note cards, one per tone sounding at once -->
    <rect
      x="5.5"
      y="15"
      width="8.5"
      height="14"
      rx="2"
      fill="var(--icon-strong)"
      opacity="0.6"
    />
    <rect
      x="15.75"
      y="11"
      width="8.5"
      height="14"
      rx="2"
      fill="var(--icon-strong)"
    />
    <rect
      x="26"
      y="13"
      width="8.5"
      height="14"
      rx="2"
      fill="var(--icon-strong)"
      opacity="0.8"
    />
    <g fill="var(--icon-light)" stroke="var(--icon-light)" stroke-width="1.25">
      <ellipse
        cx="9.1"
        cy="25"
        rx="1.8"
        ry="1.3"
        transform="rotate(-20 9.1 25)"
        stroke="none"
      />
      <path d="M10.6 24.6V18.5" />
      <ellipse
        cx="19.35"
        cy="21"
        rx="1.8"
        ry="1.3"
        transform="rotate(-20 19.35 21)"
        stroke="none"
      />
      <path d="M20.85 20.6V14.5" />
      <ellipse
        cx="29.6"
        cy="23"
        rx="1.8"
        ry="1.3"
        transform="rotate(-20 29.6 23)"
        stroke="none"
      />
      <path d="M31.1 22.6V16.5" />
    </g>
  </ProgramIconTile>
</template>
