<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  defineAsyncComponent,
} from "vue";
const Chart = defineAsyncComponent(() => import("./Chart.vue"));
import UiIcon from "./components/UiIcon.vue";
import LoadingSkeleton from "./components/LoadingSkeleton.vue";
import StatusBadge from "./components/StatusBadge.vue";
import DatasetContext from "./components/DatasetContext.vue";
import MetricSummary from "./components/MetricSummary.vue";
import FilterBar from "./components/FilterBar.vue";
import VariantTable from "./components/VariantTable.vue";
import VariantDetail from "./components/VariantDetail.vue";
import UiDialog from "./components/UiDialog.vue";
import DatasetManager from "./views/DatasetManager.vue";
import type { Dataset, Statistics, Variant, Filters } from "./lib/domain";
import { emptyFilters, filterQuery, number, dateTime } from "./lib/domain";
const pages = [
  {
    id: "overview",
    label: "概览工作台",
    icon: "overview",
    description: "从数据全貌，到每一条变异记录。",
  },
  {
    id: "datasets",
    label: "数据集管理",
    icon: "datasets",
    description: "管理导入文件、数据来源与解析状态。",
  },
  {
    id: "variants",
    label: "变异浏览",
    icon: "variants",
    description: "组合筛选与逐条核验，保留完整的数据上下文。",
  },
  {
    id: "analysis",
    label: "统计分析",
    icon: "analysis",
    description: "在同一个筛选范围内，观察分布与质量特征。",
  },
  {
    id: "about",
    label: "项目说明",
    icon: "info",
    description: "理解数据来源、指标口径与分析边界。",
  },
];
function hashPage() {
  const id = location.hash.slice(1);
  return pages.some((x) => x.id === id) ? id : "overview";
}
const view = ref(hashPage());
const sidebarCollapsed = ref(false);
const isNarrow = ref(window.innerWidth < 760);
function resizeLayout() {
  isNarrow.value = window.innerWidth < 760;
  if (!isNarrow.value) navOpen.value = false;
}
const navOpen = ref(false);
function toggleSidebar() {
  if (window.innerWidth < 760) navOpen.value = !navOpen.value;
  else sidebarCollapsed.value = !sidebarCollapsed.value;
}
function closeNavigation(event: KeyboardEvent) {
  if (event.key === "Escape") navOpen.value = false;
}

