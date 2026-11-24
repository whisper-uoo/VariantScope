import { ref, computed, onMounted } from "vue";
import Chart from "./Chart.vue";
const nav = ["概览工作台", "数据集管理", "变异浏览", "统计分析", "项目说明"];
const view = ref("概览工作台");
const datasets = ref([]);
const selected = ref();
const current = computed(() =>
  datasets.value.find((x) => x.id === selected.value),
);
const stats = ref();
const rows = ref([]);
const total = ref(0);
const page = ref(0);
const detail = ref();
const error = ref("");
const busy = ref(false);
const progress = ref("");
const name = ref("");
const reference = ref("");
const file = ref();
const filters = ref({
  chrom: "",
  start: "",
  end: "",
  type: "",
  minQual: "",
  filter: "",
  variantId: "",
  sort: "id",
  direction: "asc",
});
let generation = 0;
function query() {
  return new URLSearchParams(
    Object.entries(filters.value).filter(([, v]) => v),
  ).toString();
}
async function api(url, options) {
  const response = await fetch("/api" + url, options);
  if (!response.ok) {
    let x = await response.json();
    throw Error(x.message || "请求失败");
  }
  return response.status === 204
    ? null
    : response.text().then((t) => (t ? JSON.parse(t) : null));
}
async function list() {
  datasets.value = await api("/datasets");
  if (!selected.value || !datasets.value.some((x) => x.id === selected.value))
    selected.value = datasets.value.find((x) => x.status === "READY")?.id;
  await load();
}
async function load() {
  const gen = ++generation;
  detail.value = undefined;
  if (!selected.value) {
    stats.value = undefined;
    rows.value = [];
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    const [s, v] = await Promise.all([
      api(`/datasets/${selected.value}/stats?${query()}`),
      api(
        `/datasets/${selected.value}/variants?${query()}&page=${page.value}&size=25`,
      ),
    ]);
    if (gen === generation) {
      stats.value = s;
      rows.value = v.items;
      total.value = v.total;
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    if (gen === generation) busy.value = false;
  }
}
async function choose() {
  page.value = 0;
  await load();
}
async function upload(chosen) {
  const f = chosen || file.value;
  if (!f) return;
  busy.value = true;
  error.value = "";
  progress.value = "准备上传";
  try {
    const form = new FormData();
    form.append("file", f);
    form.append("name", name.value || f.name);
    if (reference.value) form.append("reference", reference.value);
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/datasets");
      xhr.upload.onprogress = (e) => {
        progress.value = e.lengthComputable
          ? `上传 ${Math.round((e.loaded / e.total) * 100)}% · 随后流式解析`
          : "正在上传";
      };
      xhr.onload = () => {
        const x = JSON.parse(xhr.responseText);
        xhr.status < 300 ? resolve(x) : reject(Error(x.message));
      };
      xhr.onerror = () => reject(Error("网络连接失败"));
      xhr.send(form);
    });
    if (result.status === "FAILED") error.value = result.error;
    selected.value = result.id;
    await list();
    view.value = "数据集管理";
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
    progress.value = "";
  }
}
async function example() {
  try {
    const response = await fetch("/data/clinvar-grch38-subset.vcf");
    if (!response.ok) throw Error("示例文件不可用");
    await upload(new File([await response.blob()], "ClinVar-GRCh38-1000.vcf"));
  } catch (e) {
    error.value = e.message;
  }
}
async function remove(ds) {
  if (!confirm(`删除“${ds.name}”及其全部变异记录？`)) return;
  try {
    await api(`/datasets/${ds.id}`, { method: "DELETE" });
    await list();
  } catch (e) {
    error.value = e.message;
  }
}
async function reanalyze(ds) {
  try {
    await api(`/datasets/${ds.id}/reanalyze`, { method: "POST" });
    selected.value = ds.id;
    await load();
    view.value = "统计分析";
  } catch (e) {
    error.value = e.message;
  }
}
function chartFilter(key, v) {
  filters.value[key] = v;
  page.value = 0;
  view.value = "变异浏览";
  load();
}
const positions = computed(
  () =>
    stats.value?.positions.map((x) => ({
      label: `${x.chromosome}:${x.bin + 1}Mb`,
      value: x.value,
    })) || [],
);
const gt = computed(() => {
  if (!detail.value) return "—";
  const i = detail.value.format_value.split(":").indexOf("GT");
  return i >= 0 ? detail.value.sample_value.split(":")[i] || "." : "未提供";
});
onMounted(() => list().catch((e) => (error.value = e.message)));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: "shell" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.aside,
  __VLS_intrinsicElements.aside,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.a,
  __VLS_intrinsicElements.a,
)({
  ...{
    onClick: (...[$event]) => {
      __VLS_ctx.view = __VLS_ctx.nav[0];
    },
  },
  ...{ class: "brand" },
  href: "#",
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.span,
  __VLS_intrinsicElements.span,
)({
  ...{ class: "mark" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.span,
  __VLS_intrinsicElements.span,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.small,
  __VLS_intrinsicElements.small,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: "workspace" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.nav,
  __VLS_intrinsicElements.nav,
)({});
for (const [n, i] of __VLS_getVForSourceType(__VLS_ctx.nav)) {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.button,
    __VLS_intrinsicElements.button,
  )({
    ...{
      onClick: (...[$event]) => {
        __VLS_ctx.view = n;
      },
    },
    ...{ class: { active: __VLS_ctx.view === n } },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.span,
    __VLS_intrinsicElements.span,
  )({});
  ["◫", "▤", "≡", "◷", "ⓘ"][i];
  n;
}
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: "aside-foot" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.span,
  __VLS_intrinsicElements.span,
)({
  ...{ class: "tag" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.p,
  __VLS_intrinsicElements.p,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.small,
  __VLS_intrinsicElements.small,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.main,
  __VLS_intrinsicElements.main,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.header,
  __VLS_intrinsicElements.header,
)({
  ...{ class: "topbar" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.span,
  __VLS_intrinsicElements.span,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.b,
  __VLS_intrinsicElements.b,
)({});
__VLS_ctx.view;
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.span,
  __VLS_intrinsicElements.span,
)({
  ...{ class: "muted" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: "content" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({
  ...{ class: "pagehead" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.div,
  __VLS_intrinsicElements.div,
)({});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.p,
  __VLS_intrinsicElements.p,
)({
  ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.h1,
  __VLS_intrinsicElements.h1,
)({});
__VLS_ctx.view;
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.p,
  __VLS_intrinsicElements.p,
)({
  ...{ class: "muted" },
});
__VLS_ctx.view === "概览工作台"
  ? "探索变异数据，理解每一份分析结果。"
  : "基于实际导入记录的筛选、统计与可视化";
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.button,
  __VLS_intrinsicElements.button,
)({
  ...{
    onClick: (...[$event]) => {
      __VLS_ctx.view = "数据集管理";
    },
  },
  ...{ class: "primary" },
});
if (__VLS_ctx.error) {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({
    ...{ class: "alert" },
    role: "alert",
  });
  __VLS_ctx.error;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.button,
    __VLS_intrinsicElements.button,
  )({
    ...{
      onClick: (...[$event]) => {
        if (!__VLS_ctx.error) return;
        __VLS_ctx.error = "";
      },
    },
    ...{ class: "text" },
  });
}
if (__VLS_ctx.busy) {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({
    ...{ class: "loading" },
    role: "status",
  });
  __VLS_ctx.progress || "正在查询与计算…";
}
if (__VLS_ctx.view === "项目说明") {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.section,
    __VLS_intrinsicElements.section,
  )({
    ...{ class: "panel prose" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h2,
    __VLS_intrinsicElements.h2,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h3,
    __VLS_intrinsicElements.h3,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h3,
    __VLS_intrinsicElements.h3,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
} else if (__VLS_ctx.view === "数据集管理") {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.section,
    __VLS_intrinsicElements.section,
  )({
    ...{ class: "panel upload" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.span,
    __VLS_intrinsicElements.span,
  )({
    ...{ class: "tag" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h2,
    __VLS_intrinsicElements.h2,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({
    ...{ class: "muted" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.button,
    __VLS_intrinsicElements.button,
  )({
    ...{ onClick: __VLS_ctx.example },
    disabled: __VLS_ctx.busy,
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.form,
    __VLS_intrinsicElements.form,
  )({
    ...{
      onSubmit: (...[$event]) => {
        if (!!(__VLS_ctx.view === "项目说明")) return;
        if (!(__VLS_ctx.view === "数据集管理")) return;
        __VLS_ctx.upload();
      },
    },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.label,
    __VLS_intrinsicElements.label,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.input,
    __VLS_intrinsicElements.input,
  )({
    maxlength: "200",
    placeholder: "默认使用文件名",
  });
  __VLS_ctx.name;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.label,
    __VLS_intrinsicElements.label,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.input,
    __VLS_intrinsicElements.input,
  )({
    maxlength: "500",
    placeholder: "优先读取文件，未知时留空",
  });
  __VLS_ctx.reference;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.label,
    __VLS_intrinsicElements.label,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.input,
    __VLS_intrinsicElements.input,
  )({
    ...{
      onChange: (...[$event]) => {
        if (!!(__VLS_ctx.view === "项目说明")) return;
        if (!(__VLS_ctx.view === "数据集管理")) return;
        __VLS_ctx.file = $event.target.files?.[0];
      },
    },
    type: "file",
    accept: ".vcf",
    required: true,
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.button,
    __VLS_intrinsicElements.button,
  )({
    ...{ class: "primary" },
    disabled: __VLS_ctx.busy,
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.section,
    __VLS_intrinsicElements.section,
  )({
    ...{ class: "panel" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h2,
    __VLS_intrinsicElements.h2,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.small,
    __VLS_intrinsicElements.small,
  )({});
  __VLS_ctx.datasets.length;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({
    ...{ class: "tablewrap" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.table,
    __VLS_intrinsicElements.table,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.thead,
    __VLS_intrinsicElements.thead,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.tr,
    __VLS_intrinsicElements.tr,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.th,
    __VLS_intrinsicElements.th,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.th,
    __VLS_intrinsicElements.th,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.th,
    __VLS_intrinsicElements.th,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.th,
    __VLS_intrinsicElements.th,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.th,
    __VLS_intrinsicElements.th,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.tbody,
    __VLS_intrinsicElements.tbody,
  )({});
  for (const [d] of __VLS_getVForSourceType(__VLS_ctx.datasets)) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.tr,
      __VLS_intrinsicElements.tr,
    )({});
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.td,
      __VLS_intrinsicElements.td,
    )({});
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.b,
      __VLS_intrinsicElements.b,
    )({});
    d.name;
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.small,
      __VLS_intrinsicElements.small,
    )({});
    new Date(d.created).toLocaleString();
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.small,
      __VLS_intrinsicElements.small,
    )({
      ...{ class: "error" },
    });
    d.error;
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.td,
      __VLS_intrinsicElements.td,
    )({});
    d.reference_name || "未提供";
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.small,
      __VLS_intrinsicElements.small,
    )({});
    d.samples || "无样本列";
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.td,
      __VLS_intrinsicElements.td,
    )({});
    d.record_count.toLocaleString();
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.td,
      __VLS_intrinsicElements.td,
    )({});
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.span,
      __VLS_intrinsicElements.span,
    )({
      ...{ class: "badge" },
      ...{ class: d.status },
    });
    d.status;
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.td,
      __VLS_intrinsicElements.td,
    )({
      ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.button,
      __VLS_intrinsicElements.button,
    )({
      ...{
        onClick: (...[$event]) => {
          if (!!(__VLS_ctx.view === "项目说明")) return;
          if (!(__VLS_ctx.view === "数据集管理")) return;
          __VLS_ctx.selected = d.id;
          __VLS_ctx.choose();
          __VLS_ctx.view = "变异浏览";
        },
      },
    });
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.button,
      __VLS_intrinsicElements.button,
    )({
      ...{
        onClick: (...[$event]) => {
          if (!!(__VLS_ctx.view === "项目说明")) return;
          if (!(__VLS_ctx.view === "数据集管理")) return;
          __VLS_ctx.reanalyze(d);
        },
      },
      disabled: d.status !== "READY",
    });
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.button,
      __VLS_intrinsicElements.button,
    )({
      ...{
        onClick: (...[$event]) => {
          if (!!(__VLS_ctx.view === "项目说明")) return;
          if (!(__VLS_ctx.view === "数据集管理")) return;
          __VLS_ctx.remove(d);
        },
      },
    });
  }
  if (!__VLS_ctx.datasets.length) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.p,
      __VLS_intrinsicElements.p,
    )({
      ...{ class: "empty" },
    });
  }
} else {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({
    ...{ class: "datasetbar" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.label,
    __VLS_intrinsicElements.label,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.select,
    __VLS_intrinsicElements.select,
  )({
    ...{ onChange: __VLS_ctx.choose },
    value: __VLS_ctx.selected,
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.option,
    __VLS_intrinsicElements.option,
  )({
    value: undefined,
  });
  for (const [d] of __VLS_getVForSourceType(__VLS_ctx.datasets)) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.option,
      __VLS_intrinsicElements.option,
    )({
      value: d.id,
    });
    d.name;
    d.status;
  }
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.span,
    __VLS_intrinsicElements.span,
  )({
    ...{ class: "muted" },
  });
  __VLS_ctx.current?.reference_name || "未提供";
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.br,
    __VLS_intrinsicElements.br,
  )({});
  __VLS_ctx.current?.samples || "无样本列";
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.span,
    __VLS_intrinsicElements.span,
  )({
    ...{ class: "tag" },
  });
  __VLS_ctx.current?.status || "NO DATA";
  if (!__VLS_ctx.selected) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.div,
      __VLS_intrinsicElements.div,
    )({
      ...{ class: "panel empty" },
    });
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.h2,
      __VLS_intrinsicElements.h2,
    )({});
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.p,
      __VLS_intrinsicElements.p,
    )({});
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.button,
      __VLS_intrinsicElements.button,
    )({
      ...{
        onClick: (...[$event]) => {
          if (!!(__VLS_ctx.view === "项目说明")) return;
          if (!!(__VLS_ctx.view === "数据集管理")) return;
          if (!!__VLS_ctx.selected) return;
          __VLS_ctx.view = "数据集管理";
        },
      },
      ...{ class: "primary" },
    });
  } else {
    if (__VLS_ctx.view !== "概览工作台") {
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.section,
        __VLS_intrinsicElements.section,
      )({
        ...{ class: "filters panel" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.header,
        __VLS_intrinsicElements.header,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.h3,
        __VLS_intrinsicElements.h3,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.button,
        __VLS_intrinsicElements.button,
      )({
        ...{
          onClick: (...[$event]) => {
            if (!!(__VLS_ctx.view === "项目说明")) return;
            if (!!(__VLS_ctx.view === "数据集管理")) return;
            if (!!!__VLS_ctx.selected) return;
            if (!(__VLS_ctx.view !== "概览工作台")) return;
            __VLS_ctx.filters = {
              chrom: "",
              start: "",
              end: "",
              type: "",
              minQual: "",
              filter: "",
              variantId: "",
              sort: "id",
              direction: "asc",
            };
            __VLS_ctx.page = 0;
            __VLS_ctx.load();
          },
        },
        ...{ class: "text" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.form,
        __VLS_intrinsicElements.form,
      )({
        ...{
          onSubmit: (...[$event]) => {
            if (!!(__VLS_ctx.view === "项目说明")) return;
            if (!!(__VLS_ctx.view === "数据集管理")) return;
            if (!!!__VLS_ctx.selected) return;
            if (!(__VLS_ctx.view !== "概览工作台")) return;
            __VLS_ctx.page = 0;
            __VLS_ctx.load();
          },
        },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.input,
        __VLS_intrinsicElements.input,
      )({
        placeholder: "如 1 / chr1",
      });
      __VLS_ctx.filters.chrom;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.input,
        __VLS_intrinsicElements.input,
      )({
        type: "number",
        min: "1",
      });
      __VLS_ctx.filters.start;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.input,
        __VLS_intrinsicElements.input,
      )({
        type: "number",
        min: "1",
      });
      __VLS_ctx.filters.end;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.select,
        __VLS_intrinsicElements.select,
      )({
        value: __VLS_ctx.filters.type,
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "",
      });
      for (const [t] of __VLS_getVForSourceType([
        "SNV",
        "INSERTION",
        "DELETION",
        "COMPLEX",
        "UNSUPPORTED",
      ])) {
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.option,
          __VLS_intrinsicElements.option,
        )({});
        t;
      }
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.input,
        __VLS_intrinsicElements.input,
      )({
        type: "number",
        min: "0",
        step: "any",
      });
      __VLS_ctx.filters.minQual;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.input,
        __VLS_intrinsicElements.input,
      )({
        placeholder: "PASS / . / q10",
      });
      __VLS_ctx.filters.filter;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.input,
        __VLS_intrinsicElements.input,
      )({
        placeholder: "精确匹配",
      });
      __VLS_ctx.filters.variantId;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.button,
        __VLS_intrinsicElements.button,
      )({
        ...{ class: "primary" },
        disabled: __VLS_ctx.busy,
      });
    }
    if (__VLS_ctx.stats) {
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({
        ...{ class: "metrics" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.span,
        __VLS_intrinsicElements.span,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.strong,
        __VLS_intrinsicElements.strong,
      )({});
      __VLS_ctx.stats.total.toLocaleString();
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.small,
        __VLS_intrinsicElements.small,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.span,
        __VLS_intrinsicElements.span,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.strong,
        __VLS_intrinsicElements.strong,
      )({});
      __VLS_ctx.stats.chromosomes.length;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.small,
        __VLS_intrinsicElements.small,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.span,
        __VLS_intrinsicElements.span,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.strong,
        __VLS_intrinsicElements.strong,
      )({});
      __VLS_ctx.stats.titv?.toFixed(3) || "—";
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.small,
        __VLS_intrinsicElements.small,
      )({});
      __VLS_ctx.stats.transitions;
      __VLS_ctx.stats.transversions;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.span,
        __VLS_intrinsicElements.span,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.strong,
        __VLS_intrinsicElements.strong,
      )({});
      __VLS_ctx.stats.types.find((x) => x.label === "SNV")?.value || 0;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.em,
        __VLS_intrinsicElements.em,
      )({});
      __VLS_ctx.stats.types
        .filter((x) => ["INSERTION", "DELETION"].includes(x.label))
        .reduce((a, x) => a + x.value, 0);
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.small,
        __VLS_intrinsicElements.small,
      )({});
    }
    if (__VLS_ctx.view === "变异浏览") {
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.section,
        __VLS_intrinsicElements.section,
      )({
        ...{ class: "panel" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.header,
        __VLS_intrinsicElements.header,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.h2,
        __VLS_intrinsicElements.h2,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.small,
        __VLS_intrinsicElements.small,
      )({});
      __VLS_ctx.total.toLocaleString();
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.p,
        __VLS_intrinsicElements.p,
      )({
        ...{ class: "muted" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.a,
        __VLS_intrinsicElements.a,
      )({
        ...{ class: "button" },
        href: `/api/datasets/${__VLS_ctx.selected}/export?${__VLS_ctx.query()}`,
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({
        ...{ class: "sort" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.label,
        __VLS_intrinsicElements.label,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.select,
        __VLS_intrinsicElements.select,
      )({
        ...{ onChange: __VLS_ctx.load },
        value: __VLS_ctx.filters.sort,
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "id",
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "pos",
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "qual",
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "chrom",
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.select,
        __VLS_intrinsicElements.select,
      )({
        ...{ onChange: __VLS_ctx.load },
        value: __VLS_ctx.filters.direction,
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "asc",
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.option,
        __VLS_intrinsicElements.option,
      )({
        value: "desc",
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({
        ...{ class: "tablewrap" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.table,
        __VLS_intrinsicElements.table,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.thead,
        __VLS_intrinsicElements.thead,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.tr,
        __VLS_intrinsicElements.tr,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.th,
        __VLS_intrinsicElements.th,
      )({});
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.tbody,
        __VLS_intrinsicElements.tbody,
      )({});
      for (const [row] of __VLS_getVForSourceType(__VLS_ctx.rows)) {
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.tr,
          __VLS_intrinsicElements.tr,
        )({
          ...{
            onClick: (...[$event]) => {
              if (!!(__VLS_ctx.view === "项目说明")) return;
              if (!!(__VLS_ctx.view === "数据集管理")) return;
              if (!!!__VLS_ctx.selected) return;
              if (!(__VLS_ctx.view === "变异浏览")) return;
              __VLS_ctx.detail = row;
            },
          },
          ...{
            onKeydown: (...[$event]) => {
              if (!!(__VLS_ctx.view === "项目说明")) return;
              if (!!(__VLS_ctx.view === "数据集管理")) return;
              if (!!!__VLS_ctx.selected) return;
              if (!(__VLS_ctx.view === "变异浏览")) return;
              __VLS_ctx.detail = row;
            },
          },
          tabindex: "0",
        });
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({});
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.span,
          __VLS_intrinsicElements.span,
        )({
          ...{ class: "chrom" },
        });
        row.chrom;
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({
          ...{ class: "mono" },
        });
        row.pos.toLocaleString();
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({});
        row.variant_id;
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({
          ...{ class: "mono" },
        });
        row.ref;
        row.alt;
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({});
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.span,
          __VLS_intrinsicElements.span,
        )({
          ...{ class: "badge" },
        });
        row.type;
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({});
        row.qual ?? "—";
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.td,
          __VLS_intrinsicElements.td,
        )({});
        row.filter_value;
      }
      if (!__VLS_ctx.rows.length) {
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.p,
          __VLS_intrinsicElements.p,
        )({
          ...{ class: "empty" },
        });
      }
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.footer,
        __VLS_intrinsicElements.footer,
      )({
        ...{ class: "pagination" },
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.span,
        __VLS_intrinsicElements.span,
      )({});
      __VLS_ctx.page + 1;
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.button,
        __VLS_intrinsicElements.button,
      )({
        ...{
          onClick: (...[$event]) => {
            if (!!(__VLS_ctx.view === "项目说明")) return;
            if (!!(__VLS_ctx.view === "数据集管理")) return;
            if (!!!__VLS_ctx.selected) return;
            if (!(__VLS_ctx.view === "变异浏览")) return;
            __VLS_ctx.page--;
            __VLS_ctx.load();
          },
        },
        disabled: !__VLS_ctx.page || __VLS_ctx.busy,
      });
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.button,
        __VLS_intrinsicElements.button,
      )({
        ...{
          onClick: (...[$event]) => {
            if (!!(__VLS_ctx.view === "项目说明")) return;
            if (!!(__VLS_ctx.view === "数据集管理")) return;
            if (!!!__VLS_ctx.selected) return;
            if (!(__VLS_ctx.view === "变异浏览")) return;
            __VLS_ctx.page++;
            __VLS_ctx.load();
          },
        },
        disabled:
          (__VLS_ctx.page + 1) * 25 >= __VLS_ctx.total || __VLS_ctx.busy,
      });
    } else if (__VLS_ctx.stats) {
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.div,
        __VLS_intrinsicElements.div,
      )({
        ...{ class: "charts" },
      });
      /** @type {[typeof Chart, ]} */ // @ts-ignore
      const __VLS_0 = __VLS_asFunctionalComponent(
        Chart,
        new Chart({
          ...{ onSelect: {} },
          title: "染色体变异分布",
          data: __VLS_ctx.stats.chromosomes,
        }),
      );
      const __VLS_1 = __VLS_0(
        {
          ...{ onSelect: {} },
          title: "染色体变异分布",
          data: __VLS_ctx.stats.chromosomes,
        },
        ...__VLS_functionalComponentArgsRest(__VLS_0),
      );
      let __VLS_3;
      let __VLS_4;
      let __VLS_5;
      const __VLS_6 = {
        onSelect: (...[$event]) => {
          if (!!(__VLS_ctx.view === "项目说明")) return;
          if (!!(__VLS_ctx.view === "数据集管理")) return;
          if (!!!__VLS_ctx.selected) return;
          if (!!(__VLS_ctx.view === "变异浏览")) return;
          if (!__VLS_ctx.stats) return;
          __VLS_ctx.chartFilter("chrom", $event);
        },
      };
      var __VLS_2;
      /** @type {[typeof Chart, ]} */ // @ts-ignore
      const __VLS_7 = __VLS_asFunctionalComponent(
        Chart,
        new Chart({
          ...{ onSelect: {} },
          title: "变异类型构成",
          kind: "pie",
          data: __VLS_ctx.stats.types,
        }),
      );
      const __VLS_8 = __VLS_7(
        {
          ...{ onSelect: {} },
          title: "变异类型构成",
          kind: "pie",
          data: __VLS_ctx.stats.types,
        },
        ...__VLS_functionalComponentArgsRest(__VLS_7),
      );
      let __VLS_10;
      let __VLS_11;
      let __VLS_12;
      const __VLS_13 = {
        onSelect: (...[$event]) => {
          if (!!(__VLS_ctx.view === "项目说明")) return;
          if (!!(__VLS_ctx.view === "数据集管理")) return;
          if (!!!__VLS_ctx.selected) return;
          if (!!(__VLS_ctx.view === "变异浏览")) return;
          if (!__VLS_ctx.stats) return;
          __VLS_ctx.chartFilter("type", $event);
        },
      };
      var __VLS_9;
      /** @type {[typeof Chart, ]} */ // @ts-ignore
      const __VLS_14 = __VLS_asFunctionalComponent(
        Chart,
        new Chart({
          title: "碱基替换分布",
          data: __VLS_ctx.stats.substitutions,
        }),
      );
      const __VLS_15 = __VLS_14(
        {
          title: "碱基替换分布",
          data: __VLS_ctx.stats.substitutions,
        },
        ...__VLS_functionalComponentArgsRest(__VLS_14),
      );
      /** @type {[typeof Chart, ]} */ // @ts-ignore
      const __VLS_17 = __VLS_asFunctionalComponent(
        Chart,
        new Chart({
          title: "QUAL 质量分数分布",
          data: __VLS_ctx.stats.quality,
        }),
      );
      const __VLS_18 = __VLS_17(
        {
          title: "QUAL 质量分数分布",
          data: __VLS_ctx.stats.quality,
        },
        ...__VLS_functionalComponentArgsRest(__VLS_17),
      );
      if (__VLS_ctx.view === "统计分析") {
        /** @type {[typeof Chart, ]} */ // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(
          Chart,
          new Chart({
            title: "FILTER 状态分布",
            data: __VLS_ctx.stats.filters,
          }),
        );
        const __VLS_21 = __VLS_20(
          {
            title: "FILTER 状态分布",
            data: __VLS_ctx.stats.filters,
          },
          ...__VLS_functionalComponentArgsRest(__VLS_20),
        );
        /** @type {[typeof Chart, ]} */ // @ts-ignore
        const __VLS_23 = __VLS_asFunctionalComponent(
          Chart,
          new Chart({
            title: "基因组位置分布 · 1 Mb 分箱",
            data: __VLS_ctx.positions,
          }),
        );
        const __VLS_24 = __VLS_23(
          {
            title: "基因组位置分布 · 1 Mb 分箱",
            data: __VLS_ctx.positions,
          },
          ...__VLS_functionalComponentArgsRest(__VLS_23),
        );
      }
      __VLS_asFunctionalElement(
        __VLS_intrinsicElements.p,
        __VLS_intrinsicElements.p,
      )({
        ...{ class: "footnote" },
      });
      __VLS_ctx.query() ? "及已应用的筛选条件" : "";
      if (__VLS_ctx.view === "概览工作台") {
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.section,
          __VLS_intrinsicElements.section,
        )({
          ...{ class: "panel" },
        });
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.header,
          __VLS_intrinsicElements.header,
        )({});
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.h2,
          __VLS_intrinsicElements.h2,
        )({});
        __VLS_asFunctionalElement(
          __VLS_intrinsicElements.button,
          __VLS_intrinsicElements.button,
        )({
          ...{
            onClick: (...[$event]) => {
              if (!!(__VLS_ctx.view === "项目说明")) return;
              if (!!(__VLS_ctx.view === "数据集管理")) return;
              if (!!!__VLS_ctx.selected) return;
              if (!!(__VLS_ctx.view === "变异浏览")) return;
              if (!__VLS_ctx.stats) return;
              if (!(__VLS_ctx.view === "概览工作台")) return;
              __VLS_ctx.view = "数据集管理";
            },
          },
        });
        for (const [d] of __VLS_getVForSourceType(
          __VLS_ctx.datasets.slice(0, 4),
        )) {
          __VLS_asFunctionalElement(
            __VLS_intrinsicElements.div,
            __VLS_intrinsicElements.div,
          )({
            ...{ class: "recent" },
          });
          __VLS_asFunctionalElement(
            __VLS_intrinsicElements.b,
            __VLS_intrinsicElements.b,
          )({});
          d.name;
          __VLS_asFunctionalElement(
            __VLS_intrinsicElements.span,
            __VLS_intrinsicElements.span,
          )({});
          d.record_count.toLocaleString();
          __VLS_asFunctionalElement(
            __VLS_intrinsicElements.span,
            __VLS_intrinsicElements.span,
          )({
            ...{ class: "badge" },
          });
          d.status;
          __VLS_asFunctionalElement(
            __VLS_intrinsicElements.span,
            __VLS_intrinsicElements.span,
          )({
            ...{ class: "muted" },
          });
          new Date(d.created).toLocaleString();
        }
      }
    }
  }
}
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.footer,
  __VLS_intrinsicElements.footer,
)({
  ...{ class: "pagefoot" },
});
__VLS_asFunctionalElement(
  __VLS_intrinsicElements.span,
  __VLS_intrinsicElements.span,
)({});
if (__VLS_ctx.detail) {
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({
    ...{
      onClick: (...[$event]) => {
        if (!__VLS_ctx.detail) return;
        __VLS_ctx.detail = undefined;
      },
    },
    ...{ class: "overlay" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.section,
    __VLS_intrinsicElements.section,
  )({
    ...{ class: "drawer" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.header,
    __VLS_intrinsicElements.header,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.div,
    __VLS_intrinsicElements.div,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({
    ...{ class: "eyebrow" },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h2,
    __VLS_intrinsicElements.h2,
  )({});
  __VLS_ctx.detail.chrom;
  __VLS_ctx.detail.pos;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.button,
    __VLS_intrinsicElements.button,
  )({
    ...{
      onClick: (...[$event]) => {
        if (!__VLS_ctx.detail) return;
        __VLS_ctx.detail = undefined;
      },
    },
  });
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h3,
    __VLS_intrinsicElements.h3,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.dl,
    __VLS_intrinsicElements.dl,
  )({});
  for (const [k] of __VLS_getVForSourceType([
    "variant_id",
    "ref",
    "alt",
    "qual",
    "filter_value",
    "format_value",
    "sample_value",
  ])) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.dt,
      __VLS_intrinsicElements.dt,
    )({});
    k;
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.dd,
      __VLS_intrinsicElements.dd,
    )({});
    __VLS_ctx.detail[k] ?? "缺失";
  }
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.dt,
    __VLS_intrinsicElements.dt,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.dd,
    __VLS_intrinsicElements.dd,
  )({});
  __VLS_ctx.gt;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h3,
    __VLS_intrinsicElements.h3,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.dl,
    __VLS_intrinsicElements.dl,
  )({});
  for (const [part] of __VLS_getVForSourceType(
    __VLS_ctx.detail.info.split(";"),
  )) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.dt,
      __VLS_intrinsicElements.dt,
    )({});
    part.split("=")[0];
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.dd,
      __VLS_intrinsicElements.dd,
    )({});
    part.includes("=") ? part.substring(part.indexOf("=") + 1) : "Flag / 缺失";
  }
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h3,
    __VLS_intrinsicElements.h3,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({});
  __VLS_ctx.detail.type;
  if (__VLS_ctx.detail.warning) {
    __VLS_asFunctionalElement(
      __VLS_intrinsicElements.p,
      __VLS_intrinsicElements.p,
    )({
      ...{ class: "alert" },
    });
    __VLS_ctx.detail.warning;
  }
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.h3,
    __VLS_intrinsicElements.h3,
  )({});
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.pre,
    __VLS_intrinsicElements.pre,
  )({});
  __VLS_ctx.detail.raw_line;
  __VLS_asFunctionalElement(
    __VLS_intrinsicElements.p,
    __VLS_intrinsicElements.p,
  )({
    ...{ class: "muted" },
  });
}
/** @type {__VLS_StyleScopedClasses['shell']} */ /** @type {__VLS_StyleScopedClasses['brand']} */ /** @type {__VLS_StyleScopedClasses['mark']} */ /** @type {__VLS_StyleScopedClasses['workspace']} */ /** @type {__VLS_StyleScopedClasses['active']} */ /** @type {__VLS_StyleScopedClasses['aside-foot']} */ /** @type {__VLS_StyleScopedClasses['tag']} */ /** @type {__VLS_StyleScopedClasses['topbar']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ /** @type {__VLS_StyleScopedClasses['content']} */ /** @type {__VLS_StyleScopedClasses['pagehead']} */ /** @type {__VLS_StyleScopedClasses['eyebrow']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ /** @type {__VLS_StyleScopedClasses['primary']} */ /** @type {__VLS_StyleScopedClasses['alert']} */ /** @type {__VLS_StyleScopedClasses['text']} */ /** @type {__VLS_StyleScopedClasses['loading']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['prose']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['upload']} */ /** @type {__VLS_StyleScopedClasses['tag']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ /** @type {__VLS_StyleScopedClasses['primary']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['tablewrap']} */ /** @type {__VLS_StyleScopedClasses['error']} */ /** @type {__VLS_StyleScopedClasses['badge']} */ /** @type {__VLS_StyleScopedClasses['actions']} */ /** @type {__VLS_StyleScopedClasses['empty']} */ /** @type {__VLS_StyleScopedClasses['datasetbar']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ /** @type {__VLS_StyleScopedClasses['tag']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['empty']} */ /** @type {__VLS_StyleScopedClasses['primary']} */ /** @type {__VLS_StyleScopedClasses['filters']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['text']} */ /** @type {__VLS_StyleScopedClasses['primary']} */ /** @type {__VLS_StyleScopedClasses['metrics']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ /** @type {__VLS_StyleScopedClasses['button']} */ /** @type {__VLS_StyleScopedClasses['sort']} */ /** @type {__VLS_StyleScopedClasses['tablewrap']} */ /** @type {__VLS_StyleScopedClasses['chrom']} */ /** @type {__VLS_StyleScopedClasses['mono']} */ /** @type {__VLS_StyleScopedClasses['mono']} */ /** @type {__VLS_StyleScopedClasses['badge']} */ /** @type {__VLS_StyleScopedClasses['empty']} */ /** @type {__VLS_StyleScopedClasses['pagination']} */ /** @type {__VLS_StyleScopedClasses['charts']} */ /** @type {__VLS_StyleScopedClasses['footnote']} */ /** @type {__VLS_StyleScopedClasses['panel']} */ /** @type {__VLS_StyleScopedClasses['recent']} */ /** @type {__VLS_StyleScopedClasses['badge']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ /** @type {__VLS_StyleScopedClasses['pagefoot']} */ /** @type {__VLS_StyleScopedClasses['overlay']} */ /** @type {__VLS_StyleScopedClasses['drawer']} */ /** @type {__VLS_StyleScopedClasses['eyebrow']} */ /** @type {__VLS_StyleScopedClasses['alert']} */ /** @type {__VLS_StyleScopedClasses['muted']} */ var __VLS_dollars;
const __VLS_self = (await import("vue")).defineComponent({
  setup() {
    return {
      Chart: Chart,
      nav: nav,
      view: view,
      datasets: datasets,
      selected: selected,
      current: current,
      stats: stats,
      rows: rows,
      total: total,
      page: page,
      detail: detail,
      error: error,
      busy: busy,
      progress: progress,
      name: name,
      reference: reference,
      file: file,
      filters: filters,
      query: query,
      load: load,
      choose: choose,
      upload: upload,
      example: example,
      remove: remove,
      reanalyze: reanalyze,
      chartFilter: chartFilter,
      positions: positions,
      gt: gt,
    };
  },
});
export default (await import("vue")).defineComponent({
  setup() {
    return {};
  },
}); /* PartiallyEnd: #4569/main.vue */
