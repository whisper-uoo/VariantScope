<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Chart from "./Chart.vue";
type Dataset = {
  id: number;
  name: string;
  status: string;
  record_count: number;
  reference_name: string | null;
  samples: string;
  created: string;
  error: string | null;
  metadata: string;
};
const nav = ["概览工作台", "数据集管理", "变异浏览", "统计分析", "项目说明"];
const view = ref("概览工作台");
const datasets = ref<Dataset[]>([]);
const selected = ref<number>();
const current = computed(() =>
  datasets.value.find((x) => x.id === selected.value),
);
const stats = ref<any>();
const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(0);
const detail = ref<any>();
const error = ref("");
const busy = ref(false);
const progress = ref("");
const name = ref("");
const reference = ref("");
const file = ref<File>();
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
async function api(url: string, options?: RequestInit) {
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
  } catch (e: any) {
    error.value = e.message;
  } finally {
    if (gen === generation) busy.value = false;
  }
}
async function choose() {
  page.value = 0;
  await load();
}
async function upload(chosen?: File) {
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
    const result: any = await new Promise((resolve, reject) => {
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
  } catch (e: any) {
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
  } catch (e: any) {
    error.value = e.message;
  }
}
async function remove(ds: Dataset) {
  if (!confirm(`删除“${ds.name}”及其全部变异记录？`)) return;
  try {
    await api(`/datasets/${ds.id}`, { method: "DELETE" });
    await list();
  } catch (e: any) {
    error.value = e.message;
  }
}
async function reanalyze(ds: Dataset) {
  try {
    await api(`/datasets/${ds.id}/reanalyze`, { method: "POST" });
    selected.value = ds.id;
    await load();
    view.value = "统计分析";
  } catch (e: any) {
    error.value = e.message;
  }
}
function chartFilter(key: "chrom" | "type", v: string) {
  filters.value[key] = v;
  page.value = 0;
  view.value = "变异浏览";
  load();
}
const positions = computed(
  () =>
    stats.value?.positions.map((x: any) => ({
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
</script>
<template>
  <div class="shell">
    <aside>
      <a class="brand" href="#" @click.prevent="view = nav[0]"
        ><span class="mark">V</span
        ><span>VariantScope<small>GENOMIC EXPLORER</small></span></a
      >
      <div class="workspace">ANALYSIS WORKSPACE</div>
      <nav>
        <button
          v-for="(n, i) in nav"
          :class="{ active: view === n }"
          @click="view = n"
        >
          <span>{{ ["◫", "▤", "≡", "◷", "ⓘ"][i] }}</span
          >{{ n }}
        </button>
      </nav>
      <div class="aside-foot">
        <span class="tag">V1.0 · OPEN SOURCE</span>
        <p>从原始变异到可解释的数据</p>
        <small>教学与科研探索 · 非临床用途</small>
      </div>
    </aside>
    <main>
      <header class="topbar">
        <span
          >工作空间 <b>/ {{ view }}</b></span
        ><span class="muted">VCF 4.x · Java 17 · MySQL</span>
      </header>
      <div class="content">
        <div class="pagehead">
          <div>
            <p class="eyebrow">GENOMIC VARIANT ANALYSIS</p>
            <h1>{{ view }}</h1>
            <p class="muted">
              {{
                view === "概览工作台"
                  ? "探索变异数据，理解每一份分析结果。"
                  : "基于实际导入记录的筛选、统计与可视化"
              }}
            </p>
          </div>
          <button class="primary" @click="view = '数据集管理'">
            ＋ 导入 VCF 数据
          </button>
        </div>
        <div v-if="error" class="alert" role="alert">
          {{ error }}<button class="text" @click="error = ''">关闭</button>
        </div>
        <div v-if="busy" class="loading" role="status">
          {{ progress || "正在查询与计算…" }}
        </div>
        <template v-if="view === '项目说明'"
          ><section class="panel prose">
            <h2>真实数据，可复现分析</h2>
            <p>
              VariantScope 使用流式解析与 MySQL
              结构化存储，为课程中的基因变异数据探索提供完整工作流。所有图表与当前数据集及筛选条件一致。
            </p>
            <h3>统计口径</h3>
            <p>
              每行 VCF 记录计为一条变异。SNV
              为单碱基替换；仅对锚定的简单插入、缺失分类为 InDel。Ti/Tv 仅使用
              A/C/G/T 的双等位 SNV；颠换数为零时显示“—”。缺失 QUAL
              独立统计，不参与最低质量筛选。FILTER 的
              PASS、未检测“.”及其他标签分别统计。
            </p>
            <h3>边界与来源</h3>
            <p>
              支持无样本或单样本、未压缩 VCF 4.x，最大 100 MB / 100
              万行。多等位、符号 ALT、结构变异保留但标记为不支持分类。除 GT 外的
              FORMAT 仅展示原文。位置图按 1 Mb 分箱，最多返回 10,000
              个非空箱，不表示覆盖深度。参考基因组仅来自文件或用户指定。
            </p>
            <p>
              示例为 NCBI ClinVar GRCh38 公开 VCF 的前 1000
              条记录，属于非代表性的小范围截取，无个人样本。ClinVar 原始注释只以
              INFO 展示，系统不推断致病性，也不提供医学诊断。
            </p>
          </section></template
        >
        <template v-else-if="view === '数据集管理'"
          ><section class="panel upload">
            <div>
              <span class="tag">IMPORT DATASET</span>
              <h2>导入基因变异数据</h2>
              <p class="muted">标准 .vcf 文本 · 单样本或无样本 · 上限 100 MB</p>
              <button @click="example" :disabled="busy">
                导入 ClinVar 公开示例
              </button>
            </div>
            <form @submit.prevent="upload()">
              <label
                >数据集名称<input
                  v-model="name"
                  maxlength="200"
                  placeholder="默认使用文件名" /></label
              ><label
                >参考基因组（可选）<input
                  v-model="reference"
                  maxlength="500"
                  placeholder="优先读取文件，未知时留空" /></label
              ><label
                >VCF 文件<input
                  type="file"
                  accept=".vcf"
                  required
                  @change="
                    file = ($event.target as HTMLInputElement).files?.[0]
                  " /></label
              ><button class="primary" :disabled="busy">上传并分析</button>
            </form>
          </section>
          <section class="panel">
            <h2>
              数据集目录 <small>{{ datasets.length }} 个</small>
            </h2>
            <div class="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>数据集</th>
                    <th>参考版本 / 样本</th>
                    <th>记录数</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in datasets">
                    <td>
                      <b>{{ d.name }}</b
                      ><small>{{ new Date(d.created).toLocaleString() }}</small
                      ><small class="error">{{ d.error }}</small>
                    </td>
                    <td>
                      {{ d.reference_name || "未提供"
                      }}<small>{{ d.samples || "无样本列" }}</small>
                    </td>
                    <td>{{ d.record_count.toLocaleString() }}</td>
                    <td>
                      <span class="badge" :class="d.status">{{
                        d.status
                      }}</span>
                    </td>
                    <td class="actions">
                      <button
                        @click="
                          selected = d.id;
                          choose();
                          view = '变异浏览';
                        "
                      >
                        查看</button
                      ><button
                        :disabled="d.status !== 'READY'"
                        @click="reanalyze(d)"
                      >
                        重新分析</button
                      ><button @click="remove(d)">删除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="!datasets.length" class="empty">
              尚无数据集。上传 VCF 或导入公开示例开始。
            </p>
          </section></template
        >
        <template v-else
          ><div class="datasetbar">
            <div>
              <label>当前数据集</label
              ><select v-model="selected" @change="choose">
                <option :value="undefined">选择数据集</option>
                <option v-for="d in datasets" :value="d.id">
                  {{ d.name }} · {{ d.status }}
                </option>
              </select>
            </div>
            <span class="muted"
              >参考版本：{{ current?.reference_name || "未提供" }}<br />样本：{{
                current?.samples || "无样本列"
              }}</span
            ><span class="tag">{{ current?.status || "NO DATA" }}</span>
          </div>
          <div v-if="!selected" class="panel empty">
            <h2>让第一份数据开始说话</h2>
            <p>导入标准 VCF，浏览变异并生成真实统计。</p>
            <button class="primary" @click="view = '数据集管理'">
              导入数据
            </button>
          </div>
          <template v-else
            ><section class="filters panel" v-if="view !== '概览工作台'">
              <header>
                <h3>组合筛选</h3>
                <button
                  class="text"
                  @click="
                    filters = {
                      chrom: '',
                      start: '',
                      end: '',
                      type: '',
                      minQual: '',
                      filter: '',
                      variantId: '',
                      sort: 'id',
                      direction: 'asc',
                    };
                    page = 0;
                    load();
                  "
                >
                  清空条件
                </button>
              </header>
              <form
                @submit.prevent="
                  page = 0;
                  load();
                "
              >
                <label
                  >染色体<input
                    v-model="filters.chrom"
                    placeholder="如 1 / chr1" /></label
                ><label
                  >起始位置<input
                    v-model="filters.start"
                    type="number"
                    min="1" /></label
                ><label
                  >终止位置<input
                    v-model="filters.end"
                    type="number"
                    min="1" /></label
                ><label
                  >变异类型<select v-model="filters.type">
                    <option value="">全部类型</option>
                    <option
                      v-for="t in [
                        'SNV',
                        'INSERTION',
                        'DELETION',
                        'COMPLEX',
                        'UNSUPPORTED',
                      ]"
                    >
                      {{ t }}
                    </option>
                  </select></label
                ><label
                  >最低 QUAL<input
                    v-model="filters.minQual"
                    type="number"
                    min="0"
                    step="any" /></label
                ><label
                  >FILTER<input
                    v-model="filters.filter"
                    placeholder="PASS / . / q10" /></label
                ><label
                  >变异 ID<input
                    v-model="filters.variantId"
                    placeholder="精确匹配" /></label
                ><button class="primary" :disabled="busy">应用筛选</button>
              </form>
            </section>
            <div class="metrics" v-if="stats">
              <div>
                <span>当前范围变异记录</span
                ><strong>{{ stats.total.toLocaleString() }}</strong
                ><small>来自后端实时聚合</small>
              </div>
              <div>
                <span>染色体 / Contig</span
                ><strong>{{ stats.chromosomes.length }}</strong
                ><small>当前筛选中的非空序列</small>
              </div>
              <div>
                <span>转换 / 颠换 Ti/Tv</span
                ><strong>{{ stats.titv?.toFixed(3) || "—" }}</strong
                ><small
                  >{{ stats.transitions }} Ti /
                  {{ stats.transversions }} Tv</small
                >
              </div>
              <div>
                <span>SNV / 简单 InDel</span
                ><strong
                  >{{
                    stats.types.find((x: any) => x.label === "SNV")?.value || 0
                  }}
                  <em
                    >/
                    {{
                      stats.types
                        .filter((x: any) =>
                          ["INSERTION", "DELETION"].includes(x.label),
                        )
                        .reduce((a: number, x: any) => a + x.value, 0)
                    }}</em
                  ></strong
                ><small>不含多等位和复杂替换</small>
              </div>
            </div>
            <template v-if="view === '变异浏览'"
              ><section class="panel">
                <header>
                  <div>
                    <h2>
                      变异记录 <small>{{ total.toLocaleString() }} 条</small>
                    </h2>
                    <p class="muted">点击记录查看原始字段与样本基因型</p>
                  </div>
                  <a
                    class="button"
                    :href="`/api/datasets/${selected}/export?${query()}`"
                    >导出筛选 CSV</a
                  >
                </header>
                <div class="sort">
                  <label
                    >排序<select v-model="filters.sort" @change="load">
                      <option value="id">导入顺序</option>
                      <option value="pos">位置</option>
                      <option value="qual">QUAL</option>
                      <option value="chrom">染色体</option>
                    </select></label
                  ><select v-model="filters.direction" @change="load">
                    <option value="asc">升序</option>
                    <option value="desc">降序</option>
                  </select>
                </div>
                <div class="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>染色体</th>
                        <th>位置</th>
                        <th>ID</th>
                        <th>REF / ALT</th>
                        <th>类型</th>
                        <th>QUAL</th>
                        <th>FILTER</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="row in rows"
                        tabindex="0"
                        @click="detail = row"
                        @keydown.enter="detail = row"
                      >
                        <td>
                          <span class="chrom">{{ row.chrom }}</span>
                        </td>
                        <td class="mono">{{ row.pos.toLocaleString() }}</td>
                        <td>{{ row.variant_id }}</td>
                        <td class="mono">{{ row.ref }} / {{ row.alt }}</td>
                        <td>
                          <span class="badge">{{ row.type }}</span>
                        </td>
                        <td>{{ row.qual ?? "—" }}</td>
                        <td>{{ row.filter_value }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-if="!rows.length" class="empty">
                  没有符合当前条件的变异。
                </p>
                <footer class="pagination">
                  <span>第 {{ page + 1 }} 页 · 每页 25 条</span
                  ><button
                    :disabled="!page || busy"
                    @click="
                      page--;
                      load();
                    "
                  >
                    上一页</button
                  ><button
                    :disabled="(page + 1) * 25 >= total || busy"
                    @click="
                      page++;
                      load();
                    "
                  >
                    下一页
                  </button>
                </footer>
              </section></template
            >
            <template v-else-if="stats"
              ><div class="charts">
                <Chart
                  title="染色体变异分布"
                  :data="stats.chromosomes"
                  @select="chartFilter('chrom', $event)"
                /><Chart
                  title="变异类型构成"
                  kind="pie"
                  :data="stats.types"
                  @select="chartFilter('type', $event)"
                /><Chart
                  title="碱基替换分布"
                  :data="stats.substitutions"
                /><Chart
                  title="QUAL 质量分数分布"
                  :data="stats.quality"
                /><template v-if="view === '统计分析'"
                  ><Chart title="FILTER 状态分布" :data="stats.filters" /><Chart
                    title="基因组位置分布 · 1 Mb 分箱"
                    :data="positions"
                /></template>
              </div>
              <p class="footnote">
                统计范围：当前数据集{{
                  query() ? "及已应用的筛选条件" : ""
                }}。点击染色体或类型图表可筛选记录。Ti/Tv 仅计标准碱基双等位
                SNV。
              </p>
              <section v-if="view === '概览工作台'" class="panel">
                <header>
                  <h2>最近导入</h2>
                  <button @click="view = '数据集管理'">管理全部数据集</button>
                </header>
                <div class="recent" v-for="d in datasets.slice(0, 4)">
                  <b>{{ d.name }}</b
                  ><span>{{ d.record_count.toLocaleString() }} 条记录</span
                  ><span class="badge">{{ d.status }}</span
                  ><span class="muted">{{
                    new Date(d.created).toLocaleString()
                  }}</span>
                </div>
              </section></template
            ></template
          ></template
        >
        <footer class="pagefoot">
          VariantScope · 可复现的基因变异数据探索
          <span>仅用于教学与科研探索，不用于临床诊断</span>
        </footer>
      </div>
    </main>
    <div class="overlay" v-if="detail" @click.self="detail = undefined">
      <section class="drawer">
        <header>
          <div>
            <p class="eyebrow">VARIANT DETAIL</p>
            <h2>{{ detail.chrom }}:{{ detail.pos }}</h2>
          </div>
          <button @click="detail = undefined">关闭</button>
        </header>
        <h3>文件直接提供</h3>
        <dl>
          <template
            v-for="k in [
              'variant_id',
              'ref',
              'alt',
              'qual',
              'filter_value',
              'format_value',
              'sample_value',
            ]"
            ><dt>{{ k }}</dt>
            <dd>{{ detail[k] ?? "缺失" }}</dd></template
          >
          <dt>GT</dt>
          <dd>{{ gt }}</dd>
        </dl>
        <h3>INFO 属性（原始来源）</h3>
        <dl>
          <template v-for="part in detail.info.split(';')"
            ><dt>{{ part.split("=")[0] }}</dt>
            <dd>
              {{
                part.includes("=")
                  ? part.substring(part.indexOf("=") + 1)
                  : "Flag / 缺失"
              }}
            </dd></template
          >
        </dl>
        <h3>系统计算</h3>
        <p>变异类型：{{ detail.type }}</p>
        <p class="alert" v-if="detail.warning">{{ detail.warning }}</p>
        <h3>原始 VCF 行</h3>
        <pre>{{ detail.raw_line }}</pre>
        <p class="muted">不进行致病性判定。INFO 内容来自上传文件。</p>
      </section>
    </div>
  </div>
</template>
