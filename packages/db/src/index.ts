export {
  createDb,
  getPostgresDataDirectory,
  ensurePostgresDatabase,
  inspectMigrations,
  applyPendingMigrations,
  reconcilePendingMigrationHistory,
  type MigrationState,
  type MigrationHistoryReconcileResult,
  migratePostgresIfEmpty,
  type MigrationBootstrapResult,
  type Db,
} from "./client.js";
export {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
  type EmbeddedPostgresTestDatabase,
  type EmbeddedPostgresTestSupport,
} from "./test-embedded-postgres.js";
export {
  runDatabaseBackup,
  runFullBackup,
  runDatabaseRestore,
  formatDatabaseBackupResult,
  listFullBackups,
  type RunDatabaseBackupOptions,
  type RunDatabaseBackupResult,
  type RunFullBackupOptions,
  type RunFullBackupResult,
  type RunDatabaseRestoreOptions,
  type GfsOptions,
  type BackupIncludeFiles,
} from "./backup-lib.js";
export {
  createEmbeddedPostgresLogBuffer,
  formatEmbeddedPostgresError,
} from "./embedded-postgres-error.js";
export * from "./schema/index.js";
