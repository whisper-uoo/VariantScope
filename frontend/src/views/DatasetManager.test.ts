import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DatasetManager from "./DatasetManager.vue";
describe("upload interaction boundaries", () => {
  it("requires a valid VCF and clears a previous selection on invalid replacement", async () => {
    const w = mount(DatasetManager, {
      attachTo: document.body,
      props: { datasets: [], busy: false, progress: "" },
    });
    const input = w.get("input[type=file]");
    const file = new File(["##fileformat=VCFv4.2"], "synthetic.vcf");
    Object.defineProperty(input.element, "files", {
      value: [file],
      configurable: true,
    });
    await input.trigger("change");
    expect(w.text()).toContain("synthetic.vcf");
    expect(w.get("form button.primary").attributes("disabled")).toBeUndefined();
    Object.defineProperty(input.element, "files", {
      value: [new File(["bad"], "bad.exe")],
      configurable: true,
    });
    await input.trigger("change");
    expect(w.get("[role=alert]").text()).toContain(".vcf");
    expect(w.get("form button.primary").attributes("disabled")).toBeDefined();
    w.unmount();
  });
  it("preserves the selected File and explicit reference in emitted upload payload", async () => {
    const w = mount(DatasetManager, {
      attachTo: document.body,
      props: { datasets: [], busy: false, progress: "" },
    });
    const input = w.get("input[type=file]");
    const file = new File(["SYNTHETIC"], "test.vcf");
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    await w
      .get('input[placeholder="默认使用文件名"]')
      .setValue("Boundary test");
    await w
      .get('input[placeholder="优先读取文件，未知时留空"]')
      .setValue("SYNTHETIC");
    await w.get("form").trigger("submit");
    expect(w.emitted("upload")?.[0]).toEqual([
      { file, name: "Boundary test", reference: "SYNTHETIC" },
    ]);
    w.unmount();
  });
});

describe("import progress semantics", () => {
  it("shows transfer percentage separately from indeterminate parsing", async () => {
    const w = mount(DatasetManager, {
      attachTo: document.body,
      props: { datasets: [], busy: true, progress: "正在上传 45%" },
    });
    expect(w.get("progress").attributes("value")).toBe("45");
    await w.setProps({ progress: "上传完成，正在解析与写入…" });
    expect(w.get("progress").attributes("value")).toBeUndefined();
    expect(w.text()).toContain("解析与写入阶段");
    w.unmount();
  });
});

describe("directory first workflow", () => {
  const files = [
    {
      id: 1,
      name: "Alpha.vcf",
      status: "READY",
      record_count: 1,
      reference_name: null,
      samples: "",
      created: "2026-11-24T00:00:00Z",
      error: null,
    },
    {
      id: 2,
      name: "Beta.vcf",
      status: "FAILED",
      record_count: 0,
      reference_name: null,
      samples: "",
      created: "2026-11-25T00:00:00Z",
      error: "Synthetic invalid file",
    },
  ];
  it("combines directory name and status filters without altering file metadata", async () => {
    const w = mount(DatasetManager, {
      attachTo: document.body,
      props: { datasets: files, busy: false, progress: "" },
    });
    expect(w.get(".import-panel").isVisible()).toBe(false);
    await w.get('input[aria-label="搜索数据集"]').setValue("Alpha");
    expect(w.findAll("tbody tr")).toHaveLength(1);
    await w.get('select[aria-label="数据集状态"]').setValue("FAILED");
    expect(w.findAll("tbody tr")).toHaveLength(0);
    expect(w.text()).toContain("没有匹配的文件");
    await w.setProps({ importRequest: 1 });
    expect(w.get(".import-panel").isVisible()).toBe(true);
    w.unmount();
  });
});
