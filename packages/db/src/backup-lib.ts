import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import postgres from "postgres";

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
  // Paths to instance directories
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

type SequenceDefinition = {
  sequence_schema: string;
  sequence_name: string;
  data_type: string;
  start_value: string;
  minimum_value: string;
  maximum_value: string;
  increment: string;
  cycle_option: "YES" | "NO";
  owner_schema: string | null;
  owner_table: string | null;
  owner_column: string | null;
};

type TableDefinition = {
  schema_name: string;
  tablename: string;
};

const DRIZZLE_SCHEMA = "drizzle";
const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";

const STATEMENT_BREAKPOINT = "-- paperclip statement breakpoint 69f6f3f1-42fd-46a6-bf17-d1d85f8f3900";

function sanitizeRestoreErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const firstLine = typeof record.message === "string"
      ? record.message.split(/\r?\n/, 1)[0]?.trim()
      : "";
    const detail = typeof record.detail === "string" ? record.detail.trim() : "";
    const severity = typeof record.severity === "string" ? record.severity.trim() : "";
    const message = firstLine || detail || (error instanceof Error ? error.message : String(error));
    return severity ? `${severity}: ${message}` : message;
  }
  return error instanceof Error ? error.message : String(error);
}

function timestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function pruneOldBackups(backupDir: string, retentionDays: number, filenamePrefix: string): number {
  if (!existsSync(backupDir)) return 0;
  const safeRetention = Math.max(1, Math.trunc(retentionDays));
  const cutoff = Date.now() - safeRetention * 24 * 60 * 60 * 1000;
  let pruned = 0;

  for (const name of readdirSync(backupDir)) {
    if (!name.startsWith(`${filenamePrefix}-`)) continue;
    if (!name.endsWith(".sql") && !name.endsWith(".sql.gz")) continue;
    const fullPath = resolve(backupDir, name);
    const stat = statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      unlinkSync(fullPath);
      pruned++;
    }
  }

  return pruned;
}

