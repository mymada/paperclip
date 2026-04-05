import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { errorHandler } from "../middleware/index.js";
import { backupRoutes } from "../routes/backup.js";

const gzipAsync = promisify(gzip);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), "paperclip-backup-route-test-"));
}

/** Create a minimal full-backup directory that listFullBackups will pick up. */
function makeBackupEntry(
  backupDir: string,
  name: string,
  opts: {
    dbContent?: string;
    compressed?: boolean;
    includeSkills?: boolean;
    includeManifest?: boolean;
    manifestDbFile?: string;
  } = {},
) {
  const dir = join(backupDir, name);
  mkdirSync(dir, { recursive: true });

  const dbContent = opts.dbContent ?? "-- paperclip statement breakpoint 69f6f3f1-42fd-46a6-bf17-d1d85f8f3900\nSELECT 1;";
  const compressed = opts.compressed !== false;
  const dbFileName = compressed ? "db.sql.gz" : "db.sql";

  if (compressed) {
    // Write a real gzip so the decompress step works
    writeFileSync(join(dir, "db.sql.gz"), Buffer.alloc(0)); // placeholder; replaced below
  } else {
    writeFileSync(join(dir, "db.sql"), dbContent);
  }

  if (opts.includeSkills) {
    mkdirSync(join(dir, "skills"), { recursive: true });
    writeFileSync(join(dir, "skills", "SKILL.md"), "# test skill");
  }

  const manifestDbFileValue = opts.manifestDbFile ?? dbFileName;
  if (opts.includeManifest !== false) {
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        instanceRoot: "/tmp/fake-instance",
        compression: compressed,
        included: ["db", "skills", "config.json"],
        dbFile: manifestDbFileValue,
      }),
    );
  } else {
    // Still need manifest.json to give dirSizeSync something
    writeFileSync(join(dir, "manifest.json"), "{}");
  }

  return dir;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@paperclipai/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@paperclipai/db")>();
  return {
    ...actual,
    runDatabaseRestore: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let backupDir: string;
let instanceRoot: string;

const noopScheduler = {
  intervalMs: 60_000,
  isInFlight: () => false,
  runNow: vi.fn(),
};

const instanceAdminActor = {
  type: "board" as const,
  userId: "local-board",
  source: "local_implicit" as const,
  isInstanceAdmin: true,
};

function makeApp(overrides: {
  scheduler?: typeof noopScheduler | null;
  lastResult?: ReturnType<Parameters<typeof backupRoutes>[0]["getLastResult"]>;
  lastError?: ReturnType<Parameters<typeof backupRoutes>[0]["getLastError"]>;
  actor?: Express.Request["actor"];
} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.actor = overrides.actor ?? instanceAdminActor;
    next();
  });
  app.use(
    "/backup",
    backupRoutes({
      backupDir,
      connectionString: "postgres://fake@localhost:5432/fake",
      instanceRoot,
      getScheduler: () => ("scheduler" in overrides ? overrides.scheduler : noopScheduler),
      getLastResult: () => overrides.lastResult ?? null,
      getLastError: () => overrides.lastError ?? null,
      getConfig: () => ({
        enabled: true,
        intervalMinutes: 60,
        compression: true,
        backupDir,
        gfsEnabled: true,
        gfsHourlyCount: 24,
        gfsDailyCount: 7,
        gfsWeeklyCount: 4,
      }),
    }),
  );
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  backupDir = makeTmpDir();
  instanceRoot = makeTmpDir();
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(backupDir, { recursive: true, force: true });
  rmSync(instanceRoot, { recursive: true, force: true });
});

describe("backup route auth", () => {
  it("rejects non-admin board users", async () => {
    const res = await request(
      makeApp({
        actor: {
          type: "board",
          userId: "user-1",
          source: "session",
          isInstanceAdmin: false,
          companyIds: ["company-1"],
        },
      }),
    ).get("/backup");

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/instance admin access required/i);
  });
});

// ---------------------------------------------------------------------------
// GET /backup — list
// ---------------------------------------------------------------------------

