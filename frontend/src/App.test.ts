import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import App from "./App.vue";
// Explicit synthetic fixture, used only in regression tests. Production always fetches the backend.
const dataset = (id: number) => ({
  id,
  name: `Synthetic ${id}`,
  record_count: 2,
  status: "READY",
  reference_name: null,
  samples: "",
  created: "2026-11-24T12:00:00Z",
  error: null,
});
const stats = {
  total: 2,
  chromosomes: [{ label: "1", value: 2 }],
  types: [{ label: "SNV", value: 2 }],
  filters: [],
  quality: [],
  substitutions: [],
  positions: [],
  transitions: 0,
  transversions: 2,
  titv: 0,
};
const variant = {
  id: 1,
  chrom: "1",
  pos: 100,
  variant_id: ".",
  ref: "A",
  alt: "T",
  qual: null,
  filter_value: ".",
  info: ".",
  format_value: "",
  sample_value: "",
  type: "SNV",
  warning: "",
  raw_line: "SYNTHETIC",
  line_no: 3,
};
let wrapper: ReturnType<typeof mount>;
const chartStub = {
  props: ["title", "data"],
  template: '<div class="test-chart">{{title}}</div>',
};
beforeEach(() => {
  location.hash = "#variants";
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = String(input);
      const body = url.endsWith("/datasets")
        ? [dataset(1), dataset(2)]
        : url.includes("/stats")
          ? stats
          : { total: 2, items: [variant] };
      return { ok: true, text: async () => JSON.stringify(body) };
    }),
  );
});
afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});
async function start() {
  wrapper = mount(App, { global: { stubs: { Chart: chartStub } } });
  await flushPromises();
  return wrapper;
}
describe("analysis scope regression", () => {
  it("does not change export or displayed scope until draft filters are applied", async () => {
    await start();
    const link = () => wrapper.find('a[href*="/export"]').attributes("href");
    expect(link()).toBe("/api/datasets/1/export?");
    await wrapper.get('input[aria-label="染色体"]').setValue("2");
    expect(link()).toBe("/api/datasets/1/export?");
    expect(wrapper.text()).toContain("有未应用的修改");
    await wrapper.get(".filter-grid").trigger("submit");
    await flushPromises();
    expect(link()).toBe("/api/datasets/1/export?chrom=2");
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => String(url).includes("/stats?chrom=2")),
    ).toBe(true);
  });
  it("resets dataset-dependent filters and pagination on dataset switch", async () => {
    await start();
    await wrapper.get('input[aria-label="染色体"]').setValue("X");
    await wrapper.get(".filter-grid").trigger("submit");
    await flushPromises();
    await wrapper.get("#active-dataset").setValue("2");
    await flushPromises();
    expect(
      (wrapper.get('input[aria-label="染色体"]').element as HTMLInputElement)
        .value,
    ).toBe("");
    expect(wrapper.get('a[href*="/export"]').attributes("href")).toBe(
      "/api/datasets/2/export?",
    );
  });
  it("retains zero Ti/Tv, and does not recompute statistics on sort", async () => {
    await start();
    expect(wrapper.find(".browser-scope").text()).toContain("0.000");
    const before = vi
      .mocked(fetch)
      .mock.calls.filter(([u]) => String(u).includes("/stats")).length;
    await wrapper.get('select[aria-label="排序方向"]').setValue("desc");
    await flushPromises();
    expect(
      vi.mocked(fetch).mock.calls.filter(([u]) => String(u).includes("/stats"))
        .length,
    ).toBe(before);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([u]) => String(u).includes("direction=desc")),
    ).toBe(true);
  });
  it("does not keep stale results when query fails", async () => {
    await start();
    vi.mocked(fetch).mockRejectedValue(
      new Error("Test connection unavailable"),
    );
    await wrapper.get(".filter-grid").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain(
      "Test connection unavailable",
    );
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    expect(wrapper.find(".browser-scope").exists()).toBe(false);
  });
});

