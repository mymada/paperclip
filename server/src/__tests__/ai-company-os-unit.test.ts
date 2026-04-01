import { describe, expect, it, vi } from "vitest";
import { filterByScope } from "../log-redaction.js";

describe("Module 3: RBAC Context Scopes", () => {
  describe("filterByScope", () => {
    const items = [
      { id: "1", scope: "general" },
      { id: "2", scope: "finance" },
      { id: "3", scope: "source_code" },
      { id: "4", scope: null },
    ];

    it("allows everything for admin", () => {
      const allowed = ["admin"];
      const filtered = filterByScope(items, allowed, (i) => i.scope);
      expect(filtered).toHaveLength(4);
    });

    it("allows everything for *", () => {
      const allowed = ["*"];
      const filtered = filterByScope(items, allowed, (i) => i.scope);
      expect(filtered).toHaveLength(4);
    });

    it("filters by specific scope and allows general/null", () => {
      const allowed = ["finance"];
      const filtered = filterByScope(items, allowed, (i) => i.scope);
      expect(filtered.map(i => i.id)).toEqual(["1", "2", "4"]);
    });

    it("allows multiple scopes", () => {
      const allowed = ["finance", "source_code"];
      const filtered = filterByScope(items, allowed, (i) => i.scope);
      expect(filtered.map(i => i.id)).toEqual(["1", "2", "3", "4"]);
    });

    it("only allows general/null if no matching scopes", () => {
      const allowed = ["legal"];
      const filtered = filterByScope(items, allowed, (i) => i.scope);
      expect(filtered.map(i => i.id)).toEqual(["1", "4"]);
    });
  });
});
