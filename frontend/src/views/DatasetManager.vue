<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Dataset } from "../lib/domain";
import { number, dateTime } from "../lib/domain";
import UiIcon from "../components/UiIcon.vue";
import StatusBadge from "../components/StatusBadge.vue";
const props = defineProps<{
  datasets: Dataset[];
  busy: boolean;
  progress: string;
  importRequest?: number;
}>();
const emit = defineEmits<{
  upload: [{ file: File; name: string; reference: string }];
  example: [];
  open: [Dataset];
  reanalyze: [Dataset];
  remove: [Dataset];
}>();
const networkPercent = computed(() => {
  const m = props.progress.match(/(\d+)%/);
  return m ? Number(m[1]) : null;
});
const importing = ref(!!props.importRequest);
watch(
  () => props.importRequest,
  () => (importing.value = true),
);
const search = ref("");
const status = ref("");
const order = ref("recent");
const visible = computed(() =>
  props.datasets
    .filter(
      (d) =>
        (!status.value || d.status === status.value) &&
        d.name.toLowerCase().includes(search.value.toLowerCase()),
    )
    .slice()
    .sort((a, b) =>
      order.value === "name"
        ? a.name.localeCompare(b.name)
        : Date.parse(b.created) - Date.parse(a.created),
    ),
);
const name = ref("");
const reference = ref("");
const file = ref<File>();
const fileError = ref("");
const drag = ref(false);
const fileInput = ref<HTMLInputElement>();
function pick(f?: File) {
  if (props.busy) return;
  fileError.value = "";
  if (!f) return;
  file.value = undefined;
  if (!f.name.toLowerCase().endsWith(".vcf")) {
    fileError.value = "请选择未压缩的 .vcf 文本文件";
    return;
  }
  if (f.size === 0 || f.size > 100 * 1024 * 1024) {
    fileError.value = "文件不能为空，且不能超过 100 MB";
    return;
  }
  file.value = f;
}
function drop(e: DragEvent) {
  drag.value = false;
  pick(e.dataTransfer?.files[0]);
}
function submit() {
  if (file.value)
    emit("upload", {
      file: file.value,
      name: name.value || file.value.name,
      reference: reference.value,
    });
}
</script>
<template>
  <div class="directory-toolbar">
    <div class="directory-summary">
      <span class="file-token">VCF</span>
      <div>
        <strong>{{ datasets.length }} 个数据集</strong>
        <p>文件、解析状态与样本信息</p>
      </div>
    </div>
    <div class="directory-actions">
      <button
        class="button secondary"
        :disabled="busy"
        @click="emit('example')"
      >
        导入 ClinVar 示例</button
      ><button
        class="button primary"
        :disabled="busy"
        :aria-expanded="importing"
        @click="importing = !importing"
      >
        <UiIcon name="plus" />导入 VCF 文件
      </button>
    </div>
  </div>
  <div class="directory-filters">
    <label class="search-field"
      ><UiIcon name="search" /><input
        v-model="search"
        aria-label="搜索数据集"
        placeholder="搜索文件名称…" /></label
    ><select v-model="status" aria-label="数据集状态">
      <option value="">全部状态</option>
      <option value="READY">可分析</option>
      <option value="FAILED">导入失败</option>
      <option value="IMPORTING">解析中</option></select
    ><select v-model="order" aria-label="数据集排序">
      <option value="recent">最近导入</option>
      <option value="name">名称排序</option></select
    ><span class="muted">最近 200 个文件中筛选</span>
  </div>
  <section v-show="importing || !!progress" class="import-panel">
    <header class="section-heading">
      <div>
        <h2>导入 VCF 数据</h2>
        <p>保留原始字段，流式解析并写入结构化记录。</p>
      </div>
      <button
        type="button"
        class="icon-button"
        aria-label="收起导入面板"
        :disabled="busy"
        @click="importing = false"
      >
        <UiIcon name="close" />
      </button>
    </header>
    <form @submit.prevent="submit">
      <div v-if="progress" class="import-progress" role="status">
        <div>
          <span>{{ progress }}</span
          ><small>{{
            networkPercent == null ? "解析与写入阶段" : "文件传输阶段"
          }}</small>
        </div>
        <progress
          v-if="networkPercent != null"
          :value="networkPercent"
          max="100"
          aria-label="文件上传进度"
        ></progress
        ><progress v-else aria-label="解析与写入进行中"></progress>
        <p>上传进度与解析阶段分别展示；等待服务返回完成结果。</p>
      </div>
      <div
        class="file-drop"
        :class="{ drag, chosen: file }"
        @dragover.prevent="drag = true"
        @dragleave.prevent="drag = false"
        @drop.prevent="drop"
      >
        <UiIcon :name="file ? 'file' : 'upload'" />
        <h3>{{ file ? file.name : "选择或拖入 VCF 文件" }}</h3>
        <p>
          {{
            file
              ? `${(file.size / 1024).toFixed(1)} KB · 已选择`
              : "未压缩 .vcf · 最大 100 MB · 单样本或无样本"
          }}
        </p>
        <button
          class="button secondary"
          type="button"
          :disabled="busy"
          @click="fileInput?.click()"
        >
          {{ file ? "更换文件" : "选择文件" }}
        </button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          :disabled="busy"
          accept=".vcf"
          aria-label="上传 VCF 文件"
          @change="pick(($event.target as HTMLInputElement).files?.[0])"
        />
      </div>
      <p class="error-text" role="alert" v-if="fileError">{{ fileError }}</p>
      <div class="import-fields">
        <label
          >数据集名称<input
            v-model="name"
            maxlength="200"
            placeholder="默认使用文件名"
            :disabled="busy"
          />
        </label>
        <label
          >参考基因组 <span class="optional">可选</span>
          <input
            v-model="reference"
            maxlength="500"
            placeholder="优先读取文件，未知时留空"
            :disabled="busy"
          />
        </label>
      </div>
      <footer class="import-footer">
        <span>文件内容不会被用于临床诊断</span>
        <button class="button primary" :disabled="!file || busy">
          <UiIcon name="plus" />{{
            busy && progress ? "正在导入…" : "上传并分析"
          }}
        </button>
      </footer>
    </form>
  </section>
  <section class="data-panel dataset-list">
    <header class="table-heading">
      <div>
        <h2>
          数据集<span class="count-label">{{ datasets.length }}</span>
        </h2>
        <p>导入状态、解析记录与数据来源</p>
      </div>
      <span class="subtle-label"
        >{{ visible.length }} / {{ datasets.length }} 个文件</span
      >
    </header>
    <p class="scroll-hint">左右滑动查看统计与管理操作</p>
    <div class="table-scroll" tabindex="0" aria-label="可横向滚动的数据集表格">
      <table>
        <thead>
          <tr>
            <th>名称 / 导入时间</th>
            <th>参考版本 / 样本</th>
            <th class="numeric">变异记录</th>
            <th>状态</th>
            <th class="align-end">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in visible" :key="d.id">
            <td class="dataset-name-cell">
              <div class="file-name">
                <UiIcon name="file" />
                <button class="dataset-link" @click="emit('open', d)">
                  {{ d.name }}
                </button>
              </div>
              <small class="tabular">{{ dateTime(d.created) }}</small>
              <p v-if="d.error" class="row-error">{{ d.error }}</p>
            </td>
            <td>
              {{ d.reference_name || "未提供"
              }}<small>{{ d.samples || "无样本列" }}</small>
            </td>
            <td class="numeric mono">{{ number(d.record_count) }}</td>
            <td>
              <StatusBadge :status="d.status" />
            </td>
            <td class="actions">
              <button
                class="text-button"
                :disabled="busy || d.status !== 'READY'"
                @click="emit('open', d)"
              >
                浏览
              </button>
              <button
                class="icon-button"
                :disabled="busy || d.status !== 'READY'"
                :aria-label="`重新分析 ${d.name}`"
                title="重新分析"
                @click="emit('reanalyze', d)"
              >
                <UiIcon name="refresh" />
              </button>
              <button
                class="icon-button danger-quiet"
                :disabled="busy || d.status === 'IMPORTING'"
                :aria-label="`删除 ${d.name}`"
                title="删除数据集"
                @click="emit('remove', d)"
              >
                <UiIcon name="trash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!visible.length" class="empty-state">
      <UiIcon name="datasets" />
      <h3>{{ datasets.length ? "没有匹配的文件" : "还没有数据集" }}</h3>
      <p>调整搜索条件，或通过上方入口导入 VCF。</p>
    </div>
  </section>
  <div class="source-strip">
    <UiIcon name="info" />
    <p>
      公开示例：NCBI ClinVar · GRCh38 · 原文件前 1,000
      条记录，无个人样本列。局部截取不能代表全基因组分布。
    </p>
  </div>
</template>
