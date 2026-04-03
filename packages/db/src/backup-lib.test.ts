import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os, { tmpdir } from "node:os";
import path, { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { createBufferedTextFileWriter, listFullBackups, runDatabaseBackup, runDatabaseRestore } from "./backup-lib.js";
import { ensurePostgresDatabase } from "./client.js";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./embedded-postgres-test-utils.js";

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

  describe("database backup/restore", () => {
    it(
      "can backup and restore a database with data, enums, and sequences",
      async () => {
        const support = await getEmbeddedPostgresTestSupport();
        const { connectionString: sourceConn, stop: stopSource } =
          await startEmbeddedPostgresTestDatabase(support);
        const { connectionString: restoreConn, stop: stopRestore } =
          await startEmbeddedPostgresTestDatabase(support);

        const sourceSql = postgres(sourceConn);
        const restoreSql = postgres(restoreConn);

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
            connectionString: sourceConn,
            backupDir,
            retentionDays: 1,
            filenamePrefix: "test-backup",
          });

          expect(fs.existsSync(backupResult.backupFile)).toBe(true);

          // 3. Restore to target
          await runDatabaseRestore({
            connectionString: restoreConn,
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
          await stopSource();
          await stopRestore();
          rmSync(backupDir, { recursive: true, force: true });
        }
      },
      60_000,
    );
  });
});
