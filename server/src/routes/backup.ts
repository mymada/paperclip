import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { cp, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGunzip } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Router } from "express";
import { listFullBackups, runDatabaseRestore } from "@paperclipai/db";
import type {
  BackupConfigSnapshot,
  BackupLastError,
  BackupLastResult,
  BackupSchedulerState,
} from "../index.js";

// Known file entries that may exist in a full backup directory
const FILE_ENTRIES = ["skills", "projects", "workspaces", "storage", "secrets", "config.json"] as const;

type Manifest = {
  version?: number;
  instanceRoot?: string;
  compression?: boolean;
  included?: string[];
  dbFile?: string;
};

async function readManifest(backupPath: string): Promise<Manifest | null> {
  const manifestPath = join(backupPath, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  } catch {
    return null;
  }
}

function findDbFile(backupPath: string, manifestDbFile?: string): string | null {
  // Try manifest hint first (it names the file, actual may have a timestamp suffix)
  if (manifestDbFile) {
    const direct = join(backupPath, manifestDbFile);
    if (existsSync(direct)) return direct;
  }
  // Scan directory for any .sql.gz or .sql
  const files = readdirSync(backupPath);
  const sqlGz = files.find((f) => f.endsWith(".sql.gz"));
  if (sqlGz) return join(backupPath, sqlGz);
  const sql = files.find((f) => f.endsWith(".sql"));
  if (sql) return join(backupPath, sql);
  return null;
}

