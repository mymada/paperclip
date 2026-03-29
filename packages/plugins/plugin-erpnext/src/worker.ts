/**
 * plugin-erpnext — worker process
 *
 * Bridges Paperclip agents with a Frappe/ERPNext instance.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  definePlugin,
  runWorker,
  type PluginConfigValidationResult,
  type PluginContext,
  type PluginEvent,
  type PluginHealthDiagnostics,
  type PluginJobContext,
  type PluginWebhookInput,
  type ToolResult,
  type ToolRunContext,
} from "@paperclipai/plugin-sdk";
import { JOB_KEYS, STATE_KEYS, TOOL_NAMES, WEBHOOK_KEYS } from "./constants.js";
import { resolveErpConfig, invalidateClientCache, type ErpPluginConfig } from "./erp-client.js";

// ---------------------------------------------------------------------------
// Module-level context (set during setup, used in onWebhook/jobs)
// ---------------------------------------------------------------------------

let currentContext: PluginContext | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function truncate(str: string, max = 2000): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + `… [truncated, ${str.length - max} chars omitted]`;
}

function toJsonString(value: unknown): string {
  return truncate(JSON.stringify(value, null, 2));
}

function getStringParam(params: Record<string, unknown>, key: string, required = false): string {
  const val = params[key];
  if (typeof val === "string" && val.length > 0) return val;
  if (required) throw new Error(`Missing required parameter: ${key}`);
  return "";
}

function getObjectParam(params: Record<string, unknown>, key: string): Record<string, unknown> {
  const val = params[key];
  if (val && typeof val === "object" && !Array.isArray(val)) return val as Record<string, unknown>;
  return {};
}

function getArrayParam<T = unknown>(params: Record<string, unknown>, key: string): T[] {
  const val = params[key];
  return Array.isArray(val) ? (val as T[]) : [];
}

function getNumberParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const val = typeof params[key] === "number" ? params[key] : Number(params[key] ?? fallback);
  if (!Number.isFinite(val as number)) return fallback;
  return val as number;
}

/** Enforce allowedDoctypes list if configured. Throws if doctype is not allowed. */
function assertDoctypeAllowed(config: ErpPluginConfig, doctype: string): void {
  const allowed = config.allowedDoctypes;
  if (!allowed || allowed.length === 0) return;
  if (!allowed.includes(doctype)) {
    throw new Error(
      `Doctype "${doctype}" is not in the allowed list. Allowed: ${allowed.join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Webhook HMAC validation (HMAC-SHA256 as Frappe uses)
// ---------------------------------------------------------------------------

async function validateWebhookSignature(
  ctx: PluginContext,
  config: ErpPluginConfig,
  rawBody: string,
  headers: Record<string, string | string[]>,
): Promise<boolean> {
  if (!config.webhookSecret) return true; // validation disabled

  const secret = await ctx.secrets.resolve(config.webhookSecret).catch(() => config.webhookSecret!);
  if (!secret) return true;

  const sigHeader =
    (headers["x-frappe-webhook-signature"] as string | undefined) ??
    (headers["x-hub-signature-256"] as string | undefined);
  if (!sigHeader) return false;

  // Frappe uses HMAC-SHA256(secret, rawBody)
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    const sigBuf = Buffer.from(sigHeader.replace(/^sha256=/, ""));
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Webhook dedup via state (TTL-based, avoids the 5-issue listing window bug)
// ---------------------------------------------------------------------------

const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 min

async function isRecentWebhookDuplicate(
  ctx: PluginContext,
  doctype: string,
  docname: string,
  event: string,
): Promise<boolean> {
  const key = `dedup:${doctype}:${docname}:${event}`;
  const existing = await ctx.state.get({ scopeKind: "instance", stateKey: key });
  if (typeof existing === "number" && Date.now() - existing < DEDUP_TTL_MS) return true;
  await ctx.state.set({ scopeKind: "instance", stateKey: key }, Date.now());
  return false;
}

// ---------------------------------------------------------------------------
// Agent & project resolution (agents.read + projects.read)
// ---------------------------------------------------------------------------

/** Maps ERP doctype → specialist agent urlKey as defined in erpnext-ops company. */
const DOCTYPE_AGENT_MAP: Record<string, string> = {
  // Accounting
  "Sales Invoice": "accounting-agent",
  "Purchase Invoice": "accounting-agent",
  "Payment Entry": "accounting-agent",
  "Journal Entry": "accounting-agent",
  // Selling
  "Sales Order": "sales-agent",
  "Quotation": "sales-agent",
  "Customer": "sales-agent",
  "Delivery Note": "sales-agent",
  // Buying
  "Purchase Order": "purchasing-agent",
  "Material Request": "purchasing-agent",
  "Supplier": "purchasing-agent",
  "Purchase Receipt": "purchasing-agent",
  // Stock
  "Stock Entry": "stock-agent",
  "Bin": "stock-agent",
  "Item": "stock-agent",
  // HR
  "Leave Application": "hr-agent",
  "Expense Claim": "hr-agent",
  "Salary Slip": "hr-agent",
  "Employee": "hr-agent",
};

/** Module-level agent list cache — avoids re-listing on every webhook. */
let _agentCache: { entries: Array<{ id: string; urlKey: string }>; cachedAt: number } | null = null;
const AGENT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

/**
 * Resolve the agent ID for the specialist responsible for a given doctype.
 * Uses agents.read to look up the live agent roster and caches the result.
 */
async function resolveAssigneeAgentId(
  ctx: PluginContext,
  companyId: string,
  doctype: string,
): Promise<string | undefined> {
  const targetUrlKey = DOCTYPE_AGENT_MAP[doctype];
  if (!targetUrlKey) return undefined;

  const now = Date.now();
  if (!_agentCache || now - _agentCache.cachedAt > AGENT_CACHE_TTL_MS) {
    try {
      const agents = await ctx.agents.list({ companyId, limit: 100 });
      _agentCache = {
        entries: agents.map((a) => ({ id: a.id, urlKey: a.urlKey })),
        cachedAt: now,
      };
    } catch {
      return undefined; // gracefully degrade — issue will be unassigned
    }
  }

  return _agentCache.entries.find((a) => a.urlKey === targetUrlKey)?.id;
}

/** State key where we persist the resolved ERP project ID to avoid repeated listing. */
const ERP_PROJECT_ID_STATE_KEY = "erp_project_id";

/**
 * Find the project to attach ERP webhook issues to.
 * Scans for a project whose name contains "ERP" and caches the result in state.
 * Uses projects.read capability.
 */
async function resolveErpProjectId(
  ctx: PluginContext,
  companyId: string,
): Promise<string | undefined> {
  // Check state cache first so we don't list projects on every webhook.
  const cached = await ctx.state
    .get({ scopeKind: "instance", stateKey: ERP_PROJECT_ID_STATE_KEY })
    .catch(() => null);
  if (typeof cached === "string") return cached;

  try {
    const projects = await ctx.projects.list({ companyId, limit: 50 });
    const match = projects.find(
      (p) => /erp/i.test(p.name) && p.status !== "cancelled",
    );
    if (match) {
      await ctx.state.set(
        { scopeKind: "instance", stateKey: ERP_PROJECT_ID_STATE_KEY },
        match.id,
      );
      return match.id;
    }
  } catch {
    // projects.read not available or no matching project — issues stay unscoped
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Webhook issue lifecycle (issues.read + issues.create + issues.update +
//                          issue.comments.create)
// ---------------------------------------------------------------------------

/** State key prefix for tracking the Paperclip issue ID created per ERP document. */
const ISSUE_STATE_PREFIX = "erp-issue";

/**
 * Create a new Paperclip issue for an ERP event, auto-assigned to the right
 * specialist and attached to the ERP project if found.
 * Persists the issue ID in state so future events for the same document
 * can update or comment on the same issue instead of creating duplicates.
 */
async function createErpIssue(
  ctx: PluginContext,
  companyId: string,
  doctype: string,
  docname: string,
  event: string,
  body: Record<string, unknown>,
  issueStateKey: string,
): Promise<void> {
  const [assigneeAgentId, projectId] = await Promise.all([
    resolveAssigneeAgentId(ctx, companyId, doctype),
    resolveErpProjectId(ctx, companyId),
  ]);

  const issue = await ctx.issues.create({
    companyId,
    title: `[ERP] ${event}: ${doctype} ${docname}`,
    description: [
      `**ERPNext event**: \`${event}\``,
      `**Doctype**: ${doctype}`,
      `**Document**: ${docname}`,
      `**Received at**: ${new Date().toISOString()}`,
      "",
      "Use `erp_get_document` to inspect and take action.",
      "",
      "```json",
      toJsonString(body),
      "```",
    ].join("\n"),
    ...(assigneeAgentId !== undefined && { assigneeAgentId }),
    ...(projectId !== undefined && { projectId }),
  });

  // Remember this issue ID for future events on the same document
  await ctx.state.set({ scopeKind: "instance", stateKey: issueStateKey }, issue.id);
}

