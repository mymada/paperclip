import { describe, expect, it } from "vitest";
import { normalizeIdList } from "./agent-order";

describe("agent-order ID normalizer", () => {
  it("returns an empty array for non-array inputs", () => {
    expect(normalizeIdList(null)).toEqual([]);
    expect(normalizeIdList(undefined)).toEqual([]);
    expect(normalizeIdList("not-an-array")).toEqual([]);
    expect(normalizeIdList(123)).toEqual([]);
    expect(normalizeIdList({ a: 1 })).toEqual([]);
  });

  it("filters out non-string items", () => {
    expect(normalizeIdList([1, 2, 3])).toEqual([]);
    expect(normalizeIdList([null, undefined, true, {}])).toEqual([]);
    expect(normalizeIdList(["a", 1, "b", null, "c"])).toEqual(["a", "b", "c"]);
  });

  it("filters out empty strings", () => {
    expect(normalizeIdList(["", " ", "  "])).toEqual([" ", "  "]);
    expect(normalizeIdList(["a", "", "b"])).toEqual(["a", "b"]);
  });

  it("preserves valid non-empty strings", () => {
    const ids = ["agent-1", "agent-2", "agent-3"];
    expect(normalizeIdList(ids)).toEqual(ids);
  });

  it("handles a complex mixed array", () => {
    const input = ["id-1", "", 123, "id-2", null, { id: "id-3" }, "id-4"];
    expect(normalizeIdList(input)).toEqual(["id-1", "id-2", "id-4"]);
  });
});
