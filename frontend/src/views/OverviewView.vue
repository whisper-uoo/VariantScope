<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import type { Statistics, Dataset } from "../lib/domain";
import { number, dateTime } from "../lib/domain";
import { orderedTypes } from "../lib/domain";
import MetricSummary from "../components/MetricSummary.vue";
import StatusBadge from "../components/StatusBadge.vue";
import UiIcon from "../components/UiIcon.vue";
const Chart = defineAsyncComponent(() => import("../Chart.vue"));
defineProps<{ stats: Statistics; datasets: Dataset[]; filtered: boolean }>();
defineEmits<{ navigate: [string]; open: [Dataset]; reset: [] }>();
</script>
<template>
  <div class="overview-workspace">
    <div class="scope-note" v-if="filtered">
      <span>正在查看已筛选的范围，所有指标与图表同步。</span
      ><button class="text-button" @click="$emit('reset')">恢复全部记录</button>
    </div>
    <MetricSummary :stats="stats" />
    <div class="overview-primary">
      <Chart
        title="碱基替换"
        description="标准碱基双等位 SNV · 12 种有向替换"
        :data="stats.substitutions"
        note="紫色：转换 · 灰紫色：颠换；不进行互补折叠"
      />
      <Chart
        title="变异类型"
        description="真实数量与占比"
        kind="types"
        :data="orderedTypes(stats.types)"
      />
    </div>
    <div class="overview-secondary">
      <Chart
        title="染色体分布"
        description="按文件原始 Contig 标识分组"
        :data="stats.chromosomes"
        :note="
          stats.chromosomes.length === 1
            ? '仅一个 Contig，不能代表全基因组分布'
            : '未自动合并 chr1 与 1 等不同命名'
        "
      />
      <Chart
        title="质量分数"
        description="QUAL 分箱 · 缺失值单独统计"
        :data="stats.quality"
        note="未提供质量分数不等同于 QUAL = 0"
      />
    </div>
    <section class="recent-panel">
      <header>
        <div>
          <h2>最近文件</h2>
          <span class="muted">当前资料库的最近导入记录</span>
        </div>
        <button class="text-button" @click="$emit('navigate', 'datasets')">
          查看全部 <UiIcon name="chevron" />
        </button>
      </header>
      <button
        v-for="d in datasets.slice(0, 4)"
        :key="d.id"
        class="recent-row"
        :disabled="d.status !== 'READY'"
        @click="$emit('open', d)"
      >
        <UiIcon name="file" /><span class="recent-name"
          >{{ d.name
          }}<small>{{ d.reference_name || "参考版本未提供" }}</small></span
        ><span class="tabular"
          >{{ number(d.record_count) }}<small>条记录</small></span
        ><StatusBadge :status="d.status" /><time>{{ dateTime(d.created) }}</time
        ><UiIcon name="chevron" />
      </button>
      <p v-if="!datasets.length" class="empty-state">暂无导入文件。</p>
    </section>
    <div class="scope-note">
      <span>所有结果来自当前 VCF 与已应用的筛选。需要定位具体记录？</span
      ><button class="text-button" @click="$emit('navigate', 'variants')">
        打开变异浏览 <UiIcon name="chevron" />
      </button>
    </div>
  </div>
</template>
