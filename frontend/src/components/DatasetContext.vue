<script setup lang="ts">
import type { Dataset } from "../lib/domain";
import { dateTime } from "../lib/domain";
import StatusBadge from "./StatusBadge.vue";
import UiIcon from "./UiIcon.vue";
defineProps<{ datasets: Dataset[]; current?: Dataset; selected?: number }>();
const emit = defineEmits<{ select: [number | undefined] }>();
</script>
<template>
  <section class="dataset-context" aria-label="当前数据集">
    <div class="context-main">
      <span class="context-icon">
        <UiIcon name="datasets" />
      </span>
      <div class="context-select">
        <label for="active-dataset">分析中的文件</label>
        <select
          id="active-dataset"
          :title="current?.name"
          :value="selected ?? ''"
          @change="
            emit(
              'select',
              ($event.target as HTMLSelectElement).value
                ? Number(($event.target as HTMLSelectElement).value)
                : undefined,
            )
          "
        >
          <option value="">选择数据集</option>
          <option v-for="d in datasets" :key="d.id" :value="d.id">
            {{ d.name }}
          </option>
        </select>
      </div>
      <StatusBadge v-if="current" :status="current.status" />
    </div>
    <dl class="context-meta">
      <div>
        <dt>参考基因组</dt>
        <dd>{{ current?.reference_name || "未提供" }}</dd>
      </div>
      <div>
        <dt>样本</dt>
        <dd>{{ current?.samples || "无样本列" }}</dd>
      </div>
      <div v-if="current">
        <dt>导入时间</dt>
        <dd class="tabular">{{ dateTime(current.created) }}</dd>
      </div>
    </dl>
  </section>
</template>
