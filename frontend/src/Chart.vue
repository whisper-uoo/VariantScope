<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";
const p = defineProps<{ title: string; data: any[]; kind?: string }>();
const emit = defineEmits<{ select: [string] }>();
const el = ref<HTMLElement>();
let chart: echarts.ECharts;
let observer: ResizeObserver;
function render() {
  if (!chart) return;
  const pie = p.kind === "pie";
  chart.setOption(
    {
      color: ["#227c80", "#67aba3", "#a0c9bc", "#d0ab64", "#8395b5"],
      tooltip: { trigger: pie ? "item" : "axis" },
      grid: { left: 55, right: 20, top: 25, bottom: 60 },
      xAxis: pie
        ? undefined
        : {
            type: "category",
            data: p.data.map((x) => x.label),
            axisLabel: {
              rotate: p.data.length > 10 ? 35 : 0,
              color: "#677885",
            },
          },
      yAxis: pie
        ? undefined
        : {
            type: "value",
            minInterval: 1,
            splitLine: { lineStyle: { color: "#edf1f4" } },
          },
      series: [
        {
          type: pie ? "pie" : "bar",
          radius: pie ? ["48%", "72%"] : undefined,
          barMaxWidth: 35,
          itemStyle: { borderRadius: pie ? 0 : [4, 4, 0, 0] },
          data: p.data.map((x) => ({ name: x.label, value: x.value })),
          label: { show: pie, formatter: "{b}: {c}" },
        },
      ],
    },
    true,
  );
}
onMounted(() => {
  chart = echarts.init(el.value!);
  chart.on("click", (x: any) => emit("select", x.name));
  observer = new ResizeObserver(() => chart.resize());
  observer.observe(el.value!);
  render();
});
watch(() => p.data, render, { deep: true });
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
});
function download() {
  const a = document.createElement("a");
  a.href = chart.getDataURL({
    type: "png",
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  a.download = p.title + ".png";
  a.click();
}
</script>
<template>
  <section class="chart">
    <header>
      <h3>{{ title }}</h3>
      <button class="text" @click="download">导出 PNG</button>
    </header>
    <div ref="el" class="plot"></div>
    <p v-if="!data.length" class="muted">当前筛选下没有可绘制的数据</p>
  </section>
</template>