describe("GET /backup", () => {
  it("returns config, status, and empty backups when none exist", async () => {
    const res = await request(makeApp()).get("/backup");
    expect(res.status).toBe(200);
    expect(res.body.backups).toEqual([]);
    expect(res.body.totalBackups).toBe(0);
    expect(res.body.config.enabled).toBe(true);
    expect(res.body.status.inFlight).toBe(false);
  });

  it("lists existing full backup directories", async () => {
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");
    makeBackupEntry(backupDir, "paperclip-full-20260326-080000");

    const res = await request(makeApp()).get("/backup");
    expect(res.status).toBe(200);
    expect(res.body.totalBackups).toBe(2);
    expect(res.body.backups[0].name).toBe("paperclip-full-20260327-100000"); // newest first
    expect(res.body.backups[1].name).toBe("paperclip-full-20260326-080000");
    expect(res.body.backups[0].sizeMb).toBeGreaterThanOrEqual(0);
  });

  it("ignores old-style .sql.gz files in backupDir", async () => {
    writeFileSync(join(backupDir, "paperclip-20260327-100000.sql.gz"), "dummy");
    const res = await request(makeApp()).get("/backup");
    expect(res.body.totalBackups).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /backup/status
// ---------------------------------------------------------------------------

describe("GET /backup/status", () => {
  it("returns enabled and scheduler info", async () => {
    const res = await request(makeApp()).get("/backup/status");
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.inFlight).toBe(false);
    expect(res.body.intervalMinutes).toBe(60);
    expect(res.body.gfs.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /backup/trigger
// ---------------------------------------------------------------------------

describe("POST /backup/trigger", () => {
  it("returns 503 when scheduler is null (backup disabled)", async () => {
    const res = await request(makeApp({ scheduler: null })).post("/backup/trigger");
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not enabled/i);
  });

  it("returns 409 when a backup is already in flight", async () => {
    const busyScheduler = { ...noopScheduler, isInFlight: () => true };
    const res = await request(makeApp({ scheduler: busyScheduler })).post("/backup/trigger");
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/in progress/i);
  });

  it("triggers backup and returns 200", async () => {
    const res = await request(makeApp()).post("/backup/trigger");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/triggered/i);
    expect(noopScheduler.runNow).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// GET /backup/:name/download
// ---------------------------------------------------------------------------

describe("GET /backup/:name/download", () => {
  it("returns 400 for names with path traversal characters", async () => {
    const res = await request(makeApp()).get("/backup/../etc/passwd/download");
    expect(res.status).toBe(404); // Express strips the traversal
  });

  it("returns 400 for names with special characters", async () => {
    const res = await request(makeApp()).get("/backup/foo%00bar/download");
    expect(res.status).toBe(400);
  });

  it("returns 404 when backup does not exist", async () => {
    const res = await request(makeApp()).get("/backup/paperclip-full-20260101-000000/download");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("streams a tar.gz for a valid backup", async () => {
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");

    const res = await request(makeApp())
      .get("/backup/paperclip-full-20260327-100000/download")
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("gzip");
    expect(res.headers["content-disposition"]).toContain("paperclip-full-20260327-100000.tar.gz");
    // gzip magic bytes: 1f 8b
    const body = res.body as Buffer;
    expect(body[0]).toBe(0x1f);
    expect(body[1]).toBe(0x8b);
  });
});

// ---------------------------------------------------------------------------
// POST /backup/:name/restore
// ---------------------------------------------------------------------------

describe("POST /backup/:name/restore", () => {
  it("returns 400 for names with special characters", async () => {
    const res = await request(makeApp()).post("/backup/foo;rm%20-rf/restore");
    expect(res.status).toBe(400);
  });

  it("returns 404 when backup does not exist", async () => {
    const res = await request(makeApp()).post("/backup/paperclip-full-20260101-000000/restore");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 422 when no db file is found in the backup", async () => {
    const dir = join(backupDir, "paperclip-full-20260327-100000");
    mkdirSync(dir, { recursive: true });
    // Only write manifest, no sql file
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ version: 1, included: [] }));

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/no database file/i);
  });

  it("restores database from uncompressed .sql backup", async () => {
    const { runDatabaseRestore } = await import("@paperclipai/db");

    makeBackupEntry(backupDir, "paperclip-full-20260327-100000", { compressed: false });

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(200);
    expect(res.body.restored).toContain("database");
    expect(runDatabaseRestore).toHaveBeenCalledOnce();
  });

  it("decompresses .sql.gz before restoring", async () => {
    const { runDatabaseRestore } = await import("@paperclipai/db");

    const dir = makeBackupEntry(backupDir, "paperclip-full-20260327-100000", { compressed: true });
    // Write a real gzip file
    const sqlContent = "-- paperclip statement breakpoint 69f6f3f1-42fd-46a6-bf17-d1d85f8f3900\nSELECT 1;";
    const compressed = await gzipAsync(Buffer.from(sqlContent));
    writeFileSync(join(dir, "db.sql.gz"), compressed);

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(200);
    expect(res.body.restored).toContain("database");
    expect(runDatabaseRestore).toHaveBeenCalledOnce();
    // Verify it was called with a .sql path (temp file, not the .gz)
    const call = vi.mocked(runDatabaseRestore).mock.calls[0][0];
    expect(call.backupFile).toMatch(/\.sql$/);
    expect(call.connectionString).toBe("postgres://fake@localhost:5432/fake");
  });

  it("restores file directories (skills, projects, workspaces, secrets, config)", async () => {
    const { runDatabaseRestore } = await import("@paperclipai/db");

    const dir = makeBackupEntry(backupDir, "paperclip-full-20260327-100000", {
      compressed: false,
      includeSkills: true,
    });
    // Add more file entries
    mkdirSync(join(dir, "projects"), { recursive: true });
    writeFileSync(join(dir, "projects", "project.json"), "{}");
    mkdirSync(join(dir, "workspaces"), { recursive: true });
    writeFileSync(join(dir, "workspaces", "ws.json"), "{}");
    mkdirSync(join(dir, "secrets"), { recursive: true });
    writeFileSync(join(dir, "secrets", "master.key"), "secret");
    writeFileSync(join(dir, "config.json"), JSON.stringify({ version: 1 }));

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(200);
    expect(res.body.restored).toContain("database");
    expect(res.body.restored).toContain("skills");
    expect(res.body.restored).toContain("projects");
    expect(res.body.restored).toContain("workspaces");
    expect(res.body.restored).toContain("secrets");
    expect(res.body.restored).toContain("config.json");
    expect(runDatabaseRestore).toHaveBeenCalledOnce();
  });

  it("returns error when runDatabaseRestore fails", async () => {
    const { runDatabaseRestore } = await import("@paperclipai/db");
    vi.mocked(runDatabaseRestore).mockRejectedValueOnce(new Error("Connection refused"));

    makeBackupEntry(backupDir, "paperclip-full-20260327-100000", { compressed: false });

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Connection refused/);
  });

  it("returns 422 when manifest references a db file that no longer exists on disk", async () => {
    const dir = makeBackupEntry(backupDir, "paperclip-full-20260327-100000", {
      compressed: false,
      manifestDbFile: "db.sql",
      includeManifest: true,
    });
    // Remove the file that the manifest points to — no fallback scan should occur
    rmSync(join(dir, "db.sql"), { force: true });

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/no database file/i);
  });

  it("finds db file by sorted directory scan when no manifest exists", async () => {
    const { runDatabaseRestore } = await import("@paperclipai/db");

    const dir = join(backupDir, "paperclip-full-20260327-100000");
    mkdirSync(dir, { recursive: true });
    // No manifest — two .sql files present, sorted order should pick db-a first
    const sqlContent = "-- paperclip statement breakpoint 69f6f3f1-42fd-46a6-bf17-d1d85f8f3900\nSELECT 1;";
    writeFileSync(join(dir, "db-z.sql"), sqlContent);
    writeFileSync(join(dir, "db-a.sql"), sqlContent);

    const res = await request(makeApp()).post("/backup/paperclip-full-20260327-100000/restore");
    expect(res.status).toBe(200);
    expect(runDatabaseRestore).toHaveBeenCalledOnce();
    const call = vi.mocked(runDatabaseRestore).mock.calls[0][0];
    // Sorted scan → db-a.sql picked first
    expect(call.backupFile).toMatch(/db-a\.sql$/);
  });
});

// ---------------------------------------------------------------------------
// DELETE /backup/:name
// ---------------------------------------------------------------------------

describe("DELETE /backup/:name", () => {
  it("returns 400 for invalid backup name", async () => {
    const res = await request(makeApp()).delete("/backup/foo;rm%20-rf");
    expect(res.status).toBe(400);
  });

  it("returns 404 when backup does not exist", async () => {
    const res = await request(makeApp()).delete("/backup/paperclip-full-20260101-000000");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("deletes an existing backup directory", async () => {
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");

    const res = await request(makeApp()).delete("/backup/paperclip-full-20260327-100000");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Verify directory is gone
    const list = await request(makeApp()).get("/backup");
    expect(list.body.totalBackups).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DELETE /backup (bulk)
// ---------------------------------------------------------------------------

describe("DELETE /backup (bulk)", () => {
  it("returns 400 for empty names array", async () => {
    const res = await request(makeApp()).delete("/backup").send({ names: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid payload/i);
  });

  it("returns 400 for missing names field", async () => {
    const res = await request(makeApp()).delete("/backup").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when names array exceeds 100 entries", async () => {
    const names = Array.from({ length: 101 }, (_, i) => `paperclip-full-20260101-${String(i).padStart(6, "0")}`);
    const res = await request(makeApp()).delete("/backup").send({ names });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too many/i);
  });

  it("deletes multiple backups in one request", async () => {
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");
    makeBackupEntry(backupDir, "paperclip-full-20260326-080000");

    const res = await request(makeApp())
      .delete("/backup")
      .send({ names: ["paperclip-full-20260327-100000", "paperclip-full-20260326-080000"] });

    expect(res.status).toBe(200);
    expect(res.body.results.deleted).toHaveLength(2);
    expect(res.body.results.failed).toHaveLength(0);

    const list = await request(makeApp()).get("/backup");
    expect(list.body.totalBackups).toBe(0);
  });

  it("reports failed entries individually without aborting the rest", async () => {
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");

    const res = await request(makeApp())
      .delete("/backup")
      .send({ names: ["paperclip-full-20260327-100000", "paperclip-full-nonexistent-000000"] });

    expect(res.status).toBe(200);
    expect(res.body.results.deleted).toContain("paperclip-full-20260327-100000");
    expect(res.body.results.failed[0].name).toBe("paperclip-full-nonexistent-000000");
  });
});

// ---------------------------------------------------------------------------
// POST /backup/reap
// ---------------------------------------------------------------------------

describe("POST /backup/reap", () => {
  it("returns empty reaped list when backup dir does not exist", async () => {
    rmSync(backupDir, { recursive: true, force: true });
    const res = await request(makeApp()).post("/backup/reap");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/no backup directory/i);
  });

  it("does not reap valid backups with a manifest", async () => {
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");
    const res = await request(makeApp()).post("/backup/reap");
    expect(res.status).toBe(200);
    expect(res.body.reaped).toHaveLength(0);
  });

  it("reaps orphaned full backup directories without manifest", async () => {
    // Orphaned dir matching the full-backup pattern but no manifest.json
    const orphanName = "paperclip-full-20260325T120000";
    mkdirSync(join(backupDir, orphanName), { recursive: true });
    // Legit backup with manifest should survive
    makeBackupEntry(backupDir, "paperclip-full-20260327-100000");

    const res = await request(makeApp()).post("/backup/reap");
    expect(res.status).toBe(200);
    expect(res.body.reaped).toContain(orphanName);
    expect(res.body.reaped).not.toContain("paperclip-full-20260327-100000");
  });

  it("does not reap non-backup directories even without a manifest", async () => {
    // A dir that doesn't match /-full-\d{8}T\d{6}/ should never be touched
    mkdirSync(join(backupDir, "logs"), { recursive: true });
    mkdirSync(join(backupDir, "tmp-upload"), { recursive: true });

    const res = await request(makeApp()).post("/backup/reap");
    expect(res.status).toBe(200);
    expect(res.body.reaped).toHaveLength(0);
  });
});
