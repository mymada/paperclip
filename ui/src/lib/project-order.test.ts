import { describe, expect, it } from "vitest";
import type { Project } from "@paperclipai/shared";
import { normalizeIdList, sortProjectsByStoredOrder } from "./project-order";

function makeProject(id: string, name: string): Project {
  return {
    id,
    companyId: "company-1",
    urlKey: name,
    goalId: null,
    goalIds: [],
    goals: [],
    name,
    description: null,
    status: "in_progress",
    leadAgentId: null,
    targetDate: null,
    color: null,
    pauseReason: null,
    pausedAt: null,
    executionWorkspacePolicy: null,
    codebase: {
      workspaceId: null,
      repoUrl: null,
      repoRef: null,
      defaultRef: null,
      repoName: null,
      localFolder: null,
      managedFolder: "",
      effectiveLocalFolder: "",
      origin: "local_folder",
    },
    workspaces: [],
    primaryWorkspace: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

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

describe("sortProjectsByStoredOrder", () => {
  it("returns an empty array when given no projects", () => {
    expect(sortProjectsByStoredOrder([], ["1", "2"])).toEqual([]);
  });

  it("returns the original array when given no ordered IDs", () => {
    const projects = [makeProject("1", "A"), makeProject("2", "B")];
    expect(sortProjectsByStoredOrder(projects, [])).toEqual(projects);
  });

  it("sorts projects according to the provided ordered IDs", () => {
    const projects = [
      makeProject("1", "A"),
      makeProject("2", "B"),
      makeProject("3", "C"),
    ];
    const orderedIds = ["3", "1", "2"];
    const sorted = sortProjectsByStoredOrder(projects, orderedIds);
    expect(sorted.map((p) => p.id)).toEqual(["3", "1", "2"]);
  });

  it("places projects not present in the ordered IDs at the end of the sorted list", () => {
    const projects = [
      makeProject("1", "A"),
      makeProject("2", "B"),
      makeProject("3", "C"),
      makeProject("4", "D"),
    ];
    const orderedIds = ["3", "1"];
    const sorted = sortProjectsByStoredOrder(projects, orderedIds);
    expect(sorted.map((p) => p.id)).toEqual(["3", "1", "2", "4"]);
  });

  it("ignores ordered IDs that are not present in the projects list", () => {
    const projects = [
      makeProject("1", "A"),
      makeProject("2", "B"),
    ];
    const orderedIds = ["2", "non-existent", "1", "another-missing"];
    const sorted = sortProjectsByStoredOrder(projects, orderedIds);
    expect(sorted.map((p) => p.id)).toEqual(["2", "1"]);
  });
});