/**
 * Handle an actionable ERP event: update or comment on the existing Paperclip
 * issue if one exists for this document, otherwise create a new one.
 *
 * - on_cancel on an open issue → mark issue done (document was cancelled)
 * - on_submit / on_update_after_submit on an open issue → add a comment
 * - closed issue or no issue → create a fresh issue
 */
async function handleErpIssueLifecycle(
  ctx: PluginContext,
  companyId: string,
  doctype: string,
  docname: string,
  event: string,
  body: Record<string, unknown>,
): Promise<void> {
  const issueStateKey = `${ISSUE_STATE_PREFIX}:${doctype}:${docname}`;
  const existingIssueId = await ctx.state
    .get({ scopeKind: "instance", stateKey: issueStateKey })
    .catch(() => null);

  if (typeof existingIssueId === "string") {
    // Look up the tracked issue to check if it is still open (issues.read)
    const existing = await ctx.issues.get(existingIssueId, companyId).catch(() => null);
    const isOpen =
      existing !== null &&
      existing.status !== "done" &&
      existing.status !== "cancelled";

    if (isOpen) {
      if (event === "on_cancel") {
        // Document was cancelled — close the issue automatically (issues.update)
        await ctx.issues.update(
          existingIssueId,
          { status: "done" },
          companyId,
        );
      } else {
        // New event on an already-tracked document — add a comment (issue.comments.create)
        await ctx.issues.createComment(
          existingIssueId,
          [
            `**New ERPNext event**: \`${event}\``,
            `**Received at**: ${new Date().toISOString()}`,
            "",
            "```json",
            toJsonString(body),
            "```",
          ].join("\n"),
          companyId,
        );
      }
      return;
    }
  }

  // No open issue found — create a fresh one
  await createErpIssue(ctx, companyId, doctype, docname, event, body, issueStateKey);
}

