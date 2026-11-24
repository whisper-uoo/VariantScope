<script setup lang="ts">
import { computed } from "vue";
import type { Statistics } from "../lib/domain";
import { number, percentage, groupCount } from "../lib/domain";
const p = defineProps<{ stats: Statistics; compact?: boolean }>();
const snv = computed(() => groupCount(p.stats, "SNV"));
const indel = computed(
  () => groupCount(p.stats, "INSERTION") + groupCount(p.stats, "DELETION"),
);
</script>
<template>
  <section :class="['metric-summary', { compact }]" aria-label="当前筛选统计">
    <div class="metric-lead">
      <span class="metric-label">{{
        compact ? "匹配变异" : "变异记录总数"
      }}</span>
      <div class="metric-value">
        {{ number(stats.total) }}<span class="metric-unit">条</span>
      </div>
      <p v-if="!compact">当前数据集与已应用的筛选范围</p>
    </div>
    <div class="metric-secondary">
      <span class="metric-label"
        >SNV <span class="muted">单核苷酸变异</span>
      </span>
      <div class="metric-value">{{ number(snv) }}</div>
      <p>{{ percentage(snv, stats.total) }}<span>占全部记录</span></p>
    </div>
    <div class="metric-secondary">
      <span class="metric-label">简单 InDel</span>
      <div class="metric-value">{{ number(indel) }}</div>
      <p>{{ percentage(indel, stats.total) }}<span>插入与缺失</span></p>
    </div>
    <div class="metric-secondary">
      <span class="metric-label"
        >Ti/Tv <span class="muted">转换 / 颠换</span>
      </span>
      <div class="metric-value">
        {{ stats.titv == null ? "—" : stats.titv.toFixed(3) }}
      </div>
      <p class="tabular">
        {{ number(stats.transitions) }} / {{ number(stats.transversions)
        }}<span>{{ stats.chromosomes.length }} 个 Contig</span>
      </p>
    </div>
  </section>
</template>
