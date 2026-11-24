export interface Dataset {
  id: number;
  name: string;
  status: string;
  record_count: number;
  reference_name: string | null;
  samples: string;
  created: string;
  error: string | null;
  metadata?: string;
}
export interface Distribution {
  label: string;
  value: number;
}
export interface Statistics {
  total: number;
  chromosomes: Distribution[];
  types: Distribution[];
  filters: Distribution[];
  quality: Distribution[];
  substitutions: Distribution[];
  positions: { chromosome: string; bin: number; value: number }[];
  transitions: number;
  transversions: number;
  titv: number | null;
}
export interface Variant {
  id: number;
  chrom: string;
  pos: number;
  variant_id: string;
  ref: string;
  alt: string;
  qual: number | null;
  filter_value: string;
  info: string;
  format_value: string;
  sample_value: string;
  type: string;
  warning: string;
  raw_line: string;
  line_no: number;
}
export interface Filters {
  chrom: string;
  start: string;
  end: string;
  type: string;
  minQual: string;
  filter: string;
  variantId: string;
}
export const emptyFilters = (): Filters => ({
  chrom: "",
  start: "",
  end: "",
  type: "",
  minQual: "",
  filter: "",
  variantId: "",
});
export const typeNames: Record<string, string> = {
  SNV: "SNV",
  INSERTION: "插入",
  DELETION: "缺失",
  COMPLEX: "复杂替换",
  UNSUPPORTED: "未分类",
};
export const typeColors: Record<string, string> = {
  SNV: "#318779",
  INSERTION: "#6789b9",
  DELETION: "#b28b57",
  COMPLEX: "#9280ae",
  UNSUPPORTED: "#92999f",
};
export const filterNames: Record<keyof Filters, string> = {
  chrom: "染色体",
  start: "起点",
  end: "终点",
  type: "类型",
  minQual: "最低 QUAL",
  filter: "FILTER",
  variantId: "变异 ID",
};
export function filterQuery(f: Filters) {
  return new URLSearchParams(
    Object.entries(f)
      .filter(([, v]) => v !== "" && v != null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}
export function number(n: number | null | undefined) {
  return n == null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(n);
}
export function percentage(n: number, total: number) {
  return total > 0 ? ((n / total) * 100).toFixed(1) + "%" : "—";
}
export function dateTime(s: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(s));
}
export function genotype(v: Variant) {
  const i = v.format_value.split(":").indexOf("GT");
  return i < 0 ? "未提供" : v.sample_value.split(":")[i] || ".";
}
export function infoEntries(info: string) {
  return info === "." || !info
    ? []
    : info.split(";").map((p) => {
        const i = p.indexOf("=");
        return {
          key: i < 0 ? p : p.slice(0, i),
          value: i < 0 ? "Flag" : p.slice(i + 1),
        };
      });
}
export function groupCount(stats: Statistics, type: string) {
  return stats.types.find((x) => x.label === type)?.value || 0;
}
