import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Clock, Database, Download, FolderOpen, HardDrive, Play, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { backupApi, type BackupEntry } from "@/api/backup";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDateTime, relativeTime } from "../lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        ok ? "bg-green-500" : "bg-red-500",
      )}
    />
  );
}

function BackupRow({ entry, onRestore }: { entry: BackupEntry; onRestore: (name: string) => void }) {
  const date = new Date(entry.createdAt);
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <Archive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="font-mono text-xs text-muted-foreground truncate flex-1" title={entry.path}>
        {entry.name}
      </span>
      <span className="text-muted-foreground shrink-0 tabular-nums text-xs">
        {formatBytes(entry.sizeBytes)}
      </span>
      <span
        className="hidden md:inline text-muted-foreground shrink-0 text-xs"
        title={formatDateTime(entry.createdAt)}
      >
        {relativeTime(date.toISOString())}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={backupApi.downloadUrl(entry.name)}
          download={`${entry.name}.tar.gz`}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Download backup"
        >
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">Download</span>
        </a>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Restore database from this backup"
          onClick={() => onRestore(entry.name)}
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Restore</span>
        </button>
      </div>
    </div>
  );
}

export function InstanceBackupSettings() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Instance Settings" },
      { label: "Backup" },
    ]);
  }, [setBreadcrumbs]);

  const listQuery = useQuery({
    queryKey: ["backup", "list"],
    queryFn: () => backupApi.list(),
    refetchInterval: 15_000,
  });

  const triggerMutation = useMutation({
    mutationFn: () => backupApi.trigger(),
    onSuccess: (data) => {
      setTriggerMessage(data.message);
      void queryClient.invalidateQueries({ queryKey: ["backup"] });
      setTimeout(() => setTriggerMessage(null), 6000);
    },
    onError: (err) => {
      setTriggerMessage(err instanceof Error ? err.message : "Failed to trigger backup.");
      setTimeout(() => setTriggerMessage(null), 6000);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (name: string) => backupApi.restore(name),
    onSuccess: (data) => {
      const detail = `Restored: ${data.restored.join(", ")}${data.skipped?.length ? ` — skipped: ${data.skipped.join(", ")}` : ""}`;
      setRestoreMessage({ text: `${data.message} ${detail}`, isError: false });
      setConfirmRestore(null);
      setTimeout(() => setRestoreMessage(null), 15000);
    },
    onError: (err) => {
      setRestoreMessage({ text: err instanceof Error ? err.message : "Restore failed.", isError: true });
      setConfirmRestore(null);
      setTimeout(() => setRestoreMessage(null), 10000);
    },
  });

  const data = listQuery.data;
  const cfg = data?.config;
  const status = data?.status;
  const backups = data?.backups ?? [];

  function handleRestoreClick(name: string) {
    setConfirmRestore(name);
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Backup</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Full backups include the database, skills, project workspaces, agent workspaces, storage, secrets and config.
        </p>
      </div>

      {listQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading backup status...</p>
      )}

      {listQuery.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {listQuery.error instanceof Error ? listQuery.error.message : "Failed to load backup status."}
        </div>
      )}

      {data && (
        <>
          {/* Status card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <StatusDot ok={cfg?.enabled === true} />
                  <span className="text-sm font-semibold">
                    {cfg?.enabled ? "Automatic backups enabled" : "Automatic backups disabled"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={triggerMutation.isPending || status?.inFlight}
                  onClick={() => triggerMutation.mutate()}
                  className="gap-1.5 h-7 text-xs"
                >
                  {status?.inFlight ? (
                    <><RefreshCw className="h-3 w-3 animate-spin" /> In progress…</>
                  ) : (
                    <><Play className="h-3 w-3" /> Run backup now</>
                  )}
                </Button>
              </div>

              {triggerMessage && (
                <div className="rounded border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {triggerMessage}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Interval</p>
                  <p className="font-medium">
                    {cfg?.intervalMinutes != null ? `Every ${cfg.intervalMinutes} min` : "—"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Compression</p>
                  <p className="font-medium">{cfg?.compression ? "gzip" : "None"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Last backup</p>
                  <p className="font-medium">
                    {status?.lastCompletedAt
                      ? relativeTime(status.lastCompletedAt)
                      : "Never"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Next backup</p>
                  <p className="font-medium">
                    {status?.nextScheduledAt
                      ? relativeTime(status.nextScheduledAt)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* GFS retention */}
              {cfg?.gfs?.enabled && (
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    GFS Retention (grandfather-father-son)
                  </p>
                  <div className="flex gap-6 text-sm mt-1">
                    <span><span className="font-semibold">{cfg.gfs.hourlyCount}h</span> hourly</span>
                    <span><span className="font-semibold">{cfg.gfs.dailyCount}d</span> daily</span>
                    <span><span className="font-semibold">{cfg.gfs.weeklyCount}w</span> weekly</span>
                  </div>
                </div>
              )}

              {/* Storage dir */}
              {cfg?.backupDir && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono truncate">{cfg.backupDir}</span>
                </div>
              )}

              {/* Last error */}
              {status?.lastError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Last backup failed</span>
                    {status.lastError.occurredAt && (
                      <span className="text-destructive/70 ml-1">
                        ({relativeTime(status.lastError.occurredAt)})
                      </span>
                    )}
                    <p className="mt-0.5">{status.lastError.message}</p>
                  </div>
                </div>
              )}

              {/* Last backup OK summary */}
              {!status?.lastError && status?.lastCompletedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>
                    Last backup completed {relativeTime(status.lastCompletedAt)}
                    {status.lastCompletedAt && (
                      <span className="ml-1 text-muted-foreground/70">
                        ({formatDateTime(status.lastCompletedAt)})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restore confirmation dialog */}
          {confirmRestore && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 space-y-3">
              <p className="text-sm font-semibold text-destructive">Confirm database restore</p>
              <p className="text-xs text-muted-foreground">
                This will overwrite the current database with the contents of{" "}
                <span className="font-mono font-semibold">{confirmRestore}</span>.{" "}
                This action cannot be undone. Restart the server after restore.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  disabled={restoreMutation.isPending}
                  onClick={() => restoreMutation.mutate(confirmRestore)}
                >
                  {restoreMutation.isPending ? <><RefreshCw className="h-3 w-3 animate-spin mr-1" /> Restoring…</> : "Yes, restore"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={restoreMutation.isPending}
                  onClick={() => setConfirmRestore(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Restore result message */}
          {restoreMessage && (
            <div className={cn(
              "rounded-md border px-3 py-2 text-sm",
              restoreMessage.isError
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400",
            )}>
              {restoreMessage.text}
            </div>
          )}

          {/* Backup list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Available backups
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({data.totalBackups} — {formatBytes(data.totalSizeBytes)} total)
                </span>
              </div>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ["backup"] })}
              >
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                No backups yet. Run one manually or wait for the next scheduled backup.
              </div>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y">
                  {backups.map((entry) => (
                    <BackupRow key={entry.name} entry={entry} onRestore={handleRestoreClick} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Config note */}
          <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">To change backup settings</p>
            <p>
              Edit <span className="font-mono">database.backup</span> in your <span className="font-mono">config.json</span>
              {" "}and restart the server.
            </p>
            <p className="mt-1 font-mono text-muted-foreground/70">
              {`{ "compression": true, "gfs": { "hourlyCount": 24, "dailyCount": 7, "weeklyCount": 4 }, "includeFiles": { "skills": true, "projects": true, ... } }`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
