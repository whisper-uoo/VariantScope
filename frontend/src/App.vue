<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import OverviewView from "./views/OverviewView.vue";
import AnalysisView from "./views/AnalysisView.vue";
import UiIcon from "./components/UiIcon.vue";
import LoadingSkeleton from "./components/LoadingSkeleton.vue";
import DatasetContext from "./components/DatasetContext.vue";
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
const importRequest = ref(0);
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
function documentSection(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
function chartFilter(key: keyof Filters, v: string) {
  draft.value = { ...applied.value, [key]: v };
  applied.value = { ...draft.value };
  page.value = 0;
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
  if (view.value !== "datasets") importRequest.value = 0;
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
          <span>{{ currentPage.label }}</span
          ><small v-if="current && view !== 'datasets' && view !== 'about'">{{
            current.name
          }}</small>
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
          ><button
            class="button secondary"
            :disabled="busy"
            @click="
              navigate('datasets');
              importRequest++;
            "
          >
            <UiIcon name="plus" />导入 VCF
          </button>
        </div>
      </header>
      <div class="page-content">
        <header class="page-heading">
          <div>
            <h1>{{ currentPage.label }}</h1>
            <p>{{ currentPage.description }}</p>
          </div>
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
          :import-request="importRequest"
          @upload="upload"
          @example="example"
          @open="openDataset"
          @reanalyze="reanalyze"
          @remove="pendingDelete = $event"
        />
        <template v-else-if="view === 'about'">
          <div class="docs-layout">
            <aside class="docs-index">
              <span>本页内容</span
              ><a href="#methods" @click.prevent="documentSection('methods')"
                >指标与计算</a
              ><a href="#source" @click.prevent="documentSection('source')"
                >数据来源</a
              ><a href="#limits" @click.prevent="documentSection('limits')"
                >支持边界</a
              >
            </aside>
            <article class="docs-article">
              <p class="doc-lead">
                从 VCF 原始记录到可复现的统计，保留来源，明确每一步计算的边界。
              </p>
              <div class="about-grid">
                <section class="documentation-panel" id="methods">
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
                  <section class="documentation-panel" id="source">
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
                  <section class="documentation-panel" id="limits">
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
              </div>
            </article>
          </div></template
        >
        <template v-else>
          <DatasetContext
            :datasets="datasets"
            :current="current"
            :selected="selected"
            @select="choose"
          />
          <LoadingSkeleton v-if="busy && !stats" />
          <div v-if="!selected && !busy" class="empty-state page-empty">
            <UiIcon name="datasets" />
            <h2>从一份 VCF 开始探索</h2>
            <p>导入真实变异记录，查看分布、质量与逐条详情。</p>
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
          <template v-else-if="selected">
            <FilterBar
              v-if="view !== 'overview'"
              v-model="draft"
              :applied="applied"
              :busy="busy"
              @apply="apply"
              @reset="reset"
            />
            <div
              class="analysis-results"
              :class="{ refreshing: loading }"
              :aria-busy="loading"
            >
              <OverviewView
                v-if="view === 'overview' && stats"
                :stats="stats"
                :datasets="datasets"
                :filtered="!!query"
                @navigate="navigate"
                @open="openDataset"
                @reset="reset"
              />
              <template v-else-if="view === 'variants'">
                <div v-if="stats" class="browser-scope">
                  <span
                    ><strong>{{ number(stats.total) }}</strong> 条匹配记录</span
                  ><span>{{ stats.chromosomes.length }} 个 Contig</span
                  ><span
                    >Ti/Tv
                    {{ stats.titv == null ? "—" : stats.titv.toFixed(3) }}</span
                  ><span class="muted">坐标 1-based · REF / ALT 保留原文</span>
                </div>
                <div
                  class="browser-workspace"
                  :class="{ 'has-inspector': detail }"
                >
                  <VariantTable
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
                  <VariantDetail
                    v-if="detail"
                    :key="detail.id"
                    :variant="detail"
                    inline
                    @close="detail = undefined"
                  />
                </div>
              </template>
              <AnalysisView
                v-else-if="view === 'analysis' && stats"
                :stats="stats"
                @filter="chartFilter"
              />
            </div>
          </template>
        </template>
        <footer class="page-footer">
          <span>VariantScope · 保留来源，理解变异</span
          ><span>仅用于教学与科研探索，不用于临床诊断</span>
        </footer>
      </div>
    </main>
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
          确认删除 <strong>{{ pendingDelete.name }}</strong
          >？
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
