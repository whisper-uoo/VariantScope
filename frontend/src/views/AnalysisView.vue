<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from "vue";
import type { Statistics, Filters } from "../lib/domain";
import { orderedTypes } from "../lib/domain";
import MetricSummary from "../components/MetricSummary.vue";
const Chart = defineAsyncComponent(() => import("../Chart.vue"));
const p = defineProps<{ stats: Statistics }>();
const emit = defineEmits<{ filter: [keyof Filters, string] }>();
const measure = ref<"count" | "share">("count");
const section = ref("all");
const positions = computed(() =>
  p.stats.positions.map((x) => ({
    label: `${x.chromosome}:${x.bin + 1} Mb`,
    value: x.value,
  })),
);
</script>
<template>
  <div class="analysis-workspace">
    <MetricSummary :stats="stats" />
    <div class="analysis-toolbar">
      <div class="view-tabs" aria-label="分析主题">
        <button
          v-for="s in [
            { id: 'all', label: '全部分布' },
            { id: 'composition', label: '变异组成' },
            { id: 'quality', label: '质量与过滤' },
          ]"
          :key="s.id"
          :class="{ active: section === s.id }"
          :aria-pressed="section === s.id"
          @click="section = s.id"
        >
          {{ s.label }}
        </button>
      </div>
      <div class="segmented" aria-label="图表度量">
        <button
          :class="{ active: measure === 'count' }"
          :aria-pressed="measure === 'count'"
          @click="measure = 'count'"
        >
          数量</button
        ><button
          :class="{ active: measure === 'share' }"
          :aria-pressed="measure === 'share'"
          @click="measure = 'share'"
        >
          占比
        </button>
      </div>
    </div>
    <p class="analysis-context">
      {{
        measure === "share"
          ? "占比以各图中全部记录为分母，悬停保留原始数量。"
          : "数量为当前筛选范围内的 VCF 记录数。"
      }}
      点击类型或 Contig 可应用筛选。
    </p>
    <div v-if="section !== 'quality'" class="analysis-composition">
      <div class="analysis-comparison">
        <Chart
          title="碱基替换"
          description="12 种有向替换 · 标准双等位 SNV"
          :data="stats.substitutions"
          :measure="measure"
          note="紫色：转换 · 灰紫色：颠换"
        />
        <Chart
          title="变异类型"
          description="点击分类以探索对应记录"
          kind="types"
          :data="orderedTypes(stats.types)"
          interactive
          @select="emit('filter', 'type', $event)"
        />
      </div>
      <div class="analysis-location">
        <Chart
          title="基因组位置"
          description="1 Mb 非空位置箱 · 不代表覆盖深度"
          :data="positions"
          :measure="measure"
          note="Contig:箱号 Mb；最多 10,000 个非空箱"
        />
        <Chart
          title="染色体分布"
          description="点击 Contig 应用筛选"
          :data="stats.chromosomes"
          :measure="measure"
          interactive
          @select="emit('filter', 'chrom', $event)"
        />
      </div>
    </div>
    <div v-if="section !== 'composition'" class="analysis-quality">
      <Chart
        title="质量分数"
        description="QUAL 区间 · 缺失值单独统计"
        :data="stats.quality"
        :measure="measure"
        note="[0,20)、[20,50)、[50,100)、[100,+∞) 与 Missing"
      />
      <Chart
        title="FILTER 状态"
        description="原始过滤标签 · 未提供与 PASS 分别统计"
        :data="stats.filters"
        :measure="measure"
        interactive
        @select="emit('filter', 'filter', $event)"
        note="点击过滤标签以探索；“.” 不等同于 PASS"
      />
    </div>
    <p class="analysis-footnote">
      Ti/Tv 仅计 A/C/G/T 双等位 SNV；颠换为零时显示“—”。图表、表格与 CSV
      使用同一筛选范围。
    </p>
  </div>
</template>
