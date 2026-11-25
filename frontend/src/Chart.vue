<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  GraphicComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Distribution } from "./lib/domain";
import { number, percentage, typeNames, typeColors } from "./lib/domain";
import UiIcon from "./components/UiIcon.vue";
echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  GraphicComponent,
  CanvasRenderer,
]);
const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    data: Distribution[];
    kind?: "bar" | "types";
    interactive?: boolean;
    note?: string;
  }>(),
  { kind: "bar", interactive: false },
);
const emit = defineEmits<{ select: [string] }>();
const el = ref<HTMLElement>();
let chart: echarts.ECharts | undefined;
let observer: ResizeObserver | undefined;
let motion: MediaQueryList | undefined;
const total = computed(() => props.data.reduce((sum, x) => sum + x.value, 0));
const single = computed(
  () => props.kind !== "types" && props.data.length === 1,
);
const isMissing = computed(
  () => single.value && ["Missing", "."].includes(props.data[0].label),
);
const summary = computed(() =>
  props.data
    .map((x) => `${typeNames[x.label] || x.label}：${number(x.value)}`)
    .join("；"),
);
const dominant = computed(
  () => [...props.data].sort((a, b) => b.value - a.value)[0],
);
const chartLabel = (s: string) =>
  s === "Missing"
    ? "未提供 QUAL"
    : s === "."
      ? "未提供（.）"
      : typeNames[s] || s;
