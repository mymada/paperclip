import { randomUUID } from "node:crypto";
import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginEvent,
  type PluginHealthDiagnostics,
  type PluginJobContext,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import type { Issue, IssueComment } from "@paperclipai/shared";
import {
  CAPTURE_COMMENT_KEYWORDS,
  CATEGORIES,
  CLASSIFICATION_RULES,
  DATA_KEYS,
  DEFAULT_CATEGORY,
  DEFAULT_DOC_TYPE,
  JOB_KEYS,
  LEGACY_DOMAIN_TO_CATEGORY,
  LEGACY_DOMAIN_TO_DOCTYPE,
  PLUGIN_ID,
  STATE_KEYS,
  TAXONOMY,
  TOOL_NAMES,
  type MemoryCategory,
  type MemoryStatus,
} from "./constants.js";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  docType: string;
  docTypeLabel: string;
  title: string;
  summary: string;
  status: MemoryStatus;
  version: number;
  sourceIssueId: string;
  sourceIssueTitle: string;
  sourceIssueIdentifier: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  sources: Array<{ issueId?: string; identifier?: string; title: string }>;
  // Backward compat: old entries may carry a "domain" field
  domain?: string;
}

interface MemoryDocument extends MemoryEntry {
  body: string;
  changelog: Array<{ at: string; summary: string; version: number }>;
}

// ---------------------------------------------------------------------------
// Synthesis via agent session
// ---------------------------------------------------------------------------