function parseBackupTimestamp(name: string, prefix: string): number | null {
  // Matches: prefix-YYYYMMDD-HHMMSS (dir or file)
  const re = new RegExp(`^${prefix}-full-(\\d{4})(\\d{2})(\\d{2})-(\\d{2})(\\d{2})(\\d{2})$`);
  const m = name.match(re);
  if (!m) return null;
  const [, year, month, day, hour, min, sec] = m;
  return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`).getTime();
}

function getIsoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayOfWeek = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function pruneFullBackupsGfs(backupDir: string, filenamePrefix: string, gfs: GfsOptions): number {
  if (!existsSync(backupDir)) return 0;

  type Entry = { name: string; fullPath: string; ts: number };
  const entries: Entry[] = [];

  for (const name of readdirSync(backupDir)) {
    const ts = parseBackupTimestamp(name, filenamePrefix);
    if (ts === null) continue;
    entries.push({ name, fullPath: resolve(backupDir, name), ts });
  }

  if (entries.length === 0) return 0;

  // Sort newest first
  entries.sort((a, b) => b.ts - a.ts);

  const now = Date.now();
  const toKeep = new Set<string>();

  // Hourly tier: keep all within last hourlyCount hours
  const hourlyWindowMs = gfs.hourlyCount * 60 * 60 * 1000;
  for (const e of entries) {
    if (now - e.ts <= hourlyWindowMs) toKeep.add(e.name);
  }

  // Daily tier: keep 1 per day for last dailyCount days
  const dailyWindowMs = gfs.dailyCount * 24 * 60 * 60 * 1000;
  const seenDays = new Set<string>();
  for (const e of entries) {
    if (now - e.ts > dailyWindowMs) continue;
    const dayKey = new Date(e.ts).toISOString().slice(0, 10);
    if (!seenDays.has(dayKey)) {
      seenDays.add(dayKey);
      toKeep.add(e.name);
    }
  }

  // Weekly tier: keep 1 per week for last weeklyCount weeks
  const weeklyWindowMs = gfs.weeklyCount * 7 * 24 * 60 * 60 * 1000;
  const seenWeeks = new Set<string>();
  for (const e of entries) {
    if (now - e.ts > weeklyWindowMs) continue;
    const weekKey = getIsoWeekKey(new Date(e.ts));
    if (!seenWeeks.has(weekKey)) {
      seenWeeks.add(weekKey);
      toKeep.add(e.name);
    }
  }

  // Delete everything not in toKeep
  let pruned = 0;
  for (const e of entries) {
    if (toKeep.has(e.name)) continue;
    try {
      const stat = statSync(e.fullPath);
      if (stat.isDirectory()) {
        rmSync(e.fullPath, { recursive: true, force: true });
      } else {
        unlinkSync(e.fullPath);
      }
      pruned++;
    } catch {
      // ignore prune errors
    }
  }

  return pruned;
}

async function compressFileGzip(inputPath: string, outputPath: string): Promise<void> {
  await pipeline(
    createReadStream(inputPath),
    createGzip({ level: 6 }),
    createWriteStream(outputPath),
  );
  unlinkSync(inputPath);
}

async function copyDirIfExists(src: string, dest: string): Promise<number> {
  if (!src || !existsSync(src)) return 0;
  const entries = readdirSync(src);
  if (entries.length === 0) return 0;
  await cp(src, dest, { recursive: true });
  // Return approximate size
  try {
    return statSync(dest).size;
  } catch {
    return 0;
  }
}

function dirSizeSync(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const child = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += dirSizeSync(child);
    } else {
      try { total += statSync(child).size; } catch { /* ignore */ }
    }
  }
  return total;
}

function formatBackupSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes}B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)}K`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)}M`;
}

function formatSqlLiteral(value: string): string {
  const sanitized = value.replace(/\u0000/g, "");
  let tag = "$paperclip$";
  while (sanitized.includes(tag)) {
    tag = `$paperclip_${Math.random().toString(36).slice(2, 8)}$`;
  }
  return `${tag}${sanitized}${tag}`;
}

function normalizeTableNameSet(values: string[] | undefined): Set<string> {
  return new Set(
    (values ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

function normalizeNullifyColumnMap(values: Record<string, string[]> | undefined): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  if (!values) return out;
  for (const [tableName, columns] of Object.entries(values)) {
    const normalizedTable = tableName.trim();
    if (normalizedTable.length === 0) continue;
    const normalizedColumns = new Set(
      columns
        .map((column) => column.trim())
        .filter((column) => column.length > 0),
    );
    if (normalizedColumns.size > 0) {
      out.set(normalizedTable, normalizedColumns);
    }
  }
  return out;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function quoteQualifiedName(schemaName: string, objectName: string): string {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(objectName)}`;
}

function tableKey(schemaName: string, tableName: string): string {
  return `${schemaName}.${tableName}`;
}

