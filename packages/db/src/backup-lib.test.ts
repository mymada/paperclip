import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os, { tmpdir } from "node:os";
import path, { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { createBufferedTextFileWriter, listFullBackups, runDatabaseBackup, runDatabaseRestore, runFullBackup } from "./backup-lib.js";
import { ensurePostgresDatabase } from "./client.js";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./test-embedded-postgres.js";

function mkTmpDir() {
  return mkdtempSync(join(tmpdir(), "paperclip-backup-test-"));
}

describe("backup-lib", () => {
  describe("listFullBackups", () => {
    let root = "";

    beforeEach(() => {
      root = mkTmpDir();
    });

    afterEach(() => {
      if (root) rmSync(root, { recursive: true, force: true });
    });

    it("returns empty list for non-existent directory", () => {
      expect(listFullBackups(join(root, "missing"))).toEqual([]);
    });

    it("filters and sorts full backups by timestamp", () => {
      const b1 = join(root, "paperclip-full-20260326-100000");
      const b2 = join(root, "paperclip-full-20260327-100000");
      mkdirSync(b1);
      mkdirSync(b2);

      const result = listFullBackups(root);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("paperclip-full-20260327-100000");
      expect(result[1].name).toBe("paperclip-full-20260326-100000");
    });

    it("calculates directory size for full backups", () => {
      const small = join(root, "paperclip-full-20260326-100000");
      const big = join(root, "paperclip-full-20260327-100000");
      mkdirSync(small);
      mkdirSync(big);

      writeFileSync(join(small, "file.txt"), "hello");

      // Create subdirs in big
      mkdirSync(join(big, "skills"), { recursive: true });
      writeFileSync(join(big, "skills", "SKILL.md"), "# Skill\n".repeat(100));

      const result = listFullBackups(root);
      const bigEntry = result.find((r) => r.name === "paperclip-full-20260327-100000")!;
      const smallEntry = result.find((r) => r.name === "paperclip-full-20260326-100000")!;
      expect(bigEntry.sizeBytes).toBeGreaterThan(smallEntry.sizeBytes);
    });
  });

  describe("runFullBackup", () => {
    it(
      "creates a full backup directory with manifest, db file, and copied instance files",
      async () => {
        const support = await getEmbeddedPostgresTestSupport();
        if (!support.supported) {
          console.warn("Embedded Postgres not supported, skipping test: " + support.reason);
          return;
        }

        const sourceDb = await startEmbeddedPostgresTestDatabase("paperclip-full-backup-test-");
        const backupDir = mkTmpDir();
        const instanceRoot = mkTmpDir();

        // Create instance dirs with some content
        const skillsDir = join(instanceRoot, "skills");
        const projectsDir = join(instanceRoot, "projects");
        mkdirSync(skillsDir, { recursive: true });
        mkdirSync(projectsDir, { recursive: true });
        writeFileSync(join(skillsDir, "SKILL.md"), "# Test skill");
        writeFileSync(join(projectsDir, "project.json"), "{}");

        const sourceSql = postgres(sourceDb.connectionString);

        try {
          await sourceSql`CREATE TABLE items (id SERIAL PRIMARY KEY, label TEXT)`;
          await sourceSql`INSERT INTO items (label) VALUES ('hello')`;

          const result = await runFullBackup({
            connectionString: sourceDb.connectionString,
            backupDir,
            filenamePrefix: "paperclip",
            compression: false,
            instanceRoot,
            skillsDir,
            projectsDir,
            gfs: { enabled: false, hourlyCount: 0, dailyCount: 0, weeklyCount: 0 },
          });

          // Result shape
          expect(result.dbSizeBytes).toBeGreaterThan(0);
          expect(result.includedDirs).toContain("db");
          expect(result.includedDirs).toContain("skills");
          expect(result.includedDirs).toContain("projects");

          // Backup directory exists
          expect(fs.existsSync(result.backupDir)).toBe(true);

          // Manifest written
          const manifest = JSON.parse(fs.readFileSync(join(result.backupDir, "manifest.json"), "utf8"));
          expect(manifest.version).toBe(1);
          expect(manifest.compression).toBe(false);
          expect(manifest.included).toContain("db");

          // DB file exists
          expect(fs.existsSync(result.dbFile)).toBe(true);

          // Skills and projects copied
          expect(fs.existsSync(join(result.backupDir, "skills", "SKILL.md"))).toBe(true);
          expect(fs.existsSync(join(result.backupDir, "projects", "project.json"))).toBe(true);

          // Appears in listFullBackups
          const list = listFullBackups(backupDir);
          expect(list).toHaveLength(1);
          expect(list[0].name).toMatch(/^paperclip-full-/);
        } finally {
          await sourceSql.end();
          await sourceDb.cleanup();
          rmSync(backupDir, { recursive: true, force: true });
          rmSync(instanceRoot, { recursive: true, force: true });
        }
      },
      60_000,
    );

    it(
      "skips included dirs that do not exist on disk without failing",
      async () => {
        const support = await getEmbeddedPostgresTestSupport();
        if (!support.supported) {
          console.warn("Embedded Postgres not supported, skipping test: " + support.reason);
          return;
        }

        const sourceDb = await startEmbeddedPostgresTestDatabase("paperclip-full-backup-skip-test-");
        const backupDir = mkTmpDir();
        const instanceRoot = mkTmpDir();
        const sourceSql = postgres(sourceDb.connectionString);

        try {
          const result = await runFullBackup({
            connectionString: sourceDb.connectionString,
            backupDir,
            filenamePrefix: "paperclip",
            compression: false,
            instanceRoot,
            skillsDir: join(instanceRoot, "nonexistent-skills"),
            gfs: { enabled: false, hourlyCount: 0, dailyCount: 0, weeklyCount: 0 },
          });

          expect(result.includedDirs).toContain("db");
          expect(result.includedDirs).not.toContain("skills");
          expect(result.filesSizeBytes).toBe(0);
        } finally {
          await sourceSql.end();
          await sourceDb.cleanup();
          rmSync(backupDir, { recursive: true, force: true });
          rmSync(instanceRoot, { recursive: true, force: true });
        }
      },
      60_000,
    );
  });

  describe("database backup/restore", () => {
    it(
      "can backup and restore a database with data, enums, and sequences",
      async () => {
        const support = await getEmbeddedPostgresTestSupport();
        if (!support.supported) {
          console.warn("Embedded Postgres not supported, skipping test: " + support.reason);
          return;
        }

        const sourceDb = await startEmbeddedPostgresTestDatabase("paperclip-backup-test-source-");
        const restoreDb = await startEmbeddedPostgresTestDatabase("paperclip-backup-test-restore-");

        const sourceSql = postgres(sourceDb.connectionString);
        const restoreSql = postgres(restoreDb.connectionString);

        const backupDir = mkTmpDir();

        try {
          // 1. Setup source data
          await sourceSql`CREATE TYPE test_status AS ENUM ('active', 'inactive')`;
          await sourceSql`CREATE TABLE test_table (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            status test_status DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )`;
          await sourceSql`INSERT INTO test_table (name, status) VALUES ('item 1', 'active'), ('item 2', 'inactive')`;

          // 2. Run backup
          const backupResult = await runDatabaseBackup({
            connectionString: sourceDb.connectionString,
            backupDir,
            retentionDays: 1,
            filenamePrefix: "test-backup",
          });

          expect(fs.existsSync(backupResult.backupFile)).toBe(true);

          // 3. Restore to target
          await runDatabaseRestore({
            connectionString: restoreDb.connectionString,
            backupFile: backupResult.backupFile,
          });

          // 4. Verify restored data
          const restoredData = await restoreSql`SELECT * FROM test_table ORDER BY id`;
          expect(restoredData).toHaveLength(2);
          expect(restoredData[0].name).toBe("item 1");
          expect(restoredData[1].name).toBe("item 2");
          expect(restoredData[0].status).toBe("active");
          expect(restoredData[1].status).toBe("inactive");

          // Verify enum exists
          const enumCheck = await restoreSql`SELECT typname FROM pg_type WHERE typname = 'test_status'`;
          expect(enumCheck).toHaveLength(1);

          // Verify sequence was updated (id 3 should be next)
          await restoreSql`INSERT INTO test_table (name) VALUES ('item 3')`;
          const lastId = await restoreSql`SELECT MAX(id) as id FROM test_table`;
          expect(lastId[0].id).toBe(3);
        } finally {
          await sourceSql.end();
          await restoreSql.end();
          await sourceDb.cleanup();
          await restoreDb.cleanup();
          rmSync(backupDir, { recursive: true, force: true });
        }
      },
      60_000,
    );
  });
});
