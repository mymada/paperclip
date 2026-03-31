import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listFullBackups } from "./backup-lib.js";

function mkTmpDir() {
  return mkdtempSync(join(tmpdir(), "paperclip-backup-test-"));
}

function makeBackupDir(root: string, name: string, files: Record<string, string> = {}) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  // Write at least one file so dirSizeSync returns > 0
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ version: 1 }));
  for (const [rel, content] of Object.entries(files)) {
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

describe("listFullBackups", () => {
  let root: string;

  beforeEach(() => {
    root = mkTmpDir();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("returns empty array when backupDir does not exist", () => {
    const result = listFullBackups(join(root, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("returns empty array when backupDir is empty", () => {
    expect(listFullBackups(root)).toEqual([]);
  });

  it("ignores entries that do not match the prefix-full-YYYYMMDD-HHMMSS pattern", () => {
    mkdirSync(join(root, "paperclip-20260322-205625"));           // old DB-only format
    mkdirSync(join(root, "paperclip-20260322-205625.sql.gz"));    // gzip file named as dir
    mkdirSync(join(root, "random-dir"));
    mkdirSync(join(root, "paperclip-full-notadate-000000"));      // wrong date
    expect(listFullBackups(root)).toEqual([]);
  });

  it("returns one entry for a valid full backup directory", () => {
    makeBackupDir(root, "paperclip-full-20260327-100000");
    const result = listFullBackups(root);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("paperclip-full-20260327-100000");
    expect(result[0].createdAt).toEqual(new Date("2026-03-27T10:00:00Z"));
    expect(result[0].sizeBytes).toBeGreaterThan(0);
    expect(result[0].path).toContain("paperclip-full-20260327-100000");
  });

  it("sorts results newest first", () => {
    makeBackupDir(root, "paperclip-full-20260325-080000");
    makeBackupDir(root, "paperclip-full-20260327-100000");
    makeBackupDir(root, "paperclip-full-20260326-120000");

    const result = listFullBackups(root);
    expect(result.map((r) => r.name)).toEqual([
      "paperclip-full-20260327-100000",
      "paperclip-full-20260326-120000",
      "paperclip-full-20260325-080000",
    ]);
  });

  it("respects a custom filenamePrefix", () => {
    makeBackupDir(root, "myapp-full-20260327-100000");
    makeBackupDir(root, "paperclip-full-20260327-100000"); // should be ignored with custom prefix

    const result = listFullBackups(root, "myapp");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("myapp-full-20260327-100000");
  });

  it("ignores non-directory entries that happen to match the pattern", () => {
    // Create a file (not a dir) with matching name — dirSizeSync will fail → ignored
    writeFileSync(join(root, "paperclip-full-20260327-100000"), "not a dir");
    const result = listFullBackups(root);
    expect(result).toHaveLength(0);
  });

  it("includes extra content (skills, projects) in sizeBytes", () => {
    const big = makeBackupDir(root, "paperclip-full-20260327-100000", {
      "db.sql": "x".repeat(5000),
    });
    const small = makeBackupDir(root, "paperclip-full-20260326-100000");

    // Create subdirs in big
    mkdirSync(join(big, "skills"), { recursive: true });
    writeFileSync(join(big, "skills", "SKILL.md"), "# Skill\n".repeat(100));

    const result = listFullBackups(root);
    const bigEntry = result.find((r) => r.name === "paperclip-full-20260327-100000")!;
    const smallEntry = result.find((r) => r.name === "paperclip-full-20260326-100000")!;
    expect(bigEntry.sizeBytes).toBeGreaterThan(smallEntry.sizeBytes);
  });
});
