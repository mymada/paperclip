import { api } from "./client";

export type BackupEntry = {
  name: string;
  path: string;
  createdAt: string;
  sizeBytes: number;
  sizeMb: number;
};

export type BackupGfsConfig = {
  enabled: boolean;
  hourlyCount: number;
  dailyCount: number;
  weeklyCount: number;
};

export type BackupConfig = {
  enabled: boolean;
  intervalMinutes?: number;
  compression?: boolean;
  backupDir?: string;
  gfs?: BackupGfsConfig;
};

export type BackupStatus = {
  inFlight: boolean;
  lastCompletedAt: string | null;
  lastError: { message: string; occurredAt: string } | null;
  nextScheduledAt: string | null;
};

export type BackupListResponse = {
  config: BackupConfig;
  status: BackupStatus;
  backups: BackupEntry[];
  totalBackups: number;
  totalSizeBytes: number;
};

export type BackupStatusResponse = {
  enabled: boolean;
  inFlight: boolean;
  intervalMinutes: number | null;
  compression: boolean;
  backupDir: string | null;
  gfs: BackupGfsConfig | null;
  lastCompletedAt: string | null;
  lastBackup: {
    backupDir: string;
    dbSizeBytes: number;
    filesSizeBytes: number;
    totalSizeBytes: number;
    prunedCount: number;
    includedDirs: string[];
  } | null;
  lastError: { message: string; occurredAt: string } | null;
  nextScheduledAt: string | null;
};

export const backupApi = {
  list: () => api.get<BackupListResponse>("/backup"),
  status: () => api.get<BackupStatusResponse>("/backup/status"),
  trigger: () => api.post<{ message: string }>("/backup/trigger", {}),
  restore: (name: string) => api.post<{ message: string; restored: string[]; skipped?: string[] }>(`/backup/${encodeURIComponent(name)}/restore`, {}),
  delete: (name: string) => api.delete<{ message: string }>(`/backup/${encodeURIComponent(name)}`),
  downloadUrl: (name: string) => `/api/backup/${encodeURIComponent(name)}/download`,
};