const font =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif';
function render() {
  if (!chart || !el.value) return;
  const w = el.value.clientWidth;
  const types = props.kind === "types";
  const crowded = props.data.length > 18;
  const small = w < 420;
  const color = "#6385aa";
  const base: any = {
    animation: !motion?.matches,
    animationDuration: 180,
    textStyle: { fontFamily: font, color: "#4c5360" },
    tooltip: {
      trigger: types || single.value ? "item" : "axis",
      confine: true,
      renderMode: "richText",
      backgroundColor: "#fafaf9",
      borderColor: "#d4d6dc",
      borderWidth: 1,
      padding: [10, 13],
      textStyle: { color: "#323b46", fontFamily: font, fontSize: 13 },
      axisPointer: { type: "shadow", shadowStyle: { color: "#587ca20b" } },
      formatter: (input: any) => {
        const x = Array.isArray(input) ? input[0] : input;
        return `${chartLabel(x.seriesName && types ? x.seriesName : x.name)}\n${number(x.value)} 条${types ? " · " + percentage(x.value, total.value) : ""}`;
      },
    },
    graphic: [],
    dataZoom: [],
    grid: { left: 38, right: 15, top: 20, bottom: crowded ? 55 : 34 },
    xAxis: {
      type: "category",
      data: props.data.map((x) => chartLabel(x.label)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 12,
        color: "#747b86",
        margin: 12,
        interval: "auto",
        rotate: small && props.data.length > 8 ? 35 : 0,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      splitNumber: 3,
      axisLabel: {
        fontSize: 11,
        color: "#747b86",
        formatter: (v: number) =>
          v >= 1e6 ? `${v / 1e6}m` : v >= 1000 ? `${v / 1000}k` : String(v),
      },
      splitLine: { lineStyle: { color: "#e5e8ee", type: "solid" } },
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 25,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        cursor: props.interactive ? "pointer" : "default",
        emphasis: { itemStyle: { opacity: 0.75 } },
        data: props.data.map((x) => ({
          name: x.label,
          value: x.value,
          itemStyle: {
            color:
              props.title === "碱基替换"
                ? new Set(["A>G", "G>A", "C>T", "T>C"]).has(x.label)
                  ? "#7a9e8c"
                  : "#9da9c0"
                : color,
          },
        })),
      },
    ],
  };
  if (crowded)
    base.dataZoom = [
      {
        type: "slider",
        height: 14,
        bottom: 2,
        start: 0,
        end: Math.min(100, 1800 / props.data.length),
        borderColor: "transparent",
        fillerColor: "#cfdae8",
        backgroundColor: "#edf0f5",
        textStyle: { fontSize: 11 },
      },
    ];
  if (types) {
    base.grid = { left: 0, right: 0, top: 18, height: 16 };
    base.xAxis = { type: "value", min: 0, max: total.value || 1, show: false };
    base.yAxis = { type: "category", data: ["类型构成"], show: false };
    base.series = props.data.map((x) => ({
      name: x.label,
      type: "bar",
      stack: "total",
      barWidth: 16,
      cursor: props.interactive ? "pointer" : "default",
      itemStyle: { color: typeColors[x.label] || "#a3a7b3" },
      emphasis: { itemStyle: { opacity: 0.75 } },
      data: [{ name: x.label, value: x.value }],
    }));
    base.graphic = props.data.flatMap((x, i) => {
      const y = 65 + i * 32;
      return [
        {
          type: "circle",
          shape: { cx: 5, cy: y + 5, r: 3 },
          style: { fill: typeColors[x.label] || "#a3a7b3" },
          silent: true,
        },
        {
          type: "text",
          left: 17,
          top: y - 2,
          style: {
            text: chartLabel(x.label),
            font: `13px ${font}`,
            fill: "#555e69",
          },
          cursor: props.interactive ? "pointer" : "default",
          onclick: () => {
            if (props.interactive) emit("select", x.label);
          },
        },
        {
          type: "text",
          right: 73,
          top: y - 2,
          style: {
            text: number(x.value),
            font: `500 13px ${font}`,
            fill: "#3c4652",
            align: "right",
          },
          silent: true,
        },
        {
          type: "text",
          right: 0,
          top: y - 2,
          style: {
            text: percentage(x.value, total.value),
            font: `12px ${font}`,
            fill: "#7b838f",
            align: "right",
          },
          silent: true,
        },
      ];
    });
  } else if (single.value) {
    const x = props.data[0];
    base.grid = { left: 0, right: 0, top: 57, height: 9 };
    base.xAxis = { type: "value", min: 0, max: x.value || 1, show: false };
    base.yAxis = { type: "category", data: [x.label], show: false };
    base.series = [
      {
        type: "bar",
        barWidth: 9,
        showBackground: true,
        backgroundStyle: { color: "#e9edf2", borderRadius: 5 },
        cursor: props.interactive ? "pointer" : "default",
        itemStyle: {
          color: isMissing.value ? "#a9b1bf" : color,
          borderRadius: 5,
        },
        data: [{ name: x.label, value: x.value }],
      },
    ];
    base.graphic = [
      {
        type: "text",
        left: 0,
        top: 13,
        style: {
          text: chartLabel(x.label),
          font: `500 15px ${font}`,
          fill: "#555e6a",
        },
        silent: true,
      },
      {
        type: "text",
        right: 0,
        top: 8,
        style: {
          text: `${number(x.value)} 条`,
          font: `500 23px ${font}`,
          fill: "#3d4c61",
        },
        silent: true,
      },
      {
        type: "text",
        left: 0,
        top: 82,
        style: {
          text: isMissing.value
            ? "缺失记录单独统计，不替换为 0"
            : props.title === "染色体分布"
              ? "当前范围仅包含这一个 Contig"
              : "当前范围仅有这一个分组",
          font: `12px ${font}`,
          fill: "#6b7582",
        },
        silent: true,
      },
    ];
  }
  chart.setOption(base, true);
}
onMounted(() => {
  motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  chart = echarts.init(el.value!);
  chart.on("click", (event: any) => {
    if (!props.interactive || event.componentType === "graphic") return;
    const i = props.kind === "types" ? event.seriesIndex : event.dataIndex;
    const d = props.data[i];
    if (d) emit("select", d.label);
  });
  observer = new ResizeObserver(() => {
    chart?.resize();
    render();
  });
  observer.observe(el.value!);
  render();
});
watch(() => [props.data, props.kind], render, { deep: true });
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
});
function download() {
  if (!chart) return;
  const a = document.createElement("a");
  a.href = chart.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#fff",
  });
  a.download = props.title + ".png";
  a.click();
}
</script>
<template>
  <section
    :class="[
      'chart-panel',
      {
        'type-chart': kind === 'types',
        'single-chart': single,
        'no-data-chart': !data.length,
      },
    ]"
  >
    <header class="chart-heading">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <button
        class="icon-button"
        :aria-label="`导出${title} PNG`"
        title="导出 PNG"
        :disabled="!data.length"
        @click="download"
      >
        <UiIcon name="download" />
      </button>
    </header>
    <div
      ref="el"
      class="plot"
      :style="{
        height:
          kind === 'types'
            ? `${Math.max(120, data.length * 32 + 60)}px`
            : single
              ? '112px'
              : '218px',
      }"
      role="img"
      :aria-label="`${title}。${summary || '当前范围无数据'}`"
    ></div>
    <div v-if="!data.length" class="chart-empty">
      <UiIcon name="analysis" /><span>当前范围无可用数据</span>
    </div>
    <div class="type-insight" v-if="kind === 'types' && dominant && total > 0">
      <strong
        >{{ typeNames[dominant.label] || dominant.label }} 占
        {{ percentage(dominant.value, total) }}</strong
      >
      <p>
        其余
        {{ number(total - dominant.value) }}
        条记录按原始分类列出。比例带保持线性比例，不放大小类别。
      </p>
    </div>
    <footer class="chart-footer">
      <span>{{
        note ||
        (kind === "types"
          ? "比例带按真实数量绘制，未放大小类别"
          : single
            ? "分组与范围由当前数据决定"
            : "纵轴：变异记录数")
      }}</span>
      <details v-if="data.length" class="chart-values">
        <summary>{{ interactive ? "数值与筛选" : "查看数值" }}</summary>
        <div class="value-list">
          <component
            :is="interactive ? 'button' : 'div'"
            v-for="x in data"
            :key="x.label"
            class="value-row"
            @click="
              () => {
                if (interactive) emit('select', x.label);
              }
            "
            ><span>{{ chartLabel(x.label) }}</span
            ><span class="tabular"
              >{{ number(x.value)
              }}<small v-if="kind === 'types'">{{
                percentage(x.value, total)
              }}</small></span
            ></component
          >
        </div>
      </details>
    </footer>
  </section>
</template>