async function synthesizeWithAgent(
  ctx: PluginContext,
  agentId: string,
  companyId: string,
  issueIdentifier: string,
  issueTitle: string,
  issueDescription: string,
  issueStatus: string,
): Promise<string | null> {
  const prompt =
    `Tu es un assistant de mémoire d'entreprise. À partir du ticket ci-dessous, génère un document de mémoire structuré en Markdown.\n\n` +
    `Le document doit :\n` +
    `- Commencer par un résumé exécutif (2-3 phrases)\n` +
    `- Extraire les décisions, actions, enseignements ou informations clés\n` +
    `- Être concis et factuel (300-600 mots maximum)\n` +
    `- Utiliser des titres Markdown (##, ###)\n` +
    `- Ne pas inclure les métadonnées (identifiant, date, statut) — celles-ci seront ajoutées automatiquement\n\n` +
    `---\n` +
    `Ticket : ${issueIdentifier}\n` +
    `Titre : ${issueTitle}\n` +
    `Statut : ${issueStatus}\n\n` +
    `Description :\n${issueDescription || "(aucune description)"}\n` +
    `---\n\n` +
    `Génère uniquement le contenu Markdown du document, sans préambule.`;

  try {
    const session = await ctx.agents.sessions.create(agentId, companyId, {
      reason: "Corporate Memory synthesis",
    });

    const chunks: string[] = [];
    await ctx.agents.sessions.sendMessage(session.sessionId, companyId, {
      prompt,
      reason: "Synthesize corporate memory document",
      onEvent: (event) => {
        if (event.eventType === "chunk" && event.stream === "stdout" && event.message) {
          chunks.push(event.message);
        }
      },
    });

    await ctx.agents.sessions.close(session.sessionId, companyId);

    const result = chunks.join("").trim();
    return result || null;
  } catch (err) {
    ctx.logger.warn(`${PLUGIN_ID}: synthesis failed, falling back to raw capture`, {
      err: String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyDocument(
  title: string,
  desc: string,
): { category: MemoryCategory; docType: string; docTypeLabel: string } {
  const text = `${title} ${desc}`.toLowerCase();

  for (const [category, docType, keywords] of CLASSIFICATION_RULES) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        const cat = category as MemoryCategory;
        const label = TAXONOMY[cat]?.types[docType] ?? docType;
        return { category: cat, docType, docTypeLabel: label };
      }
    }
  }

  const defaultLabel = TAXONOMY[DEFAULT_CATEGORY]?.types[DEFAULT_DOC_TYPE] ?? DEFAULT_DOC_TYPE;
  return { category: DEFAULT_CATEGORY, docType: DEFAULT_DOC_TYPE, docTypeLabel: defaultLabel };
}

function hasCapturableKeyword(body: string): boolean {
  for (const kw of CAPTURE_COMMENT_KEYWORDS) {
    if (body.includes(kw)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Backward-compat normalisation
// Entries stored before the taxonomy migration have a `domain` field.
// On read we derive category/docType from it so the UI can render them.
// ---------------------------------------------------------------------------

function normaliseLegacyEntry(raw: Record<string, unknown>): MemoryEntry {
  // Already migrated
  if (typeof raw["category"] === "string") {
    const entry = raw as unknown as MemoryEntry;
    // Ensure sources field exists
    if (!entry.sources) {
      entry.sources = [];
    }
    return entry;
  }

  const legacyDomain = typeof raw["domain"] === "string" ? raw["domain"] : "governance";
  const category: MemoryCategory =
    (LEGACY_DOMAIN_TO_CATEGORY[legacyDomain] as MemoryCategory | undefined) ?? DEFAULT_CATEGORY;
  const docType = LEGACY_DOMAIN_TO_DOCTYPE[legacyDomain] ?? DEFAULT_DOC_TYPE;
  const docTypeLabel = TAXONOMY[category]?.types[docType] ?? docType;

  return {
    ...(raw as Omit<MemoryEntry, "category" | "docType" | "docTypeLabel" | "status" | "sources">),
    category,
    docType,
    docTypeLabel,
    status: "validated" as MemoryStatus,
    sources: [],
  };
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

async function readIndex(ctx: PluginContext): Promise<MemoryEntry[]> {
  try {
    const raw = await ctx.state.get({ scopeKind: "instance", stateKey: STATE_KEYS.index });
    if (Array.isArray(raw)) {
      return (raw as Array<Record<string, unknown>>).map(normaliseLegacyEntry);
    }
    return [];
  } catch {
    return [];
  }
}

async function writeIndex(ctx: PluginContext, index: MemoryEntry[]): Promise<void> {
  await ctx.state.set({ scopeKind: "instance", stateKey: STATE_KEYS.index }, index);
}

async function readDocument(ctx: PluginContext, id: string): Promise<MemoryDocument | null> {
  try {
    const raw = await ctx.state.get({ scopeKind: "instance", stateKey: `${STATE_KEYS.docPrefix}${id}` });
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return normaliseLegacyEntry(raw as Record<string, unknown>) as MemoryDocument;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeDocument(ctx: PluginContext, doc: MemoryDocument): Promise<void> {
  await ctx.state.set(
    { scopeKind: "instance", stateKey: `${STATE_KEYS.docPrefix}${doc.id}` },
    doc,
  );
}

// ---------------------------------------------------------------------------
// Core upsert logic
// ---------------------------------------------------------------------------

interface UpsertInput {
  category: MemoryCategory;
  docType: string;
  docTypeLabel: string;
  title: string;
  body: string;
  status?: MemoryStatus;
  tags?: string[];
  sourceIssueId?: string;
  sourceIssueTitle?: string;
  sourceIssueIdentifier?: string;
  sources?: Array<{ issueId?: string; identifier?: string; title: string }>;
}

async function upsertMemoryDocument(
  ctx: PluginContext,
  input: UpsertInput,
): Promise<MemoryDocument> {
  const now = new Date().toISOString();
  const index = await readIndex(ctx);

  // Find existing entry by title match (case-insensitive) within the same category
  const existingIdx = index.findIndex(
    (e) =>
      e.category === input.category && e.title.toLowerCase() === input.title.toLowerCase(),
  );

  if (existingIdx >= 0) {
    const existing = index[existingIdx]!;
    const existingDoc = await readDocument(ctx, existing.id);
    const prevDoc = existingDoc ?? ({} as Partial<MemoryDocument>);

    // Merge sources: combine existing sources with new ones, deduplicate by issueId or title
    const mergedSources = [...(existing.sources ?? [])];
    if (input.sources && input.sources.length > 0) {
      for (const newSrc of input.sources) {
        const isDuplicate = mergedSources.some(
          (existing) =>
            (newSrc.issueId && existing.issueId === newSrc.issueId) ||
            existing.title === newSrc.title
        );
        if (!isDuplicate) {
          mergedSources.push(newSrc);
        }
      }
    }

    const summary = input.body.slice(0, 300);
    const updatedEntry: MemoryEntry = {
      ...existing,
      docType: input.docType,
      docTypeLabel: input.docTypeLabel,
      summary,
      status: input.status ?? existing.status ?? "draft",
      tags: input.tags ?? existing.tags,
      sourceIssueId: input.sourceIssueId ?? existing.sourceIssueId,
      sourceIssueTitle: input.sourceIssueTitle ?? existing.sourceIssueTitle,
      sourceIssueIdentifier: input.sourceIssueIdentifier ?? existing.sourceIssueIdentifier,
      sources: mergedSources,
      updatedAt: now,
      version: existing.version + 1,
    };

    const newVersion = updatedEntry.version;
    const updatedDoc: MemoryDocument = {
      ...updatedEntry,
      body: input.body,
      changelog: [
        ...(prevDoc.changelog ?? []),
        { at: now, summary: `Version ${newVersion} update`, version: newVersion },
      ],
    };

    index[existingIdx] = updatedEntry;
    await writeIndex(ctx, index);
    await writeDocument(ctx, updatedDoc);
    return updatedDoc;
  }

  // Create new
  const id = randomUUID();
  const summary = input.body.slice(0, 300);
  const newEntry: MemoryEntry = {
    id,
    category: input.category,
    docType: input.docType,
    docTypeLabel: input.docTypeLabel,
    title: input.title,
    summary,
    status: input.status ?? "draft",
    sourceIssueId: input.sourceIssueId ?? "",
    sourceIssueTitle: input.sourceIssueTitle ?? "",
    sourceIssueIdentifier: input.sourceIssueIdentifier ?? "",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    sources: input.sources ?? [],
    version: 1,
  };

  const newDoc: MemoryDocument = {
    ...newEntry,
    body: input.body,
    changelog: [{ at: now, summary: "Initial capture", version: 1 }],
  };

  index.push(newEntry);
  await writeIndex(ctx, index);
  await writeDocument(ctx, newDoc);
  return newDoc;
}

// ---------------------------------------------------------------------------
// Search helper
// ---------------------------------------------------------------------------

function searchEntries(
  index: MemoryEntry[],
  query: string,
  category: string | undefined,
  docType: string | undefined,
  limit: number,
): MemoryEntry[] {
  const lower = query.toLowerCase();
  const filtered = index.filter((e) => {
    if (category && e.category !== category) return false;
    if (docType && e.docType !== docType) return false;
    return (
      e.title.toLowerCase().includes(lower) ||
      e.summary.toLowerCase().includes(lower) ||
      e.tags.some((t) => t.toLowerCase().includes(lower))
    );
  });
  return filtered.slice(0, Math.min(limit, 10));
}

// ---------------------------------------------------------------------------
// Event: issue status changed
// ---------------------------------------------------------------------------

interface IssueStatusChangedPayload {
  issueId?: string;
  status?: string;
  previousStatus?: string;
  companyId?: string;
}

async function handleIssueStatusChanged(
  ctx: PluginContext,
  event: PluginEvent,
): Promise<void> {
  const payload = event.payload as IssueStatusChangedPayload;
  const status = payload.status ?? "";
  if (status !== "done" && status !== "in_review") {
    return;
  }

  const issueId = payload.issueId ?? event.entityId ?? "";
  const companyId = payload.companyId ?? event.companyId;

  if (!issueId || !companyId) {
    ctx.logger.warn(`${PLUGIN_ID}: issue.status.changed missing issueId or companyId`, { event });
    return;
  }

  let issue: Issue | null = null;
  try {
    issue = await ctx.issues.get(issueId, companyId);
  } catch (err) {
    ctx.logger.warn(`${PLUGIN_ID}: could not fetch issue ${issueId}`, { err: String(err) });
    return;
  }

  if (!issue) return;

  const { category, docType, docTypeLabel } = classifyDocument(
    issue.title,
    issue.description ?? "",
  );
  const description = issue.description ?? "";
  const now = new Date().toISOString();
  const issueRef = issue.identifier ?? issueId;

  // Attempt synthesis if an agent is configured
  const config = await ctx.config.get();
  const synthesisAgentId = typeof config["synthesisAgentId"] === "string" ? config["synthesisAgentId"] : "";

  let synthesizedContent: string | null = null;
  if (synthesisAgentId) {
    synthesizedContent = await synthesizeWithAgent(
      ctx,
      synthesisAgentId,
      companyId,
      issueRef,
      issue.title,
      description,
      status,
    );
  }

  const body = synthesizedContent
    ? `## ${issue.title}\n\n` +
      `**Source:** ${issueRef} · **Statut:** ${status} · **Date:** ${now}\n\n` +
      synthesizedContent
    : `## ${issue.title}\n\n` +
      `**Source:** ${issueRef}\n` +
      `**Statut:** ${status}\n` +
      `**Date:** ${now}\n\n` +
      `### Description\n${description}\n`;

  const sources: Array<{ issueId: string; identifier: string; title: string }> = [
    { issueId: issue.id, identifier: issueRef, title: issue.title },
  ];

  try {
    await upsertMemoryDocument(ctx, {
      category,
      docType,
      docTypeLabel,
      title: issue.title,
      body,
      status: "validated",
      tags: [status, category, docType],
      sourceIssueId: issue.id,
      sourceIssueTitle: issue.title,
      sourceIssueIdentifier: issueRef,
      sources,
    });
    ctx.logger.info(
      `${PLUGIN_ID}: captured issue "${issue.title}" into ${category}/${docType}` +
        (synthesizedContent ? " (synthesized)" : " (raw)"),
    );
  } catch (err) {
    ctx.logger.error(`${PLUGIN_ID}: failed to capture issue ${issueId}`, { err: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Event: issue comment created
// ---------------------------------------------------------------------------

interface CommentCreatedPayload {
  commentId?: string;
  issueId?: string;
  companyId?: string;
}

async function handleCommentCreated(
  ctx: PluginContext,
  event: PluginEvent,
): Promise<void> {
  const payload = event.payload as CommentCreatedPayload;
  const issueId = payload.issueId ?? "";
  const commentId = payload.commentId ?? "";
  const companyId = payload.companyId ?? event.companyId;

  if (!issueId || !companyId) return;

  let comments: IssueComment[] = [];
  try {
    comments = await ctx.issues.listComments(issueId, companyId);
  } catch {
    return;
  }

  const comment = commentId
    ? comments.find((c) => c.id === commentId)
    : comments[comments.length - 1];

  if (!comment) return;
  if (!hasCapturableKeyword(comment.body)) return;

  let issue: Issue | null = null;
  try {
    issue = await ctx.issues.get(issueId, companyId);
  } catch {
    // Proceed without issue details
  }

  const { category, docType, docTypeLabel } = issue
    ? classifyDocument(issue.title, issue.description ?? "")
    : { category: DEFAULT_CATEGORY, docType: DEFAULT_DOC_TYPE, docTypeLabel: TAXONOMY[DEFAULT_CATEGORY]?.types[DEFAULT_DOC_TYPE] ?? DEFAULT_DOC_TYPE };

  const title = issue ? `Note: ${issue.title}` : `Note: issue ${issueId.slice(0, 8)}`;
  const issueRef = issue?.identifier ?? issueId;
  const now = new Date().toISOString();
  const body =
    `## ${title}\n\n` +
    `**Source:** ${issueRef}\n` +
    `**Capturé depuis un commentaire le :** ${now}\n\n` +
    `### Commentaire\n${comment.body}\n`;

  const sources: Array<{ issueId: string; identifier: string; title: string }> = [
    { issueId: issueId, identifier: issueRef, title: issue?.title ?? issueRef },
  ];

  try {
    await upsertMemoryDocument(ctx, {
      category,
      docType,
      docTypeLabel,
      title,
      body,
      status: "draft",
      tags: ["comment-capture", category, docType],
      sourceIssueId: issueId,
      sourceIssueTitle: issue?.title ?? "",
      sourceIssueIdentifier: issueRef,
      sources,
    });
    ctx.logger.info(`${PLUGIN_ID}: captured notable comment from issue ${issueId}`);
  } catch (err) {
    ctx.logger.error(`${PLUGIN_ID}: failed to capture comment`, { err: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function registerToolHandlers(ctx: PluginContext): Promise<void> {
  ctx.tools.register(
    TOOL_NAMES.search,
    {
      displayName: "Corporate Memory Search",
      description:
        "Search corporate memory entries by keyword. Optionally filter by category and/or docType.",
      parametersSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          docType: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
    async (params, _runCtx: ToolRunContext): Promise<ToolResult> => {
      const p = params as { query?: string; category?: string; docType?: string; limit?: number };
      const query = typeof p.query === "string" ? p.query : "";
      if (!query) {
        return { error: "query is required" };
      }
      const category =
        typeof p.category === "string" && p.category.length > 0 ? p.category : undefined;
      const docType =
        typeof p.docType === "string" && p.docType.length > 0 ? p.docType : undefined;
      const limit = typeof p.limit === "number" && p.limit > 0 ? p.limit : 10;

      const index = await readIndex(ctx);
      const results = searchEntries(index, query, category, docType, limit);

      return {
        content: `Found ${results.length} result(s) for "${query}"`,
        data: results,
      };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.get,
    {
      displayName: "Corporate Memory Get",
      description: "Retrieve a full memory document by ID.",
      parametersSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
    async (params, _runCtx: ToolRunContext): Promise<ToolResult> => {
      const p = params as { id?: string };
      const id = typeof p.id === "string" ? p.id : "";
      if (!id) {
        return { error: "id is required" };
      }

      const doc = await readDocument(ctx, id);
      if (!doc) {
        return { error: `No document found with id "${id}"` };
      }

      return {
        content: doc.body,
        data: doc,
      };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.list,
    {
      displayName: "Corporate Memory List",
      description:
        "List all corporate memory entries, optionally filtered by category and/or docType.",
      parametersSchema: {
        type: "object",
        properties: {
          category: { type: "string" },
          docType: { type: "string" },
        },
      },
    },
    async (params, _runCtx: ToolRunContext): Promise<ToolResult> => {
      const p = params as { category?: string; docType?: string };
      const category =
        typeof p.category === "string" && p.category.length > 0 ? p.category : undefined;
      const docType =
        typeof p.docType === "string" && p.docType.length > 0 ? p.docType : undefined;

      const index = await readIndex(ctx);
      const results = index.filter((e) => {
        if (category && e.category !== category) return false;
        if (docType && e.docType !== docType) return false;
        return true;
      });

      const label = [category, docType].filter(Boolean).join("/");
      return {
        content: `${results.length} memory entries${label ? ` in ${label}` : ""}`,
        data: results,
      };
    },
  );

  ctx.tools.register(
    TOOL_NAMES.upsert,
    {
      displayName: "Corporate Memory Upsert",
      description:
        "Create or update a corporate memory document. Provide category and docType from the taxonomy.",
      parametersSchema: {
        type: "object",
        properties: {
          category: { type: "string" },
          docType: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          status: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          sourceIssueId: { type: "string" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                issueId: { type: "string" },
                identifier: { type: "string" },
                title: { type: "string" },
              },
            },
          },
        },
        required: ["category", "title", "body"],
      },
    },
    async (params, _runCtx: ToolRunContext): Promise<ToolResult> => {
      const p = params as {
        category?: string;
        docType?: string;
        title?: string;
        body?: string;
        status?: string;
        tags?: string[];
        sourceIssueId?: string;
        sources?: Array<{ issueId?: string; identifier?: string; title?: string }>;
      };
      const categoryRaw = typeof p.category === "string" ? p.category.trim() : "";
      const title = typeof p.title === "string" ? p.title.trim() : "";
      const body = typeof p.body === "string" ? p.body : "";

      if (!categoryRaw || !title || !body) {
        return { error: "category, title, and body are required" };
      }

      const validCategory = (CATEGORIES as string[]).includes(categoryRaw)
        ? (categoryRaw as MemoryCategory)
        : DEFAULT_CATEGORY;

      const docTypeRaw = typeof p.docType === "string" ? p.docType.trim() : "";
      const availableTypes = Object.keys(TAXONOMY[validCategory]?.types ?? {});
      const docType =
        docTypeRaw && availableTypes.includes(docTypeRaw) ? docTypeRaw : DEFAULT_DOC_TYPE;
      const docTypeLabel = TAXONOMY[validCategory]?.types[docType] ?? docType;

      const statusRaw = typeof p.status === "string" ? p.status : "";
      const status: MemoryStatus =
        statusRaw === "validated" || statusRaw === "archived"
          ? statusRaw
          : "draft";

      const tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === "string") : [];
      const sourceIssueId = typeof p.sourceIssueId === "string" ? p.sourceIssueId : undefined;

      // Extract and validate sources
      const sources: Array<{ issueId?: string; identifier?: string; title: string }> = [];
      if (Array.isArray(p.sources)) {
        for (const src of p.sources) {
          if (src && typeof src === "object") {
            const title = typeof src.title === "string" ? src.title : "";
            if (title) {
              sources.push({
                issueId: typeof src.issueId === "string" ? src.issueId : undefined,
                identifier: typeof src.identifier === "string" ? src.identifier : undefined,
                title,
              });
            }
          }
        }
      }

      const doc = await upsertMemoryDocument(ctx, {
        category: validCategory,
        docType,
        docTypeLabel,
        title,
        body,
        status,
        tags,
        sourceIssueId,
        sources: sources.length > 0 ? sources : undefined,
      });

      return {
        content: `Memory document "${doc.title}" saved (version ${doc.version})`,
        data: doc,
      };
    },
  );
}

// ---------------------------------------------------------------------------
// Data handlers (for UI)
// ---------------------------------------------------------------------------

async function registerDataHandlers(ctx: PluginContext): Promise<void> {
  ctx.data.register(DATA_KEYS.memoryList, async (params) => {
    const category =
      typeof params.category === "string" && params.category.length > 0
        ? params.category
        : undefined;
    const docType =
      typeof params.docType === "string" && params.docType.length > 0
        ? params.docType
        : undefined;
    const index = await readIndex(ctx);
    return index.filter((e) => {
      if (category && e.category !== category) return false;
      if (docType && e.docType !== docType) return false;
      return true;
    });
  });

  ctx.data.register(DATA_KEYS.memoryDoc, async (params) => {
    const id = typeof params.id === "string" ? params.id : "";
    if (!id) return null;
    return await readDocument(ctx, id);
  });

  ctx.data.register(DATA_KEYS.memoryStats, async () => {
    const index = await readIndex(ctx);
    // stats keyed as "category" and "category/docType"
    const stats: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      stats[cat] = 0;
      for (const dt of Object.keys(TAXONOMY[cat]?.types ?? {})) {
        stats[`${cat}/${dt}`] = 0;
      }
    }
    for (const entry of index) {
      const catKey = entry.category;
      const typeKey = `${entry.category}/${entry.docType}`;
      if (catKey in stats) {
        stats[catKey] = (stats[catKey] ?? 0) + 1;
      } else {
        stats[catKey] = 1;
      }
      if (typeKey in stats) {
        stats[typeKey] = (stats[typeKey] ?? 0) + 1;
      } else {
        stats[typeKey] = 1;
      }
    }
    return stats;
  });
}

// ---------------------------------------------------------------------------
// Action handlers (for UI create form)
// ---------------------------------------------------------------------------

async function registerActionHandlers(ctx: PluginContext): Promise<void> {
  ctx.actions.register("memory-upsert", async (params) => {
    const categoryRaw = typeof params.category === "string" ? params.category.trim() : "";
    const docTypeRaw = typeof params.docType === "string" ? params.docType.trim() : "";
    const title = typeof params.title === "string" ? params.title.trim() : "";
    const body = typeof params.body === "string" ? params.body : "";
    const statusRaw = typeof params.status === "string" ? params.status : "draft";
    const tagsRaw = params.tags;
    const tags = Array.isArray(tagsRaw)
      ? tagsRaw.filter((t) => typeof t === "string")
      : typeof tagsRaw === "string" && tagsRaw.length > 0
        ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

    if (!categoryRaw || !title || !body) {
      throw new Error("category, title, and body are required");
    }

    const validCategory = (CATEGORIES as string[]).includes(categoryRaw)
      ? (categoryRaw as MemoryCategory)
      : DEFAULT_CATEGORY;

    const availableTypes = Object.keys(TAXONOMY[validCategory]?.types ?? {});
    const docType =
      docTypeRaw && availableTypes.includes(docTypeRaw) ? docTypeRaw : DEFAULT_DOC_TYPE;
    const docTypeLabel = TAXONOMY[validCategory]?.types[docType] ?? docType;

    const status: MemoryStatus =
      statusRaw === "validated" || statusRaw === "archived" ? statusRaw : "draft";

    return await upsertMemoryDocument(ctx, {
      category: validCategory,
      docType,
      docTypeLabel,
      title,
      body,
      status,
      tags,
    });
  });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function registerEventHandlers(ctx: PluginContext): Promise<void> {
  ctx.events.on("issue.updated", async (event: PluginEvent) => {
    await handleIssueStatusChanged(ctx, event);
  });

  ctx.events.on("issue.comment.created", async (event: PluginEvent) => {
    await handleCommentCreated(ctx, event);
  });
}

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

async function registerJobs(ctx: PluginContext): Promise<void> {
  ctx.jobs.register(JOB_KEYS.weeklyDigest, async (job: PluginJobContext) => {
    const index = await readIndex(ctx);
    const countsByCategory: Record<string, number> = {};
    for (const entry of index) {
      countsByCategory[entry.category] = (countsByCategory[entry.category] ?? 0) + 1;
    }

    ctx.logger.info(`${PLUGIN_ID}: weekly digest — total documents: ${index.length}`, {
      jobKey: job.jobKey,
      runId: job.runId,
      trigger: job.trigger,
      countsByCategory,
    });
  });
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    await registerEventHandlers(ctx);
    await registerJobs(ctx);
    await registerDataHandlers(ctx);
    await registerActionHandlers(ctx);
    await registerToolHandlers(ctx);

    ctx.logger.info(`${PLUGIN_ID}: setup complete`);
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    return {
      status: "ok",
      message: "Corporate Memory plugin ready",
      details: {
        pluginId: PLUGIN_ID,
      },
    };
  },

  async onConfigChanged(_newConfig) {
    // No config to handle currently
  },

  async onValidateConfig(_config) {
    return { ok: true, warnings: [], errors: [] };
  },

  async onShutdown() {
    // Nothing to flush
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
