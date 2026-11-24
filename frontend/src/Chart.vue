<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
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
const total = computed(() => props.data.reduce((s, x) => s + x.value, 0));
const accessibleSummary = computed(() =>
  props.data
    .map((x) => `${typeNames[x.label] || x.label}: ${number(x.value)}`)
    .join("；"),
);
function render() {
  if (!chart || !el.value) return;
  const horizontal = props.kind === "types";
  const crowded = props.data.length > 12;
  const mobile = el.value.clientWidth < 420;
  const data = props.data.map((x) => ({
    name: typeNames[x.label] || x.label,
    value: x.value,
    itemStyle: {
      color: horizontal
        ? typeColors[x.label] || "#318779"
        : props.title.includes("替换")
          ? (
              {
                "A>C": "#8397b6",
                "A>G": "#318779",
                "A>T": "#8397b6",
                "C>A": "#8397b6",
                "C>G": "#8397b6",
                "C>T": "#318779",
                "G>A": "#318779",
                "G>C": "#8397b6",
                "G>T": "#8397b6",
                "T>A": "#8397b6",
                "T>C": "#318779",
                "T>G": "#8397b6",
              } as Record<string, string>
            )[x.label] || "#318779"
          : "#318779",
    },
  }));
  const category = {
    type: "category" as const,
    data: data.map((x) => x.name),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: "#697277",
      fontSize: 12,
      margin: 12,
      interval: crowded ? "auto" : 0,
      rotate: !horizontal && props.data.length > 8 && mobile ? 40 : 0,
      hideOverlap: true,
    },
    inverse: horizontal,
  };
  const value = {
    type: "value" as const,
    minInterval: 1,
    axisLabel: {
      color: "#8a9297",
      fontSize: 12,
      formatter: (n: number) =>
        n >= 1000000
          ? `${n / 1000000}m`
          : n >= 1000
            ? `${n / 1000}k`
            : String(n),
    },
    splitLine: { lineStyle: { color: "#edf0f1", type: "dashed" as const } },
  };
  chart.setOption(
    {
      animationDuration: 250,
      textStyle: {
        fontFamily:
          "Inter Variable, PingFang SC, Source Han Sans SC, sans-serif",
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        renderMode: "richText",
        backgroundColor: "#202b30",
        borderWidth: 0,
        textStyle: { color: "#fff", fontSize: 13 },
        padding: [10, 13],
        axisPointer: {
          type: horizontal ? "shadow" : "line",
          lineStyle: { color: "#c0d0cc" },
          shadowStyle: { color: "#3187790b" },
        },
        formatter: (params: any) => {
          const x = params[0];
          return `${x.name}\n${number(x.value)} 条${horizontal ? `  ·  ${percentage(x.value, total.value)}` : ""}`;
        },
      },
      grid: {
        left: horizontal ? 88 : 42,
        right: horizontal ? 90 : 15,
        top: 18,
        bottom: crowded ? 65 : 36,
        containLabel: false,
      },
      xAxis: horizontal ? value : category,
      yAxis: horizontal ? category : value,
      dataZoom: crowded
        ? [
            {
              type: "slider",
              height: 15,
              bottom: 4,
              start: 0,
              end: Math.min(100, 1200 / props.data.length),
              borderColor: "transparent",
              backgroundColor: "#f1f4f3",
              fillerColor: "#d1e4df",
              handleStyle: { color: "#7ba99d" },
              textStyle: { fontSize: 11 },
            },
          ]
        : [],
      series: [
        {
          type: "bar",
          barMaxWidth: horizontal ? 15 : 30,
          showBackground: horizontal,
          backgroundStyle: { color: "#f3f5f4", borderRadius: 2 },
          itemStyle: { borderRadius: horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0] },
          cursor: props.interactive ? "pointer" : "default",
          emphasis: { itemStyle: { opacity: 0.8 } },
          label: {
            show: horizontal,
            position: "right",
            distance: 10,
            color: "#4f5b62",
            fontSize: 12,
            formatter: (p: any) =>
              `${number(p.value)}  ·  ${percentage(p.value, total.value)}`,
          },
          data,
        },
      ],
    },
    true,
  );
}
onMounted(() => {
  chart = echarts.init(el.value!);
  chart.on("click", (event: any) => {
    if (props.interactive) {
      const i = event.dataIndex;
      emit("select", props.data[i].label);
    }
  });
  observer = new ResizeObserver(() => {
    chart?.resize();
    render();
  });
  observer.observe(el.value!);
  document.fonts?.ready.then(() => {
    chart?.resize();
    render();
  });
  render();
});
watch(() => [props.data, props.kind], render, { deep: true });
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
});
function download() {
  if (!chart) return;
  const link = document.createElement("a");
  link.href = chart.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#fff",
  });
  link.download = props.title + ".png";
  link.click();
}
</script>
<template>
  <section class="chart-panel" :class="{ 'type-chart': kind === 'types' }">
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
      role="img"
      :aria-label="`${title}。${accessibleSummary || '当前范围无数据'}`"
    ></div>
    <div v-if="!data.length" class="chart-empty">当前范围无可用数据</div>
    <footer class="chart-footer">
      <span v-if="note">{{ note }}</span
      ><span v-else>{{
        kind === "types" ? "每条记录仅归入一个类型" : "纵轴为变异记录数"
      }}</span>
      <details v-if="data.length" class="chart-values">
        <summary>{{ interactive ? "查看数值 / 筛选" : "查看数值" }}</summary>
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
            ><span>{{ typeNames[x.label] || x.label }}</span
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
