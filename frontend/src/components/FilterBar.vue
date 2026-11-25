<script setup lang="ts">
import { computed, ref } from "vue";
import type { Filters } from "../lib/domain";
import { filterNames, typeNames } from "../lib/domain";
import UiIcon from "./UiIcon.vue";
const expanded = ref(true);
const p = defineProps<{
  modelValue: Filters;
  applied: Filters;
  busy: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [Filters];
  apply: [];
  reset: [];
}>();
function update(k: keyof Filters, event: Event) {
  emit("update:modelValue", {
    ...p.modelValue,
    [k]: (event.target as HTMLInputElement).value,
  });
}
const chips = computed(() =>
  Object.entries(p.applied).filter(([, v]) => v !== ""),
);
const dirty = computed(
  () => JSON.stringify(p.modelValue) !== JSON.stringify(p.applied),
);
</script>
<template>
  <section class="filter-panel" aria-label="变异筛选">
    <header>
      <div class="section-label">
        <UiIcon name="filter" />
        <h2>筛选条件</h2>
        <span v-if="dirty" class="draft-label">有未应用的修改</span>
      </div>
      <div class="filter-actions">
        <button
          class="text-button"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? "收起条件" : "展开条件" }}</button><button
          class="text-button"
          @click="emit('reset')"
          :disabled="busy"
        >
          重置
        </button>
      </div>
    </header>
    <form v-show="expanded" class="filter-grid" @submit.prevent="emit('apply')">
      <label
        >染色体<input
          aria-label="染色体"
          :value="modelValue.chrom"
          @input="update('chrom', $event)"
          placeholder="如 1 / chr1"
        />
      </label>
      <label
        >起始位置<input
          aria-label="起始位置"
          type="number"
          min="1"
          :value="modelValue.start"
          @input="update('start', $event)"
          placeholder="1-based"
        />
      </label>
      <label
        >终止位置<input
          aria-label="终止位置"
          type="number"
          min="1"
          :value="modelValue.end"
          @input="update('end', $event)"
          placeholder="闭区间终点"
        />
      </label>
      <label
        >变异类型<select
          aria-label="变异类型"
          :value="modelValue.type"
          @change="update('type', $event)"
        >
          <option value="">全部类型</option>
          <option v-for="(label, key) in typeNames" :key="key" :value="key">
            {{ label === key ? label : `${label} · ${key}` }}
          </option>
        </select>
      </label>
      <label
        >最低 QUAL<input
          aria-label="最低 QUAL"
          type="number"
          min="0"
          step="any"
          :value="modelValue.minQual"
          @input="update('minQual', $event)"
          placeholder="不限制"
        />
      </label>
      <label
        >FILTER<input
          aria-label="FILTER"
          :value="modelValue.filter"
          @input="update('filter', $event)"
          placeholder="PASS / . / q10"
        />
      </label>
      <label
        >变异 ID<input
          aria-label="变异 ID"
          :value="modelValue.variantId"
          @input="update('variantId', $event)"
          placeholder="精确匹配"
        />
      </label>
      <button class="button primary" :disabled="busy">
        <UiIcon name="search" />应用筛选
      </button>
    </form>
    <footer class="filter-foot">
      <span>已应用</span>
      <span v-if="!chips.length" class="muted">全部变异记录</span>
      <span v-for="[k, v] in chips" :key="k" class="filter-chip"
        >{{ filterNames[k as keyof Filters] }}:
        {{ k === "type" ? typeNames[v] || v : v }}</span
      >
      <small>表格、图表与导出使用相同范围</small>
    </footer>
  </section>
</template>
