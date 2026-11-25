<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import type { Variant } from "../lib/domain";
import { number, genotype, infoEntries, typeNames } from "../lib/domain";
import UiDialog from "./UiDialog.vue";
const p = defineProps<{ variant: Variant; inline?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const inspector = ref<HTMLElement>();
let previous: HTMLElement | null = null;
let previousScroll = 0;
let movedToInspector = false;
function escape(e: KeyboardEvent) {
  if (p.inline && e.key === "Escape") emit("close");
}
onMounted(() => {
  if (p.inline) {
    previous = document.activeElement as HTMLElement;
    previousScroll = window.scrollY;
    movedToInspector = window.innerWidth <= 950;
    if (movedToInspector) inspector.value?.scrollIntoView?.({ block: "start" });
    inspector.value?.focus({ preventScroll: true });
    window.addEventListener("keydown", escape);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", escape);
  previous?.focus({ preventScroll: true });
  if (movedToInspector)
    window.scrollTo({ top: previousScroll, behavior: "instant" });
});
const info = computed(() => infoEntries(p.variant.info));
const copied = ref(false);
const copyError = ref(false);
async function copy() {
  try {
    await navigator.clipboard.writeText(p.variant.raw_line);
    copied.value = true;
    copyError.value = false;
  } catch {
    copyError.value = true;
  }
}
</script>
<template>
  <component
    :is="inline ? 'aside' : UiDialog"
    ref="inspector"
    class="variant-inspector"
    :tabindex="inline ? -1 : undefined"
    :aria-label="inline ? '变异详情' : undefined"
    title="变异详情"
    :drawer="!inline"
    @close="$emit('close')"
  >
    <header v-if="inline" class="inspector-heading">
      <h2>变异详情</h2>
      <button class="icon-button" aria-label="关闭详情" @click="$emit('close')">
        ×
      </button>
    </header>
    <div class="variant-identity">
      <span class="eyebrow">基因组坐标 · 1-based</span>
      <h3 class="mono">
        {{ variant.chrom }}<span>:</span>{{ number(variant.pos) }}
      </h3>
      <div class="allele-pair">
        <span class="mono">{{ variant.ref }}</span>
        <span class="muted">替换为</span>
        <span class="mono">{{ variant.alt }}</span>
      </div>
    </div>
    <section class="detail-section">
      <header>
        <h3>来源字段</h3>
        <span class="source-tag">VCF 原文</span>
      </header>
      <dl class="detail-grid">
        <dt>变异 ID</dt>
        <dd class="mono">{{ variant.variant_id }}</dd>
        <dt>QUAL</dt>
        <dd class="mono">{{ number(variant.qual) }}</dd>
        <dt>FILTER</dt>
        <dd>
          {{
            variant.filter_value === "." ? "未提供 (.)" : variant.filter_value
          }}
        </dd>
        <dt>FORMAT</dt>
        <dd class="mono">{{ variant.format_value || "无样本列" }}</dd>
        <dt>样本值</dt>
        <dd class="mono">{{ variant.sample_value || "无样本列" }}</dd>
        <dt>GT</dt>
        <dd class="mono">{{ genotype(variant) }}</dd>
      </dl>
    </section>
    <section class="detail-section">
      <header>
        <h3>INFO 属性</h3>
        <span class="count-label">{{ info.length }}</span>
      </header>
      <p v-if="!info.length" class="muted">此记录未提供 INFO 属性。</p>
      <dl v-else class="info-grid">
        <template v-for="entry in info" :key="entry.key">
          <dt class="mono">{{ entry.key }}</dt>
          <dd>{{ entry.value }}</dd>
        </template>
      </dl>
    </section>
    <section class="detail-section">
      <header>
        <h3>计算与解析说明</h3>
        <span class="source-tag computed">VariantScope</span>
      </header>
      <p>
        变异类型
        <span :class="['type-label', variant.type.toLowerCase()]">{{
          typeNames[variant.type] || variant.type
        }}</span>
      </p>
      <p v-if="variant.warning" class="notice warning">{{ variant.warning }}</p>
      <p class="detail-note">
        类型由 REF/ALT 计算。INFO 注释来自文件，不代表平台的临床判定。
      </p>
    </section>
    <section class="detail-section">
      <header>
        <h3>原始记录</h3>
        <button class="text-button" @click="copy">
          {{ copied ? "已复制" : "复制原文" }}
        </button>
      </header>
      <pre>{{ variant.raw_line }}</pre>
      <p v-if="copyError" class="error-text">
        无法访问剪贴板，请在上方选中原文复制。
      </p>
    </section>
  </component>
</template>
