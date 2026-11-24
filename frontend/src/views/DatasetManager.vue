<script setup lang="ts">
import { ref } from "vue";
import type { Dataset } from "../lib/domain";
import { number, dateTime } from "../lib/domain";
import UiIcon from "../components/UiIcon.vue";
import StatusBadge from "../components/StatusBadge.vue";
const props = defineProps<{
  datasets: Dataset[];
  busy: boolean;
  progress: string;
}>();
const emit = defineEmits<{
  upload: [{ file: File; name: string; reference: string }];
  example: [];
  open: [Dataset];
  reanalyze: [Dataset];
  remove: [Dataset];
}>();
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
  <div class="import-layout">
    <section class="import-panel">
      <header class="section-heading">
        <div>
          <h2>导入 VCF 数据</h2>
          <p>保留原始字段，流式解析并写入结构化记录。</p>
        </div>
        <span class="subtle-label">VCF 4.x</span>
      </header>
      <form @submit.prevent="submit">
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
    <aside class="example-panel">
      <span class="source-tag">公开示例数据</span>
      <h2>从一份真实 VCF 开始</h2>
      <p>NCBI ClinVar · GRCh38</p>
      <dl>
        <div>
          <dt>规模</dt>
          <dd>1,000 条公开记录</dd>
        </div>
        <div>
          <dt>样本</dt>
          <dd>无个人样本列</dd>
        </div>
        <div>
          <dt>范围</dt>
          <dd>原始文件前 1,000 条</dd>
        </div>
      </dl>
      <button
        class="button secondary"
        :disabled="busy"
        @click="emit('example')"
      >
        <UiIcon name="datasets" />导入 ClinVar 示例
      </button>
      <p class="example-note">
        局部截取，不能代表全基因组分布。数据源及使用政策见项目说明。
      </p>
    </aside>
  </div>
  <section class="data-panel dataset-list">
    <header class="table-heading">
      <div>
        <h2>
          数据集<span class="count-label">{{ datasets.length }}</span>
        </h2>
        <p>导入状态、解析记录与数据来源</p>
      </div>
      <span class="subtle-label">最近 200 个</span>
    </header>
    <div class="table-scroll">
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
          <tr v-for="d in datasets" :key="d.id">
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
    <div v-if="!datasets.length" class="empty-state">
      <UiIcon name="datasets" />
      <h3>还没有数据集</h3>
      <p>上传自己的 VCF，或使用右侧公开示例开始分析。</p>
    </div>
  </section>
</template>
