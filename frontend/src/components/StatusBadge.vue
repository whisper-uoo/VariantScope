<script setup lang="ts">
defineProps<{ status: string }>();
const names: Record<string, string> = {
  READY: "已就绪",
  FAILED: "导入失败",
  IMPORTING: "解析中",
};
</script>
<template>
  <span class="status-badge" :class="status.toLowerCase()">
    <i> </i>{{ names[status] || status }}</span
  >
</template>
