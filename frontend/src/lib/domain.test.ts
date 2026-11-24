import { describe, it, expect } from "vitest";
import {
  emptyFilters,
  filterQuery,
  percentage,
  number,
  genotype,
  infoEntries,
} from "./domain";
import type { Variant } from "./domain";
describe("scientific display semantics", () => {
  it("keeps zero distinct from missing values", () => {
    expect(number(0)).toBe("0");
    expect(number(null)).toBe("—");
    expect(percentage(0, 100)).toBe("0.0%");
    expect(percentage(0, 0)).toBe("—");
  });
  it("escapes exact filter values and omits empty conditions", () => {
    expect(
      filterQuery({ ...emptyFilters(), chrom: "chr1", variantId: "a&b=2" }),
    ).toBe("chrom=chr1&variantId=a%26b%3D2");
    expect(filterQuery(emptyFilters())).toBe("");
  });
  it("preserves INFO flags, missing values and equal signs inside values", () => {
    expect(infoEntries(".")).toEqual([]);
    expect(infoEntries("DB;NOTE=a=b")).toEqual([
      { key: "DB", value: "Flag" },
      { key: "NOTE", value: "a=b" },
    ]);
  });
  it("reads GT using FORMAT order without inventing a sample", () => {
    expect(
      genotype({ format_value: "GT:DP", sample_value: "./.:5" } as Variant),
    ).toBe("./.");
    expect(genotype({ format_value: "DP", sample_value: "5" } as Variant)).toBe(
      "未提供",
    );
  });
});