export async function runDatabaseBackup(opts: RunDatabaseBackupOptions): Promise<RunDatabaseBackupResult> {
  const filenamePrefix = opts.filenamePrefix ?? "paperclip";
  const retentionDays = Math.max(1, Math.trunc(opts.retentionDays));
  const connectTimeout = Math.max(1, Math.trunc(opts.connectTimeoutSeconds ?? 5));
  const includeMigrationJournal = opts.includeMigrationJournal === true;
  const excludedTableNames = normalizeTableNameSet(opts.excludeTables);
  const nullifiedColumnsByTable = normalizeNullifyColumnMap(opts.nullifyColumns);
  const sql = postgres(opts.connectionString, { max: 1, connect_timeout: connectTimeout });

  try {
    await sql`SELECT 1`;

    const lines: string[] = [];
    const emit = (line: string) => lines.push(line);
    const emitStatement = (statement: string) => {
      emit(statement);
      emit(STATEMENT_BREAKPOINT);
    };
    const emitStatementBoundary = () => {
      emit(STATEMENT_BREAKPOINT);
    };

    emit("-- Paperclip database backup");
    emit(`-- Created: ${new Date().toISOString()}`);
    emit("");
    emitStatement("BEGIN;");
    emitStatement("SET LOCAL session_replication_role = replica;");
    emitStatement("SET LOCAL client_min_messages = warning;");
    emit("");

    const allTables = await sql<TableDefinition[]>`
      SELECT table_schema AS schema_name, table_name AS tablename
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND (
          table_schema = 'public'
          OR (${includeMigrationJournal}::boolean AND table_schema = ${DRIZZLE_SCHEMA} AND table_name = ${DRIZZLE_MIGRATIONS_TABLE})
        )
      ORDER BY table_schema, table_name
    `;
    const tables = allTables;
    const includedTableNames = new Set(tables.map(({ schema_name, tablename }) => tableKey(schema_name, tablename)));

    // Get all enums
    const enums = await sql<{ typname: string; labels: string[] }[]>`
      SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `;

    for (const e of enums) {
      const labels = e.labels.map((l) => `'${l.replace(/'/g, "''")}'`).join(", ");
      emitStatement(`CREATE TYPE "public"."${e.typname}" AS ENUM (${labels});`);
    }
    if (enums.length > 0) emit("");

    const allSequences = await sql<SequenceDefinition[]>`
      SELECT
        s.sequence_schema,
        s.sequence_name,
        s.data_type,
        s.start_value,
        s.minimum_value,
        s.maximum_value,
        s.increment,
        s.cycle_option,
        tblns.nspname AS owner_schema,
        tbl.relname AS owner_table,
        attr.attname AS owner_column
      FROM information_schema.sequences s
      JOIN pg_class seq ON seq.relname = s.sequence_name
      JOIN pg_namespace n ON n.oid = seq.relnamespace AND n.nspname = s.sequence_schema
      LEFT JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a'
      LEFT JOIN pg_class tbl ON tbl.oid = dep.refobjid
      LEFT JOIN pg_namespace tblns ON tblns.oid = tbl.relnamespace
      LEFT JOIN pg_attribute attr ON attr.attrelid = tbl.oid AND attr.attnum = dep.refobjsubid
      WHERE s.sequence_schema = 'public'
         OR (${includeMigrationJournal}::boolean AND s.sequence_schema = ${DRIZZLE_SCHEMA})
      ORDER BY s.sequence_schema, s.sequence_name
    `;
    const sequences = allSequences.filter(
      (seq) => !seq.owner_table || includedTableNames.has(tableKey(seq.owner_schema ?? "public", seq.owner_table)),
    );

    const schemas = new Set<string>();
    for (const table of tables) schemas.add(table.schema_name);
    for (const seq of sequences) schemas.add(seq.sequence_schema);
    const extraSchemas = [...schemas].filter((schemaName) => schemaName !== "public");
    if (extraSchemas.length > 0) {
      emit("-- Schemas");
      for (const schemaName of extraSchemas) {
        emitStatement(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schemaName)};`);
      }
      emit("");
    }

    if (sequences.length > 0) {
      emit("-- Sequences");
      for (const seq of sequences) {
        const qualifiedSequenceName = quoteQualifiedName(seq.sequence_schema, seq.sequence_name);
        emitStatement(`DROP SEQUENCE IF EXISTS ${qualifiedSequenceName} CASCADE;`);
        emitStatement(
          `CREATE SEQUENCE ${qualifiedSequenceName} AS ${seq.data_type} INCREMENT BY ${seq.increment} MINVALUE ${seq.minimum_value} MAXVALUE ${seq.maximum_value} START WITH ${seq.start_value}${seq.cycle_option === "YES" ? " CYCLE" : " NO CYCLE"};`,
        );
      }
      emit("");
    }

    // Get full CREATE TABLE DDL via column info
    for (const { schema_name, tablename } of tables) {
      const qualifiedTableName = quoteQualifiedName(schema_name, tablename);
      const columns = await sql<{
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        character_maximum_length: number | null;
        numeric_precision: number | null;
        numeric_scale: number | null;
      }[]>`
        SELECT column_name, data_type, udt_name, is_nullable, column_default,
               character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = ${schema_name} AND table_name = ${tablename}
        ORDER BY ordinal_position
      `;

      emit(`-- Table: ${schema_name}.${tablename}`);
      emitStatement(`DROP TABLE IF EXISTS ${qualifiedTableName} CASCADE;`);

      const colDefs: string[] = [];
      for (const col of columns) {
        let typeStr: string;
        if (col.data_type === "USER-DEFINED") {
          typeStr = `"${col.udt_name}"`;
        } else if (col.data_type === "ARRAY") {
          typeStr = `${col.udt_name.replace(/^_/, "")}[]`;
        } else if (col.data_type === "character varying") {
          typeStr = col.character_maximum_length
            ? `varchar(${col.character_maximum_length})`
            : "varchar";
        } else if (col.data_type === "numeric" && col.numeric_precision != null) {
          typeStr =
            col.numeric_scale != null
              ? `numeric(${col.numeric_precision}, ${col.numeric_scale})`
              : `numeric(${col.numeric_precision})`;
        } else {
          typeStr = col.data_type;
        }

        let def = `  "${col.column_name}" ${typeStr}`;
        if (col.column_default != null) def += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === "NO") def += " NOT NULL";
        colDefs.push(def);
      }

      // Primary key
      const pk = await sql<{ constraint_name: string; column_names: string[] }[]>`
        SELECT c.conname AS constraint_name,
               array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)) AS column_names
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = ${schema_name} AND t.relname = ${tablename} AND c.contype = 'p'
        GROUP BY c.conname
      `;
      for (const p of pk) {
        const cols = p.column_names.map((c) => `"${c}"`).join(", ");
        colDefs.push(`  CONSTRAINT "${p.constraint_name}" PRIMARY KEY (${cols})`);
      }

      emit(`CREATE TABLE ${qualifiedTableName} (`);
      emit(colDefs.join(",\n"));
      emit(");");
      emitStatementBoundary();
      emit("");
    }

    const ownedSequences = sequences.filter((seq) => seq.owner_table && seq.owner_column);
    if (ownedSequences.length > 0) {
      emit("-- Sequence ownership");
      for (const seq of ownedSequences) {
        emitStatement(
          `ALTER SEQUENCE ${quoteQualifiedName(seq.sequence_schema, seq.sequence_name)} OWNED BY ${quoteQualifiedName(seq.owner_schema ?? "public", seq.owner_table!)}.${quoteIdentifier(seq.owner_column!)};`,
        );
      }
      emit("");
    }

    // Foreign keys (after all tables created)
    const allForeignKeys = await sql<{
      constraint_name: string;
      source_schema: string;
      source_table: string;
      source_columns: string[];
      target_schema: string;
      target_table: string;
      target_columns: string[];
      update_rule: string;
      delete_rule: string;
    }[]>`
      SELECT
        c.conname AS constraint_name,
        srcn.nspname AS source_schema,
        src.relname AS source_table,
        array_agg(sa.attname ORDER BY array_position(c.conkey, sa.attnum)) AS source_columns,
        tgtn.nspname AS target_schema,
        tgt.relname AS target_table,
        array_agg(ta.attname ORDER BY array_position(c.confkey, ta.attnum)) AS target_columns,
        CASE c.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS update_rule,
        CASE c.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' END AS delete_rule
      FROM pg_constraint c
      JOIN pg_class src ON src.oid = c.conrelid
      JOIN pg_namespace srcn ON srcn.oid = src.relnamespace
      JOIN pg_class tgt ON tgt.oid = c.confrelid
      JOIN pg_namespace tgtn ON tgtn.oid = tgt.relnamespace
      JOIN pg_attribute sa ON sa.attrelid = src.oid AND sa.attnum = ANY(c.conkey)
      JOIN pg_attribute ta ON ta.attrelid = tgt.oid AND ta.attnum = ANY(c.confkey)
      WHERE c.contype = 'f' AND (
        srcn.nspname = 'public'
        OR (${includeMigrationJournal}::boolean AND srcn.nspname = ${DRIZZLE_SCHEMA})
      )
      GROUP BY c.conname, srcn.nspname, src.relname, tgtn.nspname, tgt.relname, c.confupdtype, c.confdeltype
      ORDER BY srcn.nspname, src.relname, c.conname
    `;
    const fks = allForeignKeys.filter(
      (fk) => includedTableNames.has(tableKey(fk.source_schema, fk.source_table))
        && includedTableNames.has(tableKey(fk.target_schema, fk.target_table)),
    );

    if (fks.length > 0) {
      emit("-- Foreign keys");
      for (const fk of fks) {
        const srcCols = fk.source_columns.map((c) => `"${c}"`).join(", ");
        const tgtCols = fk.target_columns.map((c) => `"${c}"`).join(", ");
        emitStatement(
          `ALTER TABLE ${quoteQualifiedName(fk.source_schema, fk.source_table)} ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY (${srcCols}) REFERENCES ${quoteQualifiedName(fk.target_schema, fk.target_table)} (${tgtCols}) ON UPDATE ${fk.update_rule} ON DELETE ${fk.delete_rule};`,
        );
      }
      emit("");
    }

    // Unique constraints
    const allUniqueConstraints = await sql<{
      constraint_name: string;
      schema_name: string;
      tablename: string;
      column_names: string[];
    }[]>`
      SELECT c.conname AS constraint_name,
             n.nspname AS schema_name,
             t.relname AS tablename,
             array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)) AS column_names
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
      WHERE c.contype = 'u' AND (
        n.nspname = 'public'
        OR (${includeMigrationJournal}::boolean AND n.nspname = ${DRIZZLE_SCHEMA})
      )
      GROUP BY c.conname, n.nspname, t.relname
      ORDER BY n.nspname, t.relname, c.conname
    `;
    const uniques = allUniqueConstraints.filter((entry) => includedTableNames.has(tableKey(entry.schema_name, entry.tablename)));

    if (uniques.length > 0) {
      emit("-- Unique constraints");
      for (const u of uniques) {
        const cols = u.column_names.map((c) => `"${c}"`).join(", ");
        emitStatement(`ALTER TABLE ${quoteQualifiedName(u.schema_name, u.tablename)} ADD CONSTRAINT "${u.constraint_name}" UNIQUE (${cols});`);
      }
      emit("");
    }

    // Indexes (non-primary, non-unique-constraint)
    const allIndexes = await sql<{ schema_name: string; tablename: string; indexdef: string }[]>`
      SELECT schemaname AS schema_name, tablename, indexdef
      FROM pg_indexes
      WHERE (
          schemaname = 'public'
          OR (${includeMigrationJournal}::boolean AND schemaname = ${DRIZZLE_SCHEMA})
        )
        AND indexname NOT IN (
          SELECT conname FROM pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          WHERE n.nspname = pg_indexes.schemaname
        )
      ORDER BY schemaname, tablename, indexname
    `;
    const indexes = allIndexes.filter((entry) => includedTableNames.has(tableKey(entry.schema_name, entry.tablename)));

    if (indexes.length > 0) {
      emit("-- Indexes");
      for (const idx of indexes) {
        emitStatement(`${idx.indexdef};`);
      }
      emit("");
    }

    // Dump data for each table
    for (const { schema_name, tablename } of tables) {
      const qualifiedTableName = quoteQualifiedName(schema_name, tablename);
      const count = await sql.unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${qualifiedTableName}`);
      if (excludedTableNames.has(tablename) || (count[0]?.n ?? 0) === 0) continue;

      // Get column info for this table
      const cols = await sql<{ column_name: string; data_type: string }[]>`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = ${schema_name} AND table_name = ${tablename}
        ORDER BY ordinal_position
      `;
      const colNames = cols.map((c) => `"${c.column_name}"`).join(", ");

      emit(`-- Data for: ${schema_name}.${tablename} (${count[0]!.n} rows)`);

      const rows = await sql.unsafe(`SELECT * FROM ${qualifiedTableName}`).values();
      const nullifiedColumns = nullifiedColumnsByTable.get(tablename) ?? new Set<string>();
      for (const row of rows) {
        const values = row.map((rawValue: unknown, index) => {
          const columnName = cols[index]?.column_name;
          const val = columnName && nullifiedColumns.has(columnName) ? null : rawValue;
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "boolean") return val ? "true" : "false";
          if (typeof val === "number") return String(val);
          if (val instanceof Date) return formatSqlLiteral(val.toISOString());
          if (typeof val === "object") return formatSqlLiteral(JSON.stringify(val));
          return formatSqlLiteral(String(val));
        });
        emitStatement(`INSERT INTO ${qualifiedTableName} (${colNames}) VALUES (${values.join(", ")});`);
      }
      emit("");
    }

    // Sequence values
    if (sequences.length > 0) {
      emit("-- Sequence values");
      for (const seq of sequences) {
        const qualifiedSequenceName = quoteQualifiedName(seq.sequence_schema, seq.sequence_name);
        const val = await sql.unsafe<{ last_value: string; is_called: boolean }[]>(
          `SELECT last_value::text, is_called FROM ${qualifiedSequenceName}`,
        );
        const skipSequenceValue =
          seq.owner_table !== null
            && excludedTableNames.has(seq.owner_table);
        if (val[0] && !skipSequenceValue) {
          emitStatement(`SELECT setval('${qualifiedSequenceName.replaceAll("'", "''")}', ${val[0].last_value}, ${val[0].is_called ? "true" : "false"});`);
        }
      }
      emit("");
    }

    emitStatement("COMMIT;");
    emit("");

    // Write the backup file (with optional gzip compression)
    mkdirSync(opts.backupDir, { recursive: true });
    const useCompression = opts.compression !== false;
    const sqlFile = resolve(opts.backupDir, `${filenamePrefix}-${timestamp()}.sql`);
    await writeFile(sqlFile, lines.join("\n"), "utf8");

    let backupFile = sqlFile;
    if (useCompression) {
      const gzFile = `${sqlFile}.gz`;
      await compressFileGzip(sqlFile, gzFile);
      backupFile = gzFile;
    }

    const sizeBytes = statSync(backupFile).size;
    const prunedCount = pruneOldBackups(opts.backupDir, retentionDays, filenamePrefix);

    return {
      backupFile,
      sizeBytes,
      prunedCount,
    };
  } finally {
    await sql.end();
  }
}

