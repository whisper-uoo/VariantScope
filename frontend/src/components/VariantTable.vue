<script setup lang="ts">
import type { Variant } from "../lib/domain";
import { number, typeNames } from "../lib/domain";
import UiIcon from "./UiIcon.vue";
defineProps<{
  rows: Variant[];
  total: number;
  page: number;
  busy: boolean;
  sort: string;
  direction: string;
  exportUrl: string;
  activeId?: number;
}>();
const emit = defineEmits<{
  open: [Variant];
  page: [number];
  sort: [string];
  direction: [string];
}>();
</script>
<template>
  <section class="data-panel" :aria-busy="busy">
    <header class="table-heading">
      <div>
        <h2>
          变异记录<span class="count-label">{{ number(total) }}</span>
        </h2>
        <p>点击坐标查看来源字段、INFO 与样本基因型</p>
      </div>
      <a
        :href="exportUrl"
        class="button secondary"
        :class="{ disabled: busy }"
        :aria-disabled="busy"
        @click="
          (e) => {
            if (busy) e.preventDefault();
          }
        "
      >
        <UiIcon name="download" />导出 CSV</a
      >
    </header>
    <div class="table-tools">
      <span class="muted">每页 25 条 · 后端分页</span>
      <div class="sort-controls">
        <label
          >排序<select
            aria-label="排序字段"
            :value="sort"
            @change="emit('sort', ($event.target as HTMLSelectElement).value)"
          >
            <option value="id">导入顺序</option>
            <option value="pos">基因组位置</option>
            <option value="qual">QUAL</option>
            <option value="chrom">染色体</option>
          </select>
        </label>
        <select
          aria-label="排序方向"
          :value="direction"
          @change="
            emit('direction', ($event.target as HTMLSelectElement).value)
          "
        >
          <option value="asc">升序</option>
          <option value="desc">降序</option>
        </select>
      </div>
    </div>
    <div
      class="table-scroll variant-scroll"
      tabindex="0"
      aria-label="可横向滚动的变异表格"
    >
      <table class="variant-table">
        <thead>
          <tr>
            <th>染色体</th>
            <th class="numeric">位置 <span>1-based</span></th>
            <th>变异 ID</th>
            <th>REF</th>
            <th>ALT</th>
            <th>类型</th>
            <th class="numeric">QUAL</th>
            <th>FILTER</th>
            <th>
              <span class="sr-only">详情</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            :class="{ selected: activeId === row.id }"
            @click="emit('open', row)"
          >
            <td class="mono">{{ row.chrom }}</td>
            <td class="numeric">
              <button
                class="coordinate mono"
                @click.stop="emit('open', row)"
                :aria-label="`查看 ${row.chrom}:${row.pos} 变异详情`"
              >
                {{ number(row.pos) }}
              </button>
            </td>
            <td class="mono id-cell" :title="row.variant_id">
              {{ row.variant_id === "." ? "—" : row.variant_id }}
            </td>
            <td class="mono allele" :title="row.ref">{{ row.ref }}</td>
            <td class="mono allele" :title="row.alt">{{ row.alt }}</td>
            <td>
              <span :class="['type-label', row.type.toLowerCase()]">{{
                typeNames[row.type] || row.type
              }}</span>
            </td>
            <td class="numeric mono" :class="{ muted: row.qual == null }">
              {{ number(row.qual) }}
            </td>
            <td>
              <span
                :class="['filter-value', { pass: row.filter_value === 'PASS' }]"
                >{{
                  row.filter_value === "." ? "未提供" : row.filter_value
                }}</span
              >
            </td>
            <td>
              <UiIcon name="chevron" />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length && !busy" class="empty-state small">
        <UiIcon name="search" />
        <h3>没有匹配的变异</h3>
        <p>尝试扩大坐标范围，或重置筛选条件。</p>
      </div>
    </div>
    <footer class="pagination">
      <span
        >{{ total ? number(page * 25 + 1) : 0 }}–{{
          number(Math.min((page + 1) * 25, total))
        }}
        / {{ number(total) }} 条</span
      >
      <div>
        <button
          class="button quiet"
          :disabled="!page || busy"
          @click="emit('page', page - 1)"
        >
          上一页
        </button>
        <span class="page-number"
          >{{ page + 1 }} / {{ Math.max(1, Math.ceil(total / 25)) }}</span
        >
        <button
          class="button quiet"
          :disabled="(page + 1) * 25 >= total || busy"
          @click="emit('page', page + 1)"
        >
          下一页
        </button>
      </div>
    </footer>
  </section>
</template>
