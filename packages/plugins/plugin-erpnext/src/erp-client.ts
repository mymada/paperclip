/**
 * ERPNext / Frappe REST API client.
 *
 * Authentication: token-based via `Authorization: token {key}:{secret}`.
 * All requests go through the Paperclip plugin SSRF-protected `ctx.http.fetch()`.
 */

import type { PluginContext } from "@paperclipai/plugin-sdk";

export interface ErpConfig {
  erpnextUrl: string;
  apiKey: string;
  apiSecret: string;
}

export interface FrappeListParams {
  filters?: unknown[][];
  fields?: string[];
  order_by?: string;
  limit?: number;
  start?: number;
}

export interface FrappeDocument {
  name: string;
  doctype: string;
  docstatus?: number;
  [key: string]: unknown;
}

export class ErpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ErpConfig) {
    this.baseUrl = config.erpnextUrl.replace(/\/$/, "");
    this.authHeader = `token ${config.apiKey}:${config.apiSecret}`;
  }

  private async request<T = unknown>(
    ctx: PluginContext,
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const response = await ctx.http.fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let message = `ERPNext API error ${response.status}`;
      try {
        const errBody = await response.json() as { exc_type?: string; exception?: string; _error_message?: string };
        message = errBody._error_message ?? errBody.exception ?? message;
      } catch {
        // ignore parse error
      }
      throw new Error(message);
    }

    const json = await response.json() as { message?: unknown; data?: unknown };
    // Frappe /api/resource returns { data: ... }, /api/method returns { message: ... }
    if ("message" in json) return json.message as T;
    if ("data" in json) return json.data as T;
    return json as T;
  }

  // -------------------------------------------------------------------------
  // Document CRUD
  // -------------------------------------------------------------------------

  async getDocument(
    ctx: PluginContext,
    doctype: string,
    name: string,
    fields?: string[],
  ): Promise<FrappeDocument> {
    let path = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
    if (fields && fields.length > 0) {
      path += `?fields=${encodeURIComponent(JSON.stringify(fields))}`;
    }
    return this.request<FrappeDocument>(ctx, "GET", path);
  }

  async listDocuments(
    ctx: PluginContext,
    doctype: string,
    params: FrappeListParams = {},
  ): Promise<FrappeDocument[]> {
    const qs = new URLSearchParams();
    if (params.filters) qs.set("filters", JSON.stringify(params.filters));
    if (params.fields) qs.set("fields", JSON.stringify(params.fields));
    if (params.order_by) qs.set("order_by", params.order_by);
    if (params.limit !== undefined) qs.set("limit", String(Math.min(params.limit, 200)));
    if (params.start !== undefined) qs.set("limit_start", String(params.start));

    const query = qs.toString();
    const path = `/api/resource/${encodeURIComponent(doctype)}${query ? `?${query}` : ""}`;
    // Frappe /api/resource always returns { data: [...] }
    const result = await this.request<{ data: FrappeDocument[] }>(ctx, "GET", path) as unknown;
    const asObj = result as Record<string, unknown>;
    if (Array.isArray(asObj.data)) return asObj.data as FrappeDocument[];
    if (Array.isArray(result)) return result as FrappeDocument[];
    return [];
  }

  async createDocument(
    ctx: PluginContext,
    doctype: string,
    values: Record<string, unknown>,
  ): Promise<FrappeDocument> {
    return this.request<FrappeDocument>(ctx, "POST", `/api/resource/${encodeURIComponent(doctype)}`, {
      ...values,
      doctype,
    });
  }

  async updateDocument(
    ctx: PluginContext,
    doctype: string,
    name: string,
    values: Record<string, unknown>,
  ): Promise<FrappeDocument> {
    return this.request<FrappeDocument>(
      ctx,
      "PUT",
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      values,
    );
  }

  // -------------------------------------------------------------------------
  // Document lifecycle (submit / cancel)
  // -------------------------------------------------------------------------

  /**
   * Submit a document.
   * frappe.client.submit requires the full document object, so we fetch it first.
   */
  async submitDocument(ctx: PluginContext, doctype: string, name: string): Promise<FrappeDocument> {
    const doc = await this.getDocument(ctx, doctype, name);
    if (doc.docstatus !== 0) {
      throw new Error(
        `Cannot submit ${doctype} "${name}": document is not in Draft state (docstatus=${doc.docstatus}).`,
      );
    }
    return this.callMethod<FrappeDocument>(ctx, "frappe.client.submit", { doc });
  }

  /**
   * Cancel a submitted document.
   * frappe.client.cancel accepts doctype + name directly.
   */
  async cancelDocument(ctx: PluginContext, doctype: string, name: string): Promise<FrappeDocument> {
    return this.callMethod<FrappeDocument>(ctx, "frappe.client.cancel", { doctype, name });
  }

  // -------------------------------------------------------------------------
  // Method calls & reports
  // -------------------------------------------------------------------------

  async callMethod<T = unknown>(
    ctx: PluginContext,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    return this.request<T>(ctx, "POST", `/api/method/${method}`, params);
  }

  /**
   * Run an ERPNext report.
   * Uses frappe.desk.query_report.run which is whitelisted for API key access.
   */
  async getReport(
    ctx: PluginContext,
    reportName: string,
    filters: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this.callMethod(ctx, "frappe.desk.query_report.run", {
      report_name: reportName,
      filters: JSON.stringify(filters),
    });
  }

  async globalSearch(
    ctx: PluginContext,
    query: string,
    doctypes?: string[],
    limit = 20,
  ): Promise<unknown[]> {
    const params: Record<string, unknown> = { text: query, limit };
    if (doctypes && doctypes.length > 0) params.doctype = doctypes;
    const result = await this.callMethod<unknown>(ctx, "frappe.utils.global_search.search", params);
    return Array.isArray(result) ? result : [];
  }

  // -------------------------------------------------------------------------
  // Stats helpers
  // -------------------------------------------------------------------------

  async getAccountingStats(ctx: PluginContext): Promise<Record<string, unknown>> {
    const [salesInvoices, purchaseInvoices, paymentEntries] = await Promise.allSettled([
      this.listDocuments(ctx, "Sales Invoice", {
        filters: [["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "outstanding_amount", ">", 0]],
        fields: ["name", "customer", "grand_total", "outstanding_amount", "due_date"],
        limit: 50,
        order_by: "due_date asc",
      }),
      this.listDocuments(ctx, "Purchase Invoice", {
        filters: [["Purchase Invoice", "docstatus", "=", 1], ["Purchase Invoice", "outstanding_amount", ">", 0]],
        fields: ["name", "supplier", "grand_total", "outstanding_amount", "due_date"],
        limit: 50,
        order_by: "due_date asc",
      }),
      this.listDocuments(ctx, "Payment Entry", {
        filters: [["Payment Entry", "docstatus", "=", 0]],
        fields: ["name", "payment_type", "party", "paid_amount"],
        limit: 20,
      }),
    ]);

    return {
      unpaidSalesInvoices: salesInvoices.status === "fulfilled" ? salesInvoices.value : [],
      unpaidPurchaseInvoices: purchaseInvoices.status === "fulfilled" ? purchaseInvoices.value : [],
      draftPaymentEntries: paymentEntries.status === "fulfilled" ? paymentEntries.value : [],
    };
  }

  async getSellingStats(ctx: PluginContext): Promise<Record<string, unknown>> {
    const [salesOrders, quotations] = await Promise.allSettled([
      this.listDocuments(ctx, "Sales Order", {
        filters: [["Sales Order", "docstatus", "=", 1], ["Sales Order", "status", "in", ["To Deliver and Bill", "To Bill", "To Deliver"]]],
        fields: ["name", "customer", "grand_total", "status", "delivery_date"],
        limit: 50,
        order_by: "delivery_date asc",
      }),
      this.listDocuments(ctx, "Quotation", {
        filters: [["Quotation", "docstatus", "=", 0]],
        fields: ["name", "party_name", "grand_total", "valid_till"],
        limit: 20,
      }),
    ]);

    return {
      openSalesOrders: salesOrders.status === "fulfilled" ? salesOrders.value : [],
      draftQuotations: quotations.status === "fulfilled" ? quotations.value : [],
    };
  }

  async getBuyingStats(ctx: PluginContext): Promise<Record<string, unknown>> {
    const [purchaseOrders, materialRequests] = await Promise.allSettled([
      this.listDocuments(ctx, "Purchase Order", {
        filters: [["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "status", "in", ["To Receive and Bill", "To Bill", "To Receive"]]],
        fields: ["name", "supplier", "grand_total", "status", "schedule_date"],
        limit: 50,
        order_by: "schedule_date asc",
      }),
      this.listDocuments(ctx, "Material Request", {
        filters: [["Material Request", "docstatus", "=", 1], ["Material Request", "status", "=", "Pending"]],
        fields: ["name", "material_request_type", "status"],
        limit: 20,
      }),
    ]);

    return {
      openPurchaseOrders: purchaseOrders.status === "fulfilled" ? purchaseOrders.value : [],
      pendingMaterialRequests: materialRequests.status === "fulfilled" ? materialRequests.value : [],
    };
  }

  async getStockStats(ctx: PluginContext): Promise<Record<string, unknown>> {
    const [stockEntries, negativeStock] = await Promise.allSettled([
      this.listDocuments(ctx, "Stock Entry", {
        filters: [["Stock Entry", "docstatus", "=", 0]],
        fields: ["name", "stock_entry_type", "from_warehouse", "to_warehouse"],
        limit: 20,
      }),
      this.listDocuments(ctx, "Bin", {
        filters: [["Bin", "actual_qty", "<", 0]],
        fields: ["name", "item_code", "warehouse", "actual_qty"],
        limit: 20,
      }),
    ]);

    return {
      draftStockEntries: stockEntries.status === "fulfilled" ? stockEntries.value : [],
      negativeStockAlerts: negativeStock.status === "fulfilled" ? negativeStock.value : [],
    };
  }

  async getHrStats(ctx: PluginContext): Promise<Record<string, unknown>> {
    const [leaveApplications, expenseClaims] = await Promise.allSettled([
      this.listDocuments(ctx, "Leave Application", {
        filters: [["Leave Application", "docstatus", "=", 0]],
        fields: ["name", "employee", "leave_type", "from_date", "to_date"],
        limit: 20,
      }),
      this.listDocuments(ctx, "Expense Claim", {
        filters: [["Expense Claim", "docstatus", "=", 0]],
        fields: ["name", "employee", "total_claimed_amount", "status"],
        limit: 20,
      }),
    ]);

    return {
      pendingLeaveApplications: leaveApplications.status === "fulfilled" ? leaveApplications.value : [],
      pendingExpenseClaims: expenseClaims.status === "fulfilled" ? expenseClaims.value : [],
    };
  }

  /** Lightweight connectivity check — calls the session endpoint. */
  async ping(ctx: PluginContext): Promise<{ user: string }> {
    return this.callMethod<{ user: string }>(ctx, "frappe.auth.get_logged_user");
  }
}

// -------------------------------------------------------------------------
// Config resolution
// -------------------------------------------------------------------------

export interface ErpPluginConfig {
  erpnextUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  defaultCompany?: string;
  webhookSecret?: string;
  syncEnabled?: boolean;
  allowedDoctypes?: string[];
}

/** Module-level cache so credentials aren't re-resolved on every tool call. */
let _clientCache: { client: ErpClient; config: ErpPluginConfig; resolvedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function resolveErpConfig(
  ctx: PluginContext,
  forceRefresh = false,
): Promise<{ client: ErpClient; config: ErpPluginConfig }> {
  const now = Date.now();
  if (!forceRefresh && _clientCache && now - _clientCache.resolvedAt < CACHE_TTL_MS) {
    return { client: _clientCache.client, config: _clientCache.config };
  }

  const raw = (await ctx.config.get()) as ErpPluginConfig;

  const erpnextUrl = raw.erpnextUrl ?? "";
  if (!erpnextUrl) throw new Error("ERPNext plugin not configured: missing erpnextUrl.");

  const apiKey = raw.apiKey
    ? await ctx.secrets.resolve(raw.apiKey).catch(() => raw.apiKey!)
    : "";
  const apiSecret = raw.apiSecret
    ? await ctx.secrets.resolve(raw.apiSecret).catch(() => raw.apiSecret!)
    : "";

  if (!apiKey || !apiSecret) {
    throw new Error("ERPNext plugin not configured: missing apiKey or apiSecret.");
  }

  const client = new ErpClient({ erpnextUrl, apiKey, apiSecret });
  _clientCache = { client, config: raw, resolvedAt: now };
  return { client, config: raw };
}

/** Call after onConfigChanged to force re-resolve on next tool call. */
export function invalidateClientCache(): void {
  _clientCache = null;
}
