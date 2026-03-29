import { describe, expect, it } from "vitest";
import { normalizeIdList } from "./agent-order";

describe("normalizeIdList", () => {
  it("returns an empty array when given a non-array value", () => {
    expect(normalizeIdList(null)).toEqual([]);
    expect(normalizeIdList(undefined)).toEqual([]);
    expect(normalizeIdList("string")).toEqual([]);
    expect(normalizeIdList(123)).toEqual([]);
    expect(normalizeIdList({ foo: "bar" })).toEqual([]);
    expect(normalizeIdList(true)).toEqual([]);
  });

  it("returns the exact array when given an array of valid strings", () => {
    expect(normalizeIdList(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(normalizeIdList(["single"])).toEqual(["single"]);
  });

  it("filters out empty strings", () => {
    expect(normalizeIdList(["a", "", "b"])).toEqual(["a", "b"]);
    expect(normalizeIdList(["", ""])).toEqual([]);
    expect(normalizeIdList([" "])).toEqual([" "]); // Assuming whitespace is a valid string, length > 0
  });

  it("filters out non-string values from an array", () => {
    expect(
      normalizeIdList([
        "a",
        null,
        "b",
        undefined,
        123,
        { obj: true },
        true,
        false,
        "c",
        "",
      ]),
    ).toEqual(["a", "b", "c"]);
  });
});
