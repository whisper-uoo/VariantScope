<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import UiIcon from "./UiIcon.vue";
defineProps<{ title: string; drawer?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const el = ref<HTMLDialogElement>();
let previous: HTMLElement | null = null;
let overflow = "";
onMounted(() => {
  previous = document.activeElement as HTMLElement;
  overflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  el.value?.showModal();
});
onBeforeUnmount(() => {
  el.value?.close();
  document.body.style.overflow = overflow;
  previous?.focus();
});
</script>
<template>
  <dialog
    ref="el"
    :class="['dialog', { 'detail-dialog': drawer }]"
    :aria-label="title"
    @cancel.prevent="emit('close')"
    @click="
      (e) => {
        if (e.target === el) emit('close');
      }
    "
  >
    <div class="dialog-inner">
      <header class="dialog-head">
        <h2>{{ title }}</h2>
        <button
          class="icon-button"
          aria-label="关闭弹窗"
          @click="emit('close')"
        >
          <UiIcon name="close" />
        </button>
      </header>
      <slot />
    </div>
  </dialog>
</template>