// ---------------------------------------------------------------------------
// Plugin registration helpers
// ---------------------------------------------------------------------------

function registerEventHandlers(ctx: PluginContext): void {
  ctx.events.on("issue.updated", async (event: PluginEvent) => {
    const payload = event.payload as Record<string, unknown>;
    if (payload.status !== "done" || !event.entityId) return;
    try {
      const entities = await ctx.entities.list({
        scopeKind: "issue",
        scopeId: event.entityId,
        limit: 20,
        offset: 0,
      });
      if (entities.length > 0) {
        await ctx.activity.log({
          companyId: event.companyId,
          message: `Issue closed — ${entities.length} linked ERP document(s): ${entities.map((e) => e.title ?? e.externalId).join(", ")}`,
          entityType: "issue",
          entityId: event.entityId,
          metadata: { plugin: "paperclip-erpnext" },
        });
      }
    } catch {
      // non-critical
    }
  });
}

function registerDataHandlers(ctx: PluginContext): void {
  // UI: erp-stats data slot (used by page + widget)
  ctx.data.register("erp-stats", async () => {
    const [syncStats, lastSyncAt, webhookDeliveries] = await Promise.all([
      ctx.state.get({ scopeKind: "instance", stateKey: STATE_KEYS.syncStats }),
      ctx.state.get({ scopeKind: "instance", stateKey: STATE_KEYS.lastSyncAt }),
      ctx.state.get({ scopeKind: "instance", stateKey: STATE_KEYS.webhookDeliveries }),
    ]);
    return { syncStats, lastSyncAt, webhookDeliveries };
  });

  // UI: entities linked to an issue or project
  ctx.data.register("erp-entities", async (params) => {
    const scopeKind = (params.scopeKind as string) === "project" ? "project" : "issue";
    const scopeId = typeof params.scopeId === "string" ? params.scopeId : undefined;
    if (!scopeId) return [];
    return ctx.entities.list({ scopeKind, scopeId, limit: 50, offset: 0 });
  });
}

