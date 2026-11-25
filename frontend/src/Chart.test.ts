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