export function backupRoutes(opts: {
  backupDir: string;
  connectionString: string;
  instanceRoot: string;
  getScheduler: () => BackupSchedulerState | null;
  getLastResult: () => BackupLastResult | null;
  getLastError: () => BackupLastError | null;
  getConfig: () => BackupConfigSnapshot | null;
}) {
  const router = Router();

  // GET /api/backup — list available backups + status
  router.get("/", (_req, res) => {
    const cfg = opts.getConfig();
    const lastResult = opts.getLastResult();
    const lastError = opts.getLastError();
    const scheduler = opts.getScheduler();

    const backups = listFullBackups(opts.backupDir);

    const nextBackupAt = scheduler && lastResult
      ? new Date(lastResult.completedAt.getTime() + scheduler.intervalMs)
      : null;

    res.json({
      config: cfg ?? { enabled: false },
      status: {
        inFlight: scheduler?.isInFlight() ?? false,
        lastCompletedAt: lastResult?.completedAt ?? null,
        lastError: lastError ?? null,
        nextScheduledAt: nextBackupAt,
      },
      backups: backups.map((b) => ({
        name: b.name,
        path: b.path,
        createdAt: b.createdAt,
        sizeBytes: b.sizeBytes,
        sizeMb: Math.round(b.sizeBytes / 1024 / 1024 * 10) / 10,
      })),
      totalBackups: backups.length,
      totalSizeBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
    });
  });

  // POST /api/backup/trigger — déclenche un backup immédiat
  router.post("/trigger", async (_req, res) => {
    const scheduler = opts.getScheduler();
    if (!scheduler) {
      res.status(503).json({ error: "Backup scheduler is not enabled" });
      return;
    }
    if (scheduler.isInFlight()) {
      res.status(409).json({ error: "A backup is already in progress" });
      return;
    }
    void scheduler.runNow();
    res.json({ message: "Backup triggered. Check GET /api/backup for status." });
  });

  // GET /api/backup/status — statut rapide (sans la liste des backups)
  router.get("/status", (_req, res) => {
    const cfg = opts.getConfig();
    const lastResult = opts.getLastResult();
    const lastError = opts.getLastError();
    const scheduler = opts.getScheduler();

    const nextBackupAt = scheduler && lastResult
      ? new Date(lastResult.completedAt.getTime() + scheduler.intervalMs)
      : null;

    res.json({
      enabled: cfg?.enabled ?? false,
      inFlight: scheduler?.isInFlight() ?? false,
      intervalMinutes: cfg?.intervalMinutes ?? null,
      compression: cfg?.compression ?? true,
      backupDir: cfg?.backupDir ?? null,
      gfs: cfg
        ? {
            enabled: cfg.gfsEnabled,
            hourlyCount: cfg.gfsHourlyCount,
            dailyCount: cfg.gfsDailyCount,
            weeklyCount: cfg.gfsWeeklyCount,
          }
        : null,
      lastCompletedAt: lastResult?.completedAt ?? null,
      lastBackup: lastResult
        ? {
            backupDir: lastResult.backupDir,
            dbSizeBytes: lastResult.dbSizeBytes,
            filesSizeBytes: lastResult.filesSizeBytes,
            totalSizeBytes: lastResult.totalSizeBytes,
            prunedCount: lastResult.prunedCount,
            includedDirs: lastResult.includedDirs,
          }
        : null,
      lastError: lastError ?? null,
      nextScheduledAt: nextBackupAt,
    });
  });

  // GET /api/backup/:name/download — télécharge le backup en tar.gz
  router.get("/:name/download", (req, res) => {
    const { name } = req.params;

    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
      res.status(400).json({ error: "Invalid backup name" });
      return;
    }

    const backups = listFullBackups(opts.backupDir);
    const entry = backups.find((b) => b.name === name);

    if (!entry) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }

    if (!existsSync(entry.path)) {
      res.status(404).json({ error: "Backup directory not found on disk" });
      return;
    }

    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.tar.gz"`);

    const tar = spawn("tar", ["-czf", "-", "-C", opts.backupDir, name], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    tar.stderr.on("data", (data: Buffer) => {
      console.error(`[backup download] tar stderr: ${data.toString().trim()}`);
    });

    tar.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to create archive: ${err.message}` });
      } else {
        res.destroy();
      }
    });

    tar.on("close", (code) => {
      if (code !== 0 && !res.writableEnded) res.destroy();
    });

    tar.stdout.pipe(res);
  });

  // POST /api/backup/:name/restore — restaure DB + tous les fichiers depuis un backup complet
  router.post("/:name/restore", async (req, res) => {
    const { name } = req.params;

    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
      res.status(400).json({ error: "Invalid backup name" });
      return;
    }

    const backups = listFullBackups(opts.backupDir);
    const entry = backups.find((b) => b.name === name);

    if (!entry) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }

    const manifest = await readManifest(entry.path);
    const restored: string[] = [];
    const skipped: string[] = [];

    // --- 1. Restore database ---
    const dbFile = findDbFile(entry.path, manifest?.dbFile);
    if (!dbFile) {
      res.status(422).json({ error: "No database file found in this backup" });
      return;
    }

    let tempFile: string | null = null;
    let restoreFile = dbFile;

    if (dbFile.endsWith(".gz")) {
      tempFile = join(tmpdir(), `paperclip-restore-${Date.now()}.sql`);
      try {
        await pipeline(
          createReadStream(dbFile),
          createGunzip(),
          createWriteStream(tempFile),
        );
        restoreFile = tempFile;
      } catch (err) {
        res.status(500).json({
          error: `Failed to decompress database backup: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }
    }

    try {
      await runDatabaseRestore({
        connectionString: opts.connectionString,
        backupFile: restoreFile,
      });
      restored.push("database");
    } catch (err) {
      res.status(500).json({
        error: `Database restore failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    } finally {
      if (tempFile) {
        try { await unlink(tempFile); } catch { /* ignore */ }
      }
    }

    // --- 2. Restore files (skills, projects, workspaces, storage, secrets, config.json) ---
    // Restore every known entry that physically exists in the backup directory.
    // The manifest `included` field is informational only; presence on disk is authoritative.

    for (const entry_name of FILE_ENTRIES) {
      const srcPath = join(entry.path, entry_name);
      if (!existsSync(srcPath)) {
        continue;
      }

      const destPath = join(opts.instanceRoot, entry_name);
      try {
        const srcStat = statSync(srcPath);
        await cp(srcPath, destPath, {
          recursive: srcStat.isDirectory(),
          force: true,
          preserveTimestamps: true,
        });
        restored.push(entry_name);
      } catch (err) {
        // Non-fatal: log and continue with remaining entries
        console.error(`[backup restore] Failed to restore ${entry_name}: ${err instanceof Error ? err.message : String(err)}`);
        skipped.push(entry_name);
      }
    }

    res.json({
      message: `Restore complete. Restart the server to apply all changes.`,
      restored,
      skipped: skipped.length > 0 ? skipped : undefined,
    });
  });

  return router;
}