function registerJobs(ctx: PluginContext): void {
  ctx.jobs.register(JOB_KEYS.fullSync, async (job: PluginJobContext) => {
    ctx.logger.info(`ERPNext full sync started (run: ${job.runId})`);
    try {
      const { client, config } = await resolveErpConfig(ctx);
      if (!config.syncEnabled) {
        ctx.logger.info("ERPNext sync disabled in config, skipping");
        return;
      }

      const stats: Record<string, unknown> = {};
      await Promise.allSettled([
        client.getAccountingStats(ctx).then((s) => { stats.accounting = s; }),
        client.getSellingStats(ctx).then((s) => { stats.selling = s; }),
        client.getBuyingStats(ctx).then((s) => { stats.buying = s; }),
        client.getStockStats(ctx).then((s) => { stats.stock = s; }),
        client.getHrStats(ctx).then((s) => { stats.hr = s; }),
      ]);

      await ctx.state.set({ scopeKind: "instance", stateKey: STATE_KEYS.syncStats }, stats);
      await ctx.state.set({ scopeKind: "instance", stateKey: STATE_KEYS.lastSyncAt }, new Date().toISOString());
      await ctx.metrics.write("erpnext.sync.full", 1, { status: "ok", trigger: job.trigger });
      ctx.logger.info("ERPNext full sync completed");
    } catch (err) {
      ctx.logger.error(`ERPNext full sync failed: ${summarizeError(err)}`);
      await ctx.metrics.write("erpnext.sync.full", 1, { status: "error" });
    }
  });

  ctx.jobs.register(JOB_KEYS.pendingDocuments, async (job: PluginJobContext) => {
    ctx.logger.info(`ERPNext pending documents check (run: ${job.runId})`);
    try {
      const { client, config } = await resolveErpConfig(ctx);
      if (!config.syncEnabled) return;

      const pendingPOs = await client.listDocuments(ctx, "Purchase Order", {
        filters: [["Purchase Order", "workflow_state", "=", "Pending Approval"]],
        fields: ["name", "supplier", "grand_total"],
        limit: 10,
      }).catch(() => []);

      const today = new Date().toISOString().split("T")[0]!;
      const overdueSI = await client.listDocuments(ctx, "Sales Invoice", {
        filters: [
          ["Sales Invoice", "docstatus", "=", 1],
          ["Sales Invoice", "outstanding_amount", ">", 0],
          ["Sales Invoice", "due_date", "<", today],
        ],
        fields: ["name", "customer", "outstanding_amount", "due_date"],
        limit: 10,
      }).catch(() => []);

      await ctx.metrics.write("erpnext.pending_documents", pendingPOs.length + overdueSI.length);

      if (pendingPOs.length > 0) ctx.logger.info(`ERPNext: ${pendingPOs.length} PO(s) pending approval`);
      if (overdueSI.length > 0) ctx.logger.info(`ERPNext: ${overdueSI.length} overdue Sales Invoice(s)`);
    } catch (err) {
      ctx.logger.error(`ERPNext pending documents check failed: ${summarizeError(err)}`);
    }
  });
}

