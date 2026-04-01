export type RunDatabaseBackupOptions = {
    connectionString: string;
    backupDir: string;
    retentionDays: number;
    filenamePrefix?: string;
    connectTimeoutSeconds?: number;
    includeMigrationJournal?: boolean;
    excludeTables?: string[];
    nullifyColumns?: Record<string, string[]>;
    compression?: boolean;
};
export type RunDatabaseBackupResult = {
    backupFile: string;
    sizeBytes: number;
    prunedCount: number;
};
export type GfsOptions = {
    enabled: boolean;
    hourlyCount: number;
    dailyCount: number;
    weeklyCount: number;
};
export type BackupIncludeFiles = {
    skills: boolean;
    projects: boolean;
    workspaces: boolean;
    storage: boolean;
    secrets: boolean;
    config: boolean;
};
export type RunFullBackupOptions = {
    connectionString: string;
    backupDir: string;
    filenamePrefix?: string;
    connectTimeoutSeconds?: number;
    compression?: boolean;
    includeFiles?: Partial<BackupIncludeFiles>;
    gfs?: GfsOptions;
    instanceRoot?: string;
    skillsDir?: string;
    projectsDir?: string;
    workspacesDir?: string;
    storageDir?: string;
    secretsDir?: string;
    configFile?: string;
};
export type RunFullBackupResult = {
    backupDir: string;
    dbFile: string;
    dbSizeBytes: number;
    filesSizeBytes: number;
    totalSizeBytes: number;
    prunedCount: number;
    includedDirs: string[];
};
export type RunDatabaseRestoreOptions = {
    connectionString: string;
    backupFile: string;
    connectTimeoutSeconds?: number;
};
export declare function runDatabaseBackup(opts: RunDatabaseBackupOptions): Promise<RunDatabaseBackupResult>;
export declare function runFullBackup(opts: RunFullBackupOptions): Promise<RunFullBackupResult>;
export declare function runDatabaseRestore(opts: RunDatabaseRestoreOptions): Promise<void>;
export declare function formatDatabaseBackupResult(result: RunDatabaseBackupResult): string;
export declare function formatFullBackupResult(result: RunFullBackupResult): string;
export declare function listFullBackups(backupDir: string, filenamePrefix?: string): Array<{
    name: string;
    path: string;
    createdAt: Date;
    sizeBytes: number;
}>;
//# sourceMappingURL=backup-lib.d.ts.map