describe("request lifetime and recovery", () => {
  it("ignores an in-flight response after the dataset is deselected", async () => {
    await start();
    let resolveStats!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes("/stats")) {
        return (await new Promise((resolve) => {
          resolveStats = resolve;
        })) as Response;
      }
      return {
        ok: true,
        text: async () => JSON.stringify({ total: 2, items: [variant] }),
      } as Response;
    });
    await wrapper.get(".filter-grid").trigger("submit");
    await wrapper.get("#active-dataset").setValue("");
    resolveStats({
      ok: true,
      text: async () => JSON.stringify(stats),
    } as Response);
    await flushPromises();
    expect(wrapper.find(".browser-scope").exists()).toBe(false);
    expect(wrapper.find(".activity").exists()).toBe(false);
    expect(wrapper.text()).toContain("从一份 VCF 开始探索");
  });
  it("offers a safe data refresh after a network failure", async () => {
    await start();
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await wrapper.get(".filter-grid").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("无法连接数据服务");
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      return {
        ok: true,
        text: async () =>
          JSON.stringify(
            url.endsWith("/datasets")
              ? [dataset(1), dataset(2)]
              : url.includes("/stats")
                ? stats
                : { total: 2, items: [variant] },
          ),
      } as Response;
    });
    const retry = wrapper
      .findAll("button")
      .find((b) => b.text() === "刷新数据")!;
    await retry.trigger("click");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
  });
});

describe("desktop workspace controls", () => {
  it("collapses navigation without losing the current dataset or query", async () => {
    await start();
    await wrapper.get('input[aria-label="染色体"]').setValue("1");
    await wrapper.get(".filter-grid").trigger("submit");
    await flushPromises();
    await wrapper.get('button[aria-label="切换侧边栏"]').trigger("click");
    expect(wrapper.classes()).toContain("sidebar-collapsed");
    expect(wrapper.get('a[href*="/export"]').attributes("href")).toContain(
      "chrom=1",
    );
    await wrapper.get('button[aria-label="切换侧边栏"]').trigger("click");
    expect(wrapper.classes()).not.toContain("sidebar-collapsed");
  });
  it("retains filter drafts when the inspector is collapsed", async () => {
    await start();
    await wrapper.get('input[aria-label="变异 ID"]').setValue("rs-test");
    const toggle = () =>
      wrapper
        .findAll("button")
        .find((b) => b.text() === "收起条件" || b.text() === "展开条件")!;
    await toggle().trigger("click");
    expect(wrapper.find(".filter-grid").isVisible()).toBe(false);
    await toggle().trigger("click");
    expect(
      (wrapper.get('input[aria-label="变异 ID"]').element as HTMLInputElement)
        .value,
    ).toBe("rs-test");
  });
});

describe("refresh status integrity", () => {
  it("clears previous statistics if the dataset refresh itself fails", async () => {
    await start();
    expect(wrapper.find(".browser-scope").exists()).toBe(true);
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await wrapper.get('button[aria-label="刷新数据"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("无法连接数据服务");
    expect(wrapper.find(".browser-scope").exists()).toBe(false);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
  });
});

describe("record inspector and linked exploration", () => {
  it("shows original fields beside the table and closes with Escape", async () => {
    await start();
    await wrapper.get("button.coordinate").trigger("click");
    expect(wrapper.get("aside.variant-inspector").text()).toContain(
      "SYNTHETIC",
    );
    expect(wrapper.get(".browser-workspace").classes()).toContain(
      "has-inspector",
    );
    expect(wrapper.find("dialog").exists()).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(wrapper.find(".variant-inspector").exists()).toBe(false);
  });
  it("keeps the analysis view when chart selection applies backend filters", async () => {
    await start();
    await wrapper.get('a[href="#analysis"]').trigger("click");
    await flushPromises();
    const analysis = wrapper.findComponent({ name: "AnalysisView" });
    analysis.vm.$emit("filter", "type", "SNV");
    await flushPromises();
    expect(location.hash).toBe("#analysis");
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([u]) => String(u).includes("/stats?type=SNV")),
    ).toBe(true);
    await wrapper.get('a[href="#variants"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('a[href*="/export"]').attributes("href")).toContain(
      "type=SNV",
    );
  });
});