function registerToolHandlers(ctx: PluginContext): void {
  ctx.tools.register(
    TOOL_NAMES.getDocument,
    {
      displayName: "ERP: Get Document",
      description: "Fetch a single ERPNext document by doctype and name.",
      parametersSchema: {
        type: "object",
        required: ["doctype", "name"],
        properties: {
          doctype: { type: "string" },
          name: { type: "string" },
          fields: { type: "array", items: { type: "string" } },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client, config } = await resolveErpConfig(ctx);
        const doctype = getStringParam(p, "doctype", true);
        assertDoctypeAllowed(config, doctype);
        const name = getStringParam(p, "name", true);
        const fields = getArrayParam<string>(p, "fields");
        const doc = await client.getDocument(ctx, doctype, name, fields.length > 0 ? fields : undefined);
        await ctx.metrics.write("erpnext.tool.get_document", 1, { doctype });
        return { content: toJsonString(doc), data: doc };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.listDocuments,
    {
      displayName: "ERP: List Documents",
      description: "List ERPNext documents with optional filters, sorting and pagination.",
      parametersSchema: {
        type: "object",
        required: ["doctype"],
        properties: {
          doctype: { type: "string" },
          filters: { type: "array", items: { type: "array" } },
          fields: { type: "array", items: { type: "string" } },
          order_by: { type: "string" },
          limit: { type: "number" },
          start: { type: "number" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client, config } = await resolveErpConfig(ctx);
        const doctype = getStringParam(p, "doctype", true);
        assertDoctypeAllowed(config, doctype);
        const filters = getArrayParam<unknown[]>(p, "filters");
        const fields = getArrayParam<string>(p, "fields");
        const order_by = getStringParam(p, "order_by");
        const limit = getNumberParam(p, "limit", 20);
        const start = getNumberParam(p, "start", 0);
        const docs = await client.listDocuments(ctx, doctype, {
          filters: filters.length > 0 ? filters : undefined,
          fields: fields.length > 0 ? fields : ["name", "modified", "docstatus"],
          order_by: order_by || "modified desc",
          limit,
          start,
        });
        await ctx.metrics.write("erpnext.tool.list_documents", 1, { doctype });
        return { content: `Found ${docs.length} ${doctype}(s):\n\n${toJsonString(docs)}`, data: docs };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.createDocument,
    {
      displayName: "ERP: Create Document",
      description: "Create a new ERPNext document (Draft by default, or auto-submit if autoSubmit=true).",
      parametersSchema: {
        type: "object",
        required: ["doctype", "values"],
        properties: {
          doctype: { type: "string" },
          values: { type: "object" },
          autoSubmit: { type: "boolean" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client, config } = await resolveErpConfig(ctx);
        const doctype = getStringParam(p, "doctype", true);
        assertDoctypeAllowed(config, doctype);
        const values = getObjectParam(p, "values");
        const autoSubmit = p.autoSubmit === true;
        if (config.defaultCompany && !values.company) values.company = config.defaultCompany;

        const doc = await client.createDocument(ctx, doctype, values);
        const docName = String((doc as { name?: string }).name ?? "");
        let result = doc;
        if (autoSubmit && docName) {
          result = await client.submitDocument(ctx, doctype, docName);
        }
        await ctx.metrics.write("erpnext.tool.create_document", 1, { doctype });
        await ctx.entities.upsert({
          entityType: `erp-${doctype.toLowerCase().replace(/ /g, "-")}`,
          scopeKind: "company",
          externalId: `${doctype}/${docName}`,
          title: `${doctype}: ${docName}`,
          status: autoSubmit ? "submitted" : "draft",
          data: result as Record<string, unknown>,
        });
        return { content: `Created ${doctype} **${docName}**${autoSubmit ? " (submitted)" : " (draft)"}:\n\n${toJsonString(result)}`, data: result };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.updateDocument,
    {
      displayName: "ERP: Update Document",
      description: "Update fields on an existing ERPNext document.",
      parametersSchema: {
        type: "object",
        required: ["doctype", "name", "values"],
        properties: {
          doctype: { type: "string" },
          name: { type: "string" },
          values: { type: "object" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client, config } = await resolveErpConfig(ctx);
        const doctype = getStringParam(p, "doctype", true);
        assertDoctypeAllowed(config, doctype);
        const name = getStringParam(p, "name", true);
        const values = getObjectParam(p, "values");
        const doc = await client.updateDocument(ctx, doctype, name, values);
        await ctx.metrics.write("erpnext.tool.update_document", 1, { doctype });
        return { content: `Updated ${doctype} **${name}**:\n\n${toJsonString(doc)}`, data: doc };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.submitDocument,
    {
      displayName: "ERP: Submit Document",
      description: "Submit a Draft ERPNext document (irreversible posting action).",
      parametersSchema: {
        type: "object",
        required: ["doctype", "name"],
        properties: {
          doctype: { type: "string" },
          name: { type: "string" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client, config } = await resolveErpConfig(ctx);
        const doctype = getStringParam(p, "doctype", true);
        assertDoctypeAllowed(config, doctype);
        const name = getStringParam(p, "name", true);
        const doc = await client.submitDocument(ctx, doctype, name);
        await ctx.metrics.write("erpnext.tool.submit_document", 1, { doctype });
        return { content: `Submitted ${doctype} **${name}** successfully.`, data: doc };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.cancelDocument,
    {
      displayName: "ERP: Cancel Document",
      description: "Cancel a submitted ERPNext document.",
      parametersSchema: {
        type: "object",
        required: ["doctype", "name"],
        properties: {
          doctype: { type: "string" },
          name: { type: "string" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client, config } = await resolveErpConfig(ctx);
        const doctype = getStringParam(p, "doctype", true);
        assertDoctypeAllowed(config, doctype);
        const name = getStringParam(p, "name", true);
        const doc = await client.cancelDocument(ctx, doctype, name);
        await ctx.metrics.write("erpnext.tool.cancel_document", 1, { doctype });
        return { content: `Cancelled ${doctype} **${name}** successfully.`, data: doc };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.callMethod,
    {
      displayName: "ERP: Call Method",
      description: "Call a whitelisted ERPNext Python method via /api/method/. Avoid destructive methods (frappe.client.delete, frappe.db.truncate).",
      parametersSchema: {
        type: "object",
        required: ["method"],
        properties: {
          method: { type: "string" },
          params: { type: "object" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client } = await resolveErpConfig(ctx);
        const method = getStringParam(p, "method", true);
        const methodParams = getObjectParam(p, "params");
        const result = await client.callMethod(ctx, method, methodParams);
        await ctx.metrics.write("erpnext.tool.call_method", 1, { method: method.split(".").pop() ?? method });
        return { content: toJsonString(result), data: result };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.getReport,
    {
      displayName: "ERP: Get Report",
      description: "Run an ERPNext report (General Ledger, Stock Balance, Accounts Receivable, etc.).",
      parametersSchema: {
        type: "object",
        required: ["report_name"],
        properties: {
          report_name: { type: "string" },
          filters: { type: "object" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client } = await resolveErpConfig(ctx);
        const reportName = getStringParam(p, "report_name", true);
        const filters = getObjectParam(p, "filters");
        const result = await client.getReport(ctx, reportName, filters);
        await ctx.metrics.write("erpnext.tool.get_report", 1, { report: reportName });
        return { content: `Report **${reportName}**:\n\n${toJsonString(result)}`, data: result };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.search,
    {
      displayName: "ERP: Global Search",
      description: "Search across ERPNext doctypes by keyword.",
      parametersSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string" },
          doctypes: { type: "array", items: { type: "string" } },
          limit: { type: "number" },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client } = await resolveErpConfig(ctx);
        const query = getStringParam(p, "query", true);
        const doctypes = getArrayParam<string>(p, "doctypes");
        const limit = getNumberParam(p, "limit", 20);
        const results = await client.globalSearch(ctx, query, doctypes.length > 0 ? doctypes : undefined, limit);
        await ctx.metrics.write("erpnext.tool.search", 1);
        return { content: `ERPNext search "${query}" (${results.length} found):\n\n${toJsonString(results)}`, data: results };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );

  ctx.tools.register(
    TOOL_NAMES.getStats,
    {
      displayName: "ERP: Get Stats",
      description: "Summary dashboard of key ERP metrics across modules.",
      parametersSchema: {
        type: "object",
        properties: {
          modules: { type: "array", items: { type: "string" } },
        },
      },
    },
    async (params, _runCtx): Promise<ToolResult> => {
      const p = params as Record<string, unknown>;
      try {
        const { client } = await resolveErpConfig(ctx);
        const modules = getArrayParam<string>(p, "modules");
        const all = modules.length === 0;
        const stats: Record<string, unknown> = {};

        const tasks: Array<Promise<void>> = [];
        if (all || modules.includes("accounting")) tasks.push(client.getAccountingStats(ctx).then((s) => { stats.accounting = s; }).catch((e) => { stats.accounting = { error: summarizeError(e) }; }));
        if (all || modules.includes("selling")) tasks.push(client.getSellingStats(ctx).then((s) => { stats.selling = s; }).catch((e) => { stats.selling = { error: summarizeError(e) }; }));
        if (all || modules.includes("buying")) tasks.push(client.getBuyingStats(ctx).then((s) => { stats.buying = s; }).catch((e) => { stats.buying = { error: summarizeError(e) }; }));
        if (all || modules.includes("stock")) tasks.push(client.getStockStats(ctx).then((s) => { stats.stock = s; }).catch((e) => { stats.stock = { error: summarizeError(e) }; }));
        if (all || modules.includes("hr")) tasks.push(client.getHrStats(ctx).then((s) => { stats.hr = s; }).catch((e) => { stats.hr = { error: summarizeError(e) }; }));
        await Promise.all(tasks);

        return { content: `ERP Stats:\n\n${toJsonString(stats)}`, data: stats };
      } catch (err) { return { error: summarizeError(err) }; }
    },
  );
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    currentContext = ctx;
    ctx.logger.info("ERPNext plugin starting up");

    registerEventHandlers(ctx);
    registerDataHandlers(ctx);
    registerJobs(ctx);
    registerToolHandlers(ctx);

    ctx.logger.info("ERPNext plugin ready");
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    const ctx = currentContext;
    if (!ctx) {
      return { status: "error", message: "Plugin context not initialized yet." };
    }

    try {
      const { client } = await resolveErpConfig(ctx);
      const result = await client.ping(ctx);
      return {
        status: "ok",
        message: `Connected to ERPNext as ${result.user ?? "unknown"}`,
        details: { user: result.user },
      };
    } catch (err) {
      return {
        status: "error",
        message: `ERPNext connection failed: ${summarizeError(err)}`,
      };
    }
  },

  async onValidateConfig(config: Record<string, unknown>): Promise<PluginConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const typed = config as ErpPluginConfig;

    if (!typed.erpnextUrl) {
      errors.push("erpnextUrl is required.");
    } else if (!typed.erpnextUrl.startsWith("http")) {
      errors.push("erpnextUrl must start with http:// or https://.");
    }
    if (!typed.apiKey) errors.push("apiKey is required.");
    if (!typed.apiSecret) errors.push("apiSecret is required.");
    if (!typed.webhookSecret) {
      warnings.push("webhookSecret is not set — inbound webhook payloads will not be signature-validated.");
    }
    if (typed.allowedDoctypes && !Array.isArray(typed.allowedDoctypes)) {
      errors.push("allowedDoctypes must be an array of strings.");
    }

    return { ok: errors.length === 0, errors, warnings };
  },

  async onConfigChanged(_newConfig: Record<string, unknown>) {
    invalidateClientCache();
    _agentCache = null; // force re-list on next webhook
    currentContext?.logger.info("ERPNext config changed — client cache invalidated");
  },

  async onShutdown() {
    currentContext?.logger.info("ERPNext plugin shutting down");
    invalidateClientCache();
  },

  async onWebhook(input: PluginWebhookInput) {
    if (input.endpointKey !== WEBHOOK_KEYS.erpnextEvent) return;

    const ctx = currentContext;
    if (!ctx) {
      // Worker not yet initialized — should not happen in practice
      return;
    }

    try {
      const { config } = await resolveErpConfig(ctx);

      const valid = await validateWebhookSignature(ctx, config, input.rawBody, input.headers);
      if (!valid) {
        ctx.logger.warn("ERPNext webhook: invalid signature, rejecting delivery");
        return;
      }

      // Frappe sends the document data as parsed JSON
      const body = (input.parsedBody ?? {}) as Record<string, unknown>;
      const doctype = typeof body.doctype === "string" ? body.doctype : "";
      const docname = typeof body.name === "string" ? body.name : "";
      const event = typeof body.webhook_trigger === "string"
        ? body.webhook_trigger
        : (typeof body.event === "string" ? body.event : "unknown");

      ctx.logger.info(`ERPNext webhook: ${doctype}/${docname} (${event})`);

      // Upsert entity record
      if (doctype && docname) {
        await ctx.entities.upsert({
          entityType: `erp-${doctype.toLowerCase().replace(/ /g, "-")}`,
          scopeKind: "company",
          externalId: `${doctype}/${docname}`,
          title: `${doctype}: ${docname}`,
          status: String(body.docstatus ?? body.status ?? ""),
          data: body,
        });

        // Record delivery ring-buffer
        const deliveries = (await ctx.state.get({
          scopeKind: "instance",
          stateKey: STATE_KEYS.webhookDeliveries,
        })) ?? [];
        const updated = [
          { doctype, docname, event, receivedAt: new Date().toISOString() },
          ...(Array.isArray(deliveries) ? deliveries : []),
        ].slice(0, 50);
        await ctx.state.set({ scopeKind: "instance", stateKey: STATE_KEYS.webhookDeliveries }, updated);
      }

      // Handle actionable lifecycle events: create/update/comment on Paperclip issues
      const actionableEvents = ["on_submit", "on_cancel", "on_update_after_submit"];
      if (actionableEvents.includes(event) && doctype && docname) {
        const isDuplicate = await isRecentWebhookDuplicate(ctx, doctype, docname, event);
        if (!isDuplicate) {
          const companies = await ctx.companies.list({ limit: 1 }).catch(() => []);
          const companyId = companies[0]?.id;
          if (companyId) {
            await handleErpIssueLifecycle(ctx, companyId, doctype, docname, event, body);
          }
        }
      }

      await ctx.metrics.write("erpnext.webhook.received", 1, { doctype, event });
    } catch (err) {
      ctx.logger.error(`ERPNext webhook handler error: ${summarizeError(err)}`);
    }
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
