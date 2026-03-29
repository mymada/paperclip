import { describe, expect, it } from "vitest";
import { normalizeIdList } from "./project-order";

describe("normalizeIdList", () => {
  it("returns an empty array for non-array inputs", () => {
    expect(normalizeIdList(null)).toEqual([]);
    expect(normalizeIdList(undefined)).toEqual([]);
    expect(normalizeIdList(123)).toEqual([]);
    expect(normalizeIdList("string")).toEqual([]);
    expect(normalizeIdList({})).toEqual([]);
    expect(normalizeIdList(true)).toEqual([]);
  });

  it("filters out non-string items from an array", () => {
    expect(normalizeIdList([123, "a", null, "b", undefined, {}, []])).toEqual(["a", "b"]);
  });

  it("filters out empty string items from an array", () => {
    expect(normalizeIdList(["a", "", "b", "   ", "c"])).toEqual(["a", "b", "   ", "c"]);
  });

  it("returns the same array if all items are valid non-empty strings", () => {
    expect(normalizeIdList(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("handles empty arrays", () => {
    expect(normalizeIdList([])).toEqual([]);
  });
});
