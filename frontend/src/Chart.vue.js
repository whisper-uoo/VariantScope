import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";
const p = defineProps();
const emit = defineEmits();
const el = ref();
let chart;
let observer;
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
  chart = echarts.init(el.value);
  chart.on("click", (x) => emit("select", x.name));
  observer = new ResizeObserver(() => chart.resize());
  observer.observe(el.value);
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.section,
  __VLS_intrinsicElements.section,
)({
  ...{ class: "chart" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.header,
  __VLS_intrinsicElements.header,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.h3,
  __VLS_intrinsicElements.h3,
)({});
__VLS_ctx.title;
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.button,
  __VLS_intrinsicElements.button,
)({
  ...{ onClick: __VLS_ctx.download },
  ...{ class: "text" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ref: "el",
  ...{ class: "plot" },
});
/** @type {typeof __VLS_ctx.el} */ if (!__VLS_ctx.data.length) {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({
    ...{ class: "muted" },
  });
}
/** @type {__VLS_StyleScopedClasses['chart']} */ /** @type {__VLS_StyleScopedClasses['text']} */ /** @type {__VLS_StyleScopedClasses['plot']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ var __VLS_dollars;
const __VLS_self = (await import("vue")).defineComponent({
  setup() {
    return {
      el: el,
      download: download,
    };
  },
  __typeEmits: {},
  __typeProps: {},
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
  __typeEmits: {},
  __typeProps: {},
}); /* PartiallyEnd: #4569/main.vue */