const currentPage = computed(() => pages.find((x) => x.id === view.value)!);
function navigate(id: string) {
  navOpen.value = false;
  view.value = id;
  location.hash = id;
  success.value = "";
  window.scrollTo({ top: 0, behavior: "instant" });
}
function syncHash() {
  view.value = hashPage();
}
const datasets = ref<Dataset[]>([]);
const selected = ref<number>();
const current = computed(() =>
  datasets.value.find((x) => x.id === selected.value),
);
const stats = ref<Statistics>();
const rows = ref<Variant[]>([]);
const total = ref(0);
const page = ref(0);
const detail = ref<Variant>();
const pendingDelete = ref<Dataset>();
const initializing = ref(true);
const loading = ref(false);
const operation = ref(false);
const busy = computed(
  () => initializing.value || loading.value || operation.value,
);
const error = ref("");
const success = ref("");
const progress = ref("");
const draft = ref<Filters>(emptyFilters());
const applied = ref<Filters>(emptyFilters());
const sort = ref("id");
const direction = ref("asc");
let generation = 0;
const query = computed(() => filterQuery(applied.value));
const exportUrl = computed(
  () => `/api/datasets/${selected.value}/export?${query.value}`,
);
const positions = computed(
  () =>
    stats.value?.positions.map((x) => ({
      label: `${x.chromosome}:${x.bin + 1} Mb`,
      value: x.value,
    })) || [],
);
const typeDistribution = computed(() =>
  ["SNV", "INSERTION", "DELETION", "COMPLEX", "UNSUPPORTED"].flatMap(
    (type) => stats.value?.types.filter((x) => x.label === type) || [],
  ),
);
const readyCount = computed(
  () => datasets.value.filter((x) => x.status === "READY").length,
);
async function api(url: string, options?: RequestInit) {
  let r: Response;
  try {
    r = await fetch("/api" + url, options);
  } catch (e) {
    if (e instanceof TypeError)
      throw new Error("无法连接数据服务，请检查后端连接后重试");
    throw e;
  }
  if (!r.ok) {
    const x = await r
      .json()
      .catch(() => ({ message: "服务暂不可用，请检查后端连接" }));
    throw Error(x.message || "请求失败");
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
async function load(onlyRows = false) {
  const gen = ++generation;
  detail.value = undefined;
  if (!selected.value || current.value?.status !== "READY") {
    loading.value = false;
    stats.value = undefined;
    rows.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const [s, v] = await Promise.all([
      onlyRows && stats.value
        ? Promise.resolve(stats.value)
        : api(`/datasets/${selected.value}/stats?${query.value}`),
      api(
        `/datasets/${selected.value}/variants?${query.value}&page=${page.value}&size=25&sort=${sort.value}&direction=${direction.value}`,
      ),
    ]);
    if (gen === generation) {
      stats.value = s;
      rows.value = v.items;
      total.value = v.total;
    }
  } catch (e: any) {
    if (gen === generation) {
      error.value = e.message;
      stats.value = undefined;
      rows.value = [];
      total.value = 0;
    }
  } finally {
    if (gen === generation) loading.value = false;
  }
}
async function retry() {
  error.value = "";
  loading.value = true;
  try {
    await refreshList();
  } catch (e: any) {
    error.value = e.message;
    stats.value = undefined;
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}
async function refreshList() {
  datasets.value = await api("/datasets");
  if (!selected.value || !datasets.value.some((x) => x.id === selected.value)) {
    selected.value = datasets.value.find((x) => x.status === "READY")?.id;
    draft.value = emptyFilters();
    applied.value = emptyFilters();
    page.value = 0;
  }
  await load();
}
async function choose(id: number | undefined) {
  error.value = "";
  selected.value = id;
  stats.value = undefined;
  rows.value = [];
  page.value = 0;
  draft.value = emptyFilters();
  applied.value = emptyFilters();
  await load();
}
function apply() {
  applied.value = { ...draft.value };
  page.value = 0;
  load();
}
function reset() {
  draft.value = emptyFilters();
  apply();
}
function chartFilter(key: "chrom" | "type", v: string) {
  draft.value = { ...applied.value, [key]: v };
  applied.value = { ...draft.value };
  page.value = 0;
  navigate("variants");
  load();
}
async function upload(payload: {
  file: File;
  name: string;
  reference: string;
}) {
  if (busy.value) return;
  operation.value = true;
  error.value = "";
  success.value = "";
  progress.value = "准备上传";
  try {
    const form = new FormData();
    form.append("file", payload.file);
    form.append("name", payload.name);
    if (payload.reference) form.append("reference", payload.reference);
    const result: Dataset = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/datasets");
      xhr.upload.onprogress = (e) => {
        progress.value = e.lengthComputable
          ? e.loaded === e.total
            ? "上传完成，正在解析与写入…"
            : `正在上传 ${Math.round((e.loaded / e.total) * 100)}%`
          : "正在上传…";
      };
      xhr.onload = () => {
        try {
          const x = JSON.parse(xhr.responseText);
          xhr.status < 300
            ? resolve(x)
            : reject(Error(x.message || "导入失败"));
        } catch {
          reject(Error("服务器返回无效响应，请稍后重试"));
        }
      };
      xhr.onerror = () => reject(Error("网络连接失败"));
      xhr.send(form);
    });
    selected.value = result.id;
    draft.value = emptyFilters();
    applied.value = emptyFilters();
    page.value = 0;
    await refreshList();
    navigate("datasets");
    if (result.status === "FAILED")
      error.value = result.error || "解析失败，请查看数据集错误记录";
    else
      success.value = `已导入 ${number(result.record_count)} 条变异记录：${result.name}`;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    operation.value = false;
    progress.value = "";
  }
}
async function example() {
  if (busy.value) return;
  error.value = "";
  try {
    const r = await fetch("/data/clinvar-grch38-subset.vcf");
    if (!r.ok) throw Error("示例文件不可用");
    await upload({
      file: new File([await r.blob()], "ClinVar-GRCh38-1000.vcf"),
      name: "ClinVar · GRCh38 公开子集",
      reference: "",
    });
  } catch (e: any) {
    error.value = e.message;
  }
}
async function remove() {
  if (!pendingDelete.value || busy.value) return;
  operation.value = true;
  error.value = "";
  try {
    await api(`/datasets/${pendingDelete.value.id}`, { method: "DELETE" });
    pendingDelete.value = undefined;
    await refreshList();
    success.value = "数据集及其变异记录已删除";
  } catch (e: any) {
    error.value = e.message;
  } finally {
    operation.value = false;
  }
}
async function reanalyze(ds: Dataset) {
  if (busy.value) return;
  operation.value = true;
  error.value = "";
  try {
    await api(`/datasets/${ds.id}/reanalyze`, { method: "POST" });
    await choose(ds.id);
    navigate("analysis");
    success.value = "已根据存储记录重新计算统计";
  } catch (e: any) {
    error.value = e.message;
  } finally {
    operation.value = false;
  }
}
function openDataset(ds: Dataset) {
  if (ds.status !== "READY") return;
  choose(ds.id);
  navigate("variants");
}
function changeSort(value: string) {
  sort.value = value;
  page.value = 0;
  load(true);
}
function changeDirection(value: string) {
  direction.value = value;
  page.value = 0;
  load(true);
}
watch(view, () => {
  detail.value = undefined;
});
onMounted(() => {
  window.addEventListener("hashchange", syncHash);
  window.addEventListener("keydown", closeNavigation);
  window.addEventListener("resize", resizeLayout);
  refreshList()
    .catch((e) => (error.value = e.message))
    .finally(() => (initializing.value = false));
});
onBeforeUnmount(() => {
  window.removeEventListener("hashchange", syncHash);
  window.removeEventListener("keydown", closeNavigation);
  window.removeEventListener("resize", resizeLayout);
});
</script>
<template>
  <div
    :class="[
      'app-shell',
      { 'sidebar-collapsed': sidebarCollapsed, 'nav-open': navOpen },
    ]"
  >
    <aside class="sidebar">
      <a class="brand" href="#overview" @click.prevent="navigate('overview')"
        ><span class="brand-mark"
          ><svg viewBox="0 0 28 28" fill="none">
            <path
              d="M5 6l9 16L23 6M9.5 6l9 16M8.5 12h11M11.5 17h5"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            /></svg></span
        ><span>VariantScope<small>基因变异分析</small></span></a
      >
      <div class="nav-caption">资料库</div>
      <nav aria-label="主导航">
        <a
          v-for="p in pages.slice(0, 4)"
          :key="p.id"
          :href="'#' + p.id"
          :aria-current="view === p.id ? 'page' : undefined"
          :class="['nav-item', p.id, { active: view === p.id }]"
          :title="p.label"
          @click.prevent="navigate(p.id)"
          ><UiIcon :name="p.icon" /><span>{{ p.label }}</span
          ><span
            v-if="p.id === 'datasets' && datasets.length"
            class="nav-count"
            >{{ datasets.length }}</span
          ></a
        >
      </nav>
      <div class="nav-separator"></div>
      <a
        href="#about"
        :class="['nav-item', { active: view === 'about' }]"
        :aria-current="view === 'about' ? 'page' : undefined"
        @click.prevent="navigate('about')"
        ><UiIcon name="info" /><span>项目说明</span></a
      >
      <div class="sidebar-bottom">
        <span class="version">VariantScope <span>v1.0</span></span>
        <p>教学与科研数据探索</p>
        <a
          href="https://github.com/whisper-uoo/VariantScope"
          target="_blank"
          rel="noopener noreferrer"
          >开源仓库<UiIcon name="external"
        /></a>
      </div>
    </aside>
    <main class="main-content">
      <header class="workspace-header">
        <button
          class="icon-button sidebar-toggle"
          aria-label="切换侧边栏"
          :aria-expanded="isNarrow ? navOpen : !sidebarCollapsed"
          @click="toggleSidebar"
        >
          <UiIcon name="sidebar" />
        </button>
        <div class="toolbar-title">
          <span>{{ currentPage.label }}</span><small
            v-if="current && view !== 'datasets' && view !== 'about'"
            >{{ current.name }}</small
          >
        </div>
        <div class="toolbar-actions">
          <button
            class="icon-button"
            title="浏览变异"
            aria-label="浏览变异"
            @click="navigate('variants')"
          >
            <UiIcon name="search" /></button
          ><button
            class="icon-button"
            title="刷新数据"
            aria-label="刷新数据"
            :disabled="busy"
            @click="retry"
          >
            <UiIcon name="refresh" /></button
          ><span class="toolbar-divider"></span
          ><button class="button secondary" @click="navigate('datasets')">
            <UiIcon name="plus" />导入 VCF
          </button>
        </div>
      </header>
      <div class="page-content">
        <header class="page-heading">
          <div>
            <p class="page-kicker">
              {{
                view === "overview"
                  ? "数据摘要"
                  : view === "analysis"
                    ? "分析视图"
                    : view === "datasets"
                      ? "文件与样本"
                      : view === "variants"
                        ? "记录检视"
                        : "方法与来源"
              }}
            </p>
            <h1>{{ currentPage.label }}</h1>
          </div>
          <p class="page-description">{{ currentPage.description }}</p>
        </header>
        <div v-if="error" class="notice error" role="alert">
          <UiIcon name="info" />
          <div>
            <strong>操作未完成</strong>
            <p>{{ error }}</p>
          </div>
          <button class="text-button" :disabled="busy" @click="retry">
            刷新数据
          </button>
          <button
            class="icon-button"
            aria-label="关闭错误提示"
            @click="error = ''"
          >
            <UiIcon name="close" />
          </button>
        </div>
        <div v-if="success" class="notice success" role="status">
          <UiIcon name="check" />
          <p>{{ success }}</p>
          <button
            class="icon-button"
            aria-label="关闭成功提示"
            @click="success = ''"
          >
            <UiIcon name="close" />
          </button>
        </div>
        <div v-if="busy" class="activity" role="status">
          <span class="spinner"></span>{{ progress || "正在读取真实数据…"
          }}<span class="activity-line"></span>
        </div>
        <DatasetManager
          v-if="view === 'datasets'"
          :datasets="datasets"
          :busy="busy"
          :progress="progress"
          @upload="upload"
          @example="example"
          @open="openDataset"
          @reanalyze="reanalyze"
          @remove="pendingDelete = $event"
        />
        <template v-else-if="view === 'about'"
          ><div class="about-intro">
            <span class="source-tag">关于 VariantScope</span>
            <h2>让变异数据的每一步，<br />都有据可查。</h2>
            <p>
              从 VCF
              原始记录到可复现的统计。保留数据来源，明确计算口径，让科研探索回到数据本身。
            </p>
          </div>
          <div class="about-grid">
            <section class="documentation-panel">
              <h2>数据与计算</h2>
              <dl class="method-list">
                <dt>变异分类</dt>
                <dd>
                  每行 VCF 记录计一次。单碱基替换归为
                  SNV；锚定的简单插入、缺失归为 InDel。多等位、符号 ALT
                  与结构变异保留原文并标记限制，不进行拆分或临床推断。
                </dd>
                <dt>Ti/Tv</dt>
                <dd>
                  仅使用 A/C/G/T 的双等位 SNV。A↔G、C↔T
                  为转换，其余为颠换。颠换数为零时显示“—”。
                </dd>
                <dt>QUAL 与 FILTER</dt>
                <dd>
                  质量分箱为
                  [0,20)、[20,50)、[50,100)、[100,+∞)，缺失值单独统计。PASS、未提供“.”及其他过滤标签分别分组。
                </dd>
                <dt>位置分布</dt>
                <dd>
                  1-based 闭区间坐标，按 1 Mb 分箱；最多返回 10,000
                  个非空箱，不代表覆盖深度。染色体名称不会自动合并。
                </dd>
              </dl>
            </section>
            <div>
              <section class="documentation-panel">
                <h2>公开示例来源</h2>
                <p>NCBI ClinVar · GRCh38</p>
                <p>
                  保留公开 VCF 头部与前 1,000
                  条记录，无个人样本列。属于局部截取，不能用于判断全基因组分布。参考版本仅在文件提供或用户指定时展示。
                </p>
                <a
                  href="https://www.ncbi.nlm.nih.gov/clinvar/docs/maintenance_use/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-link"
                  >ClinVar 数据使用政策<UiIcon name="external"
                /></a>
              </section>
              <section class="documentation-panel">
                <h2>支持范围与边界</h2>
                <ul>
                  <li>未压缩 VCF 4.x，单样本或无样本</li>
                  <li>最大 100 MB / 100 万条记录</li>
                  <li>除 GT 外的 FORMAT 仅展示原文</li>
                  <li>不支持 BCF、多样本、变异归一化</li>
                  <li>不提供医学诊断或系统致病性推断</li>
                </ul>
              </section>
            </div>
          </div></template
        >
        <template v-else
          ><div
            :class="[
              'dataset-section',
              { 'overview-summary': view === 'overview' },
            ]"
          >
            <DatasetContext
              :datasets="datasets"
              :current="current"
              :selected="selected"
              @select="choose"
            /><MetricSummary
              v-if="stats && view === 'overview'"
              :stats="stats"
            />
            <div v-if="stats && view === 'overview'" class="overview-note">
              <UiIcon name="info" />{{
                stats.chromosomes.length === 1
                  ? "当前数据仅包含一个 Contig，分布不代表全基因组覆盖。"
                  : "按文件中的染色体标识分组，未自动合并命名。"
              }}<button class="text-button" @click="navigate('about')">
                计算口径
              </button>
            </div>
          </div>
          <LoadingSkeleton v-if="busy && !stats && view !== 'datasets'" />
          <div v-if="!selected && !busy" class="empty-state page-empty">
            <UiIcon name="datasets" />
            <h2>从一份 VCF 开始探索</h2>
            <p>导入真实变异记录后，即可查看分布、质量与逐条详情。</p>
            <button class="button primary" @click="navigate('datasets')">
              导入第一个数据集
            </button>
          </div>
          <div
            v-else-if="current && current.status !== 'READY'"
            class="empty-state page-empty"
          >
            <UiIcon name="info" />
            <h2>
              {{
                current.status === "FAILED"
                  ? "这份数据尚未成功导入"
                  : "数据正在解析中"
              }}
            </h2>
            <p>{{ current.error || "请在数据集管理页面查看解析状态。" }}</p>
            <button class="button secondary" @click="navigate('datasets')">
              查看数据集状态
            </button>
          </div>
          <template v-else>
            <FilterBar
              v-if="view !== 'overview'"
              v-model="draft"
              :applied="applied"
              :busy="busy"
              @apply="apply"
              @reset="reset" />
            <div
              :class="['analysis-results', { refreshing: loading }]"
              :aria-busy="loading"
            >
              <MetricSummary
                v-if="stats && view !== 'overview'"
                :stats="stats"
                :compact="view === 'variants'"
              />
              <VariantTable
                v-if="view === 'variants'"
                :rows="rows"
                :total="total"
                :page="page"
                :busy="busy"
                :sort="sort"
                :direction="direction"
                :export-url="exportUrl"
                :active-id="detail?.id"
                @open="detail = $event"
                @page="
                  page = $event;
                  load(true);
                "
                @sort="changeSort"
                @direction="changeDirection"
              />
              <template v-else-if="stats"
                ><div class="analysis-section-heading">
                  <h2>{{ view === "overview" ? "数据分布" : "分布与质量" }}</h2>
                  <span
                    >{{ query ? "已应用筛选" : "全部记录" }} ·
                    {{ stats.chromosomes.length }} 个 Contig</span
                  >
                </div>
                <div
                  :class="[
                    'chart-grid',
                    { 'overview-grid': view === 'overview' },
                  ]"
                >
                  <Chart
                    title="染色体分布"
                    description="各 Contig 的实际变异记录"
                    :data="stats.chromosomes"
                    interactive
                    @select="chartFilter('chrom', $event)"
                  /><Chart
                    title="变异类型"
                    description="数量与占比 · 包含未分类记录"
                    kind="types"
                    :data="typeDistribution"
                    interactive
                    @select="chartFilter('type', $event)"
                  /><Chart
                    title="碱基替换"
                    description="12 种有向替换，不进行互补折叠"
                    :data="stats.substitutions"
                    note="绿色：转换 · 蓝色：颠换"
                  /><Chart
                    title="质量分数"
                    description="QUAL 区间分布，缺失值独立统计"
                    :data="stats.quality"
                    note="半开区间 [下界, 上界)，Missing 表示未提供"
                  /><template v-if="view === 'analysis'"
                    ><Chart
                      title="FILTER 状态"
                      description="按原始过滤标签分别统计"
                      :data="stats.filters"
                      note="“.” 表示未提供，不等同于 PASS" /><Chart
                      title="基因组位置"
                      description="按染色体与 1 Mb 非空位置箱汇总"
                      :data="positions"
                      note="最多 10,000 个非空箱 · 不代表覆盖深度"
                  /></template>
                </div>
                <p class="analysis-footnote">
                  <UiIcon name="info" />范围与已应用的筛选一致。Ti/Tv
                  仅计标准碱基双等位 SNV，无法计算时显示“—”。
                </p>
                <section v-if="view === 'overview'" class="recent-panel">
                  <header>
                    <h2>最近导入</h2>
                    <button class="text-button" @click="navigate('datasets')">
                      管理数据集
                    </button>
                  </header>
                  <button
                    v-for="d in datasets.slice(0, 4)"
                    :key="d.id"
                    class="recent-row"
                    :disabled="d.status !== 'READY'"
                    @click="openDataset(d)"
                  >
                    <UiIcon name="file" /><span class="recent-name"
                      >{{ d.name
                      }}<small>{{
                        d.reference_name || "参考版本未提供"
                      }}</small></span
                    ><span class="tabular"
                      >{{ number(d.record_count) }}<small>条记录</small></span
                    ><StatusBadge :status="d.status" /><time>{{
                      dateTime(d.created)
                    }}</time
                    ><UiIcon name="chevron" />
                  </button></section
              ></template></div></template
        ></template>
        <footer class="page-footer">
          <span>VariantScope · 保留来源，理解变异</span
          ><span>仅用于教学与科研探索，不用于临床诊断</span>
        </footer>
      </div>
    </main>
    <VariantDetail
      v-if="detail"
      :variant="detail"
      @close="detail = undefined"
    />
    <UiDialog
      v-if="pendingDelete"
      title="删除数据集"
      @close="
        () => {
          if (!busy) pendingDelete = undefined;
        }
      "
      ><div class="confirm-body">
        <p>
          确认删除 <strong>{{ pendingDelete.name }}</strong>？
        </p>
        <p class="muted">
          这将同时删除
          {{ number(pendingDelete.record_count) }} 条变异记录，操作无法撤销。
        </p>
      </div>
      <footer class="dialog-actions">
        <button
          class="button secondary"
          :disabled="busy"
          @click="pendingDelete = undefined"
        >
          取消</button
        ><button class="button danger" :disabled="busy" @click="remove">
          {{ operation ? "正在删除…" : "删除数据集" }}
        </button>
      </footer></UiDialog
    >
  </div>
</template>
