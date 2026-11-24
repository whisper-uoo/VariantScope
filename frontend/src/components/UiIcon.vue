<script setup lang="ts">
defineProps<{ name: string }>();
const paths: Record<string, string[]> = {
  overview: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
  datasets: ["M4 5h16v15H4z", "M8 2v6", "M16 2v6", "M4 11h16"],
  variants: [
    "M4 5h16",
    "M4 12h16",
    "M4 19h16",
    "M9 3v4",
    "M15 10v4",
    "M8 17v4",
  ],
  analysis: ["M4 3v17h17", "M8 15v-4", "M13 15V6", "M18 15v-7"],
  info: ["M12 11v6", "M12 7h.01"],
  upload: ["M12 16V3", "M7 8l5-5 5 5", "M4 16v5h16v-5"],
  download: ["M12 3v13", "M7 11l5 5 5-5", "M4 17v4h16v-4"],
  plus: ["M12 5v14", "M5 12h14"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  filter: ["M4 6h16", "M7 12h10", "M10 18h4"],
  chevron: ["M9 5l7 7-7 7"],
  refresh: [
    "M20 7v5h-5",
    "M4 17v-5h5",
    "M6.1 6.1A8 8 0 0 1 19 9",
    "M5 15a8 8 0 0 0 12.9 2.9",
  ],
  file: ["M5 3h9l5 5v13H5z", "M14 3v6h5", "M8 13h8", "M8 17h5"],
  check: ["M5 12l4 4L19 6"],
  search: ["M21 21l-5-5"],
  trash: ["M3 6h18", "M9 6V3h6v3", "M6 6l1 15h10l1-15", "M10 10v7", "M14 10v7"],
  external: ["M14 3h7v7", "M21 3l-9 9", "M10 3H3v18h18v-7"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
};
</script>
<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle v-if="name === 'info'" cx="12" cy="12" r="9" />
    <circle v-if="name === 'search'" cx="10.5" cy="10.5" r="6.5" />
    <path v-for="(p, i) in paths[name] || paths.file" :key="i" :d="p" />
  </svg>
</template>