export async function runFullBackup(opts: RunFullBackupOptions): Promise<RunFullBackupResult> {
  const filenamePrefix = opts.filenamePrefix ?? "paperclip";
  const useCompression = opts.compression !== false;
  const include: BackupIncludeFiles = {
    skills: opts.includeFiles?.skills !== false,
    projects: opts.includeFiles?.projects !== false,
    workspaces: opts.includeFiles?.workspaces !== false,
    storage: opts.includeFiles?.storage !== false,
    secrets: opts.includeFiles?.secrets !== false,
    config: opts.includeFiles?.config !== false,
  };
  const gfs: GfsOptions = opts.gfs ?? { enabled: true, hourlyCount: 24, dailyCount: 7, weeklyCount: 4 };

  const ts = timestamp();
  const backupEntryName = `${filenamePrefix}-full-${ts}`;
  const backupEntryPath = resolve(opts.backupDir, backupEntryName);

  mkdirSync(backupEntryPath, { recursive: true });

  // 1. DB dump
  const dbResult = await runDatabaseBackup({
    connectionString: opts.connectionString,
    backupDir: backupEntryPath,
    retentionDays: 9999, // No pruning inside the entry — GFS handles it at the top level
    filenamePrefix: "db",
    connectTimeoutSeconds: opts.connectTimeoutSeconds,
    compression: useCompression,
  });

  const includedDirs: string[] = ["db"];

  // 2. Copy instance file directories
  const instanceRoot = opts.instanceRoot ?? "";

  const dirsToInclude: Array<{ key: keyof BackupIncludeFiles; src: string | undefined; dest: string }> = [
    { key: "skills", src: opts.skillsDir, dest: resolve(backupEntryPath, "skills") },
    { key: "projects", src: opts.projectsDir, dest: resolve(backupEntryPath, "projects") },
    { key: "workspaces", src: opts.workspacesDir, dest: resolve(backupEntryPath, "workspaces") },
    { key: "storage", src: opts.storageDir, dest: resolve(backupEntryPath, "storage") },
    { key: "secrets", src: opts.secretsDir, dest: resolve(backupEntryPath, "secrets") },
  ];

  let filesSizeBytes = 0;
  for (const { key, src, dest } of dirsToInclude) {
    if (!include[key] || !src) continue;
    await copyDirIfExists(src, dest);
    const sz = dirSizeSync(dest);
    if (sz > 0) {
      filesSizeBytes += sz;
      includedDirs.push(key);
    }
  }

  // 3. Copy config.json
  if (include.config && opts.configFile && existsSync(opts.configFile)) {
    const destConfig = resolve(backupEntryPath, "config.json");
    await cp(opts.configFile, destConfig);
    includedDirs.push("config.json");
  }

  // 4. Write manifest
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    instanceRoot,
    compression: useCompression,
    included: includedDirs,
    dbFile: useCompression ? "db.sql.gz" : "db.sql",
  };
  await writeFile(resolve(backupEntryPath, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  const totalSizeBytes = dbResult.sizeBytes + filesSizeBytes;

  // 5. GFS rotation — prune old full backups
  const prunedCount = gfs.enabled
    ? pruneFullBackupsGfs(opts.backupDir, filenamePrefix, gfs)
    : 0;

  return {
    backupDir: backupEntryPath,
    dbFile: dbResult.backupFile,
    dbSizeBytes: dbResult.sizeBytes,
    filesSizeBytes,
    totalSizeBytes,
    prunedCount,
    includedDirs,
  };
}

export async function runDatabaseRestore(opts: RunDatabaseRestoreOptions): Promise<void> {
  const connectTimeout = Math.max(1, Math.trunc(opts.connectTimeoutSeconds ?? 5));
  const sql = postgres(opts.connectionString, { max: 1, connect_timeout: connectTimeout });

  try {
    await sql`SELECT 1`;
    const contents = await readFile(opts.backupFile, "utf8");
    const statements = contents
      .split(STATEMENT_BREAKPOINT)
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await sql.unsafe(statement).execute();
    }
  } catch (error) {
    const statementPreview = typeof error === "object" && error !== null && typeof (error as Record<string, unknown>).query === "string"
      ? String((error as Record<string, unknown>).query)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.startsWith("--"))
      : null;
    throw new Error(
      `Failed to restore ${basename(opts.backupFile)}: ${sanitizeRestoreErrorMessage(error)}${statementPreview ? ` [statement: ${statementPreview.slice(0, 120)}]` : ""}`,
    );
  } finally {
    await sql.end();
  }
}

