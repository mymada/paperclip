import { describe, expect, it } from "vitest";
import { normalizeIdList, sortAgentsByStoredOrder } from "./agent-order";
import type { Agent } from "@paperclipai/shared";

describe("sortAgentsByStoredOrder", () => {
  const mockAgent = (id: string, name: string, reportsTo: string | null = null): Agent => {
    return {
      id,
      name,
      reportsTo,
    } as Agent;
  };

  const agent1 = mockAgent("1", "C");
  const agent2 = mockAgent("2", "B");
  const agent3 = mockAgent("3", "A");
  const agents = [agent1, agent2, agent3];

  it("returns an empty array when the agents array is empty", () => {
    expect(sortAgentsByStoredOrder([], ["1", "2"])).toEqual([]);
  });

  it("returns default sorted array when orderedIds is empty", () => {
    // Default sort should be alphabetical by name: 3 (A), 2 (B), 1 (C)
    expect(sortAgentsByStoredOrder(agents, [])).toEqual([agent3, agent2, agent1]);
  });

  it("returns agents in the exact order specified by orderedIds", () => {
    expect(sortAgentsByStoredOrder(agents, ["2", "1", "3"])).toEqual([agent2, agent1, agent3]);
  });

  it("appends any agents missing from orderedIds to the end of the list, sorted by default ordering", () => {
    // Only "1" is in orderedIds. "3" and "2" are missing.
    // Missing agents should be appended in default sort order (alphabetical): 3 then 2.
    // Final result: 1, 3, 2.
    expect(sortAgentsByStoredOrder(agents, ["1"])).toEqual([agent1, agent3, agent2]);
  });

  it("ignores IDs in orderedIds that don't match any agent", () => {
    expect(sortAgentsByStoredOrder(agents, ["unknown", "2", "not-found", "3"])).toEqual([
      agent2,
      agent3,
      agent1, // 1 is missing, appended at the end
    ]);
  });
});

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

  it("handles a complex mixed array", () => {
    const input = ["id-1", "", 123, "id-2", null, { id: "id-3" }, "id-4"];
    expect(normalizeIdList(input)).toEqual(["id-1", "id-2", "id-4"]);
  });
});
