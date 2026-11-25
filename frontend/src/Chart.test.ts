import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
const state = vi.hoisted(() => ({
  setOption: vi.fn(),
  events: {} as Record<string, (e: any) => void>,
}));
vi.mock("echarts/core", () => ({
  use: vi.fn(),
  init: () => ({
    setOption: state.setOption,
    on: (name: string, fn: (e: any) => void) => {
      state.events[name] = fn;
    },
    resize: vi.fn(),
    dispose: vi.fn(),
    getDataURL: () => "",
  }),
}));
import Chart from "./Chart.vue";
beforeEach(() => {
  state.setOption.mockClear();
  state.events = {};
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());
describe("data-adaptive scientific charts", () => {
  it("preserves true proportions and maps stacked-series clicks to original categories", () => {
    const w = mount(Chart, {
      props: {
        title: "变异类型",
        description: "test fixture",
        kind: "types",
        interactive: true,
        data: [
          { label: "SNV", value: 922 },
          { label: "INSERTION", value: 35 },
          { label: "DELETION", value: 37 },
          { label: "COMPLEX", value: 5 },
          { label: "UNSUPPORTED", value: 1 },
        ],
      },
    });
    const option = state.setOption.mock.calls.at(-1)![0];
    expect(option.xAxis.max).toBe(1000);
    expect(option.series.map((s: any) => s.data[0].value)).toEqual([
      922, 35, 37, 5, 1,
    ]);
    expect(w.text()).toContain("92.2%");
    state.events.click({
      componentType: "series",
      seriesIndex: 4,
      dataIndex: 0,
    });
    expect(w.emitted("select")).toEqual([["UNSUPPORTED"]]);
    w.unmount();
  });
  it("uses a compact single-group view without inventing other contigs or a quality value", () => {
    const w = mount(Chart, {
      props: {
        title: "质量分数",
        description: "test",
        data: [{ label: "Missing", value: 1000 }],
      },
    });
    const option = state.setOption.mock.calls.at(-1)![0];
    expect(option.yAxis.show).toBe(false);
    expect(option.series[0].data).toEqual([{ name: "Missing", value: 1000 }]);
    expect(w.find(".plot").attributes("style")).toContain("112px");
    expect(
      option.graphic.some((g: any) => g.style.text === "未提供 QUAL"),
    ).toBe(true);
    w.unmount();
  });
  it("disables export and identifies an empty query without showing synthetic bars", () => {
    const w = mount(Chart, {
      props: { title: "染色体分布", description: "test", data: [] },
    });
    expect(w.find(".chart-empty").text()).toContain("无可用数据");
    expect(w.find("button").attributes("disabled")).toBeDefined();
    expect(state.setOption.mock.calls.at(-1)![0].series[0].data).toEqual([]);
    w.unmount();
  });
});

describe("comparable count and share charts", () => {
  it("normalizes only chart values while tooltip retains true counts and selection keeps category", async () => {
    const w = mount(Chart, {
      props: {
        title: "FILTER 状态",
        description: "Synthetic fixture",
        interactive: true,
        data: [
          { label: "PASS", value: 3 },
          { label: "q10", value: 1 },
        ],
      },
    });
    expect(
      state.setOption.mock.calls
        .at(-1)![0]
        .series[0].data.map((d: any) => d.value),
    ).toEqual([3, 1]);
    await w.setProps({ measure: "share" });
    const o = state.setOption.mock.calls.at(-1)![0];
    expect(o.series[0].data.map((d: any) => d.value)).toEqual([75, 25]);
    expect(o.yAxis.max).toBe(100);
    expect(
      o.tooltip.formatter({ name: "PASS", value: 75, dataIndex: 0 }),
    ).toContain("3 条 · 75.0%");
    state.events.click({ componentType: "series", dataIndex: 1 });
    expect(w.emitted("select")).toEqual([["q10"]]);
    w.unmount();
  });
  it("does not describe missing FILTER as missing quality", () => {
    const w = mount(Chart, {
      props: {
        title: "FILTER 状态",
        description: "Synthetic fixture",
        data: [{ label: ".", value: 1 }],
      },
    });
    const o = state.setOption.mock.calls.at(-1)![0];
    expect(
      o.graphic.some(
        (g: any) => g.style.text === "未提供过滤标签，不等同于 PASS",
      ),
    ).toBe(true);
    w.unmount();
  });
});