export function formatDatabaseBackupResult(result: RunDatabaseBackupResult): string {
  const size = formatBackupSize(result.sizeBytes);
  const pruned = result.prunedCount > 0 ? `; pruned ${result.prunedCount} old backup(s)` : "";
  return `${result.backupFile} (${size}${pruned})`;
}

export function formatFullBackupResult(result: RunFullBackupResult): string {
  const dbSize = formatBackupSize(result.dbSizeBytes);
  const filesSize = formatBackupSize(result.filesSizeBytes);
  const totalSize = formatBackupSize(result.totalSizeBytes);
  const pruned = result.prunedCount > 0 ? `; pruned ${result.prunedCount} old backup(s)` : "";
  return `${result.backupDir} (db: ${dbSize}, files: ${filesSize}, total: ${totalSize}${pruned})`;
}

export function listFullBackups(backupDir: string, filenamePrefix = "paperclip"): Array<{ name: string; path: string; createdAt: Date; sizeBytes: number }> {
  if (!existsSync(backupDir)) return [];
  const results: Array<{ name: string; path: string; createdAt: Date; sizeBytes: number }> = [];
  for (const name of readdirSync(backupDir)) {
    const ts = parseBackupTimestamp(name, filenamePrefix);
    if (ts === null) continue;
    const fullPath = resolve(backupDir, name);
    try {
      const sizeBytes = dirSizeSync(fullPath);
      results.push({ name, path: fullPath, createdAt: new Date(ts), sizeBytes });
    } catch { /* ignore */ }
  }
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
