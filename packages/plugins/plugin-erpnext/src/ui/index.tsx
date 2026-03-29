/**
 * ERPNext plugin UI components.
 *
 * Pattern: register data handlers in worker.ts with ctx.data.register(),
 * consume them here with usePluginData(key, params).
 */
import { type CSSProperties } from "react";
import {
  usePluginData,
  type PluginDetailTabProps,
  type PluginPageProps,
  type PluginSidebarProps,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";

// ---------------------------------------------------------------------------
// Types matching what ctx.data.register("erp-stats", ...) returns
// ---------------------------------------------------------------------------

type ErpStats = {
  accounting?: {
    unpaidSalesInvoices?: unknown[];
    unpaidPurchaseInvoices?: unknown[];
    draftPaymentEntries?: unknown[];
  };
  selling?: {
    openSalesOrders?: unknown[];
    draftQuotations?: unknown[];
  };
  buying?: {
    openPurchaseOrders?: unknown[];
    pendingMaterialRequests?: unknown[];
  };
  stock?: {
    draftStockEntries?: unknown[];
    negativeStockAlerts?: unknown[];
  };
  hr?: {
    pendingLeaveApplications?: unknown[];
    pendingExpenseClaims?: unknown[];
  };
};

type StatsPayload = {
  syncStats?: ErpStats;
  lastSyncAt?: string;
  webhookDeliveries?: Array<{ doctype: string; docname: string; event: string; receivedAt: string }>;
};

type ErpEntityRecord = {
  id: string;
  entityType: string;
  externalId: string | null;
  title: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    fontFamily: "system-ui, sans-serif",
    fontSize: 13,
    color: "var(--color-text, #1a1a1a)",
    padding: "12px 16px",
  } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    fontWeight: 600,
    fontSize: 14,
  } satisfies CSSProperties,
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    background: "var(--color-badge-bg, #e8f4fd)",
    color: "var(--color-badge-text, #0969da)",
  } satisfies CSSProperties,
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid var(--color-border, #e5e7eb)",
  } satisfies CSSProperties,
  pill: (color: string): CSSProperties => ({
    display: "inline-flex",
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 11,
    background: color,
    color: "#fff",
    fontWeight: 600,
  }),
  emptyMsg: {
    color: "var(--color-text-muted, #6b7280)",
    fontStyle: "italic",
    fontSize: 12,
    padding: "8px 0",
  } satisfies CSSProperties,
  sectionTitle: {
    fontWeight: 600,
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--color-text-muted, #6b7280)",
    marginTop: 12,
    marginBottom: 4,
  } satisfies CSSProperties,
};

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function ERPLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M7 7h10M7 11h6" />
    </svg>
  );
}

function StatRow({ label, value, color = "#6b7280" }: { label: string; value: number; color?: string }) {
  return (
    <div style={styles.statRow}>
      <span>{label}</span>
      <span style={styles.pill(value > 0 ? color : "#9ca3af")}>{value}</span>
    </div>
  );
}

function LastSync({ at }: { at?: string }) {
  if (!at) return <span style={styles.emptyMsg}>Never synced</span>;
  const d = new Date(at);
  return (
    <span style={{ color: "var(--color-text-muted, #6b7280)", fontSize: 11 }}>
      Last sync: {d.toLocaleDateString()} {d.toLocaleTimeString()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Widget — shows live counts from the last sync
// ---------------------------------------------------------------------------

export function ERPNextDashboardWidget({ context }: PluginWidgetProps) {
  const { data, loading, error } = usePluginData<StatsPayload>("erp-stats", {
    companyId: context.companyId ?? undefined,
  });

  const s = data?.syncStats ?? {};
  const acc = s.accounting ?? {};
  const sell = s.selling ?? {};

  return (
    <div style={{ ...styles.container, minWidth: 200 }}>
      <div style={styles.header}>
        <ERPLogo />
        <span>ERPNext</span>
      </div>
      {loading && <span style={styles.emptyMsg}>Loading…</span>}
      {error && <span style={{ ...styles.emptyMsg, color: "#ef4444" }}>Connection error</span>}
      {!loading && !error && (
        <>
          <LastSync at={data?.lastSyncAt} />
          <div style={{ marginTop: 8 }}>
            <StatRow label="Unpaid Invoices (AR)" value={acc.unpaidSalesInvoices?.length ?? 0} color="#f59e0b" />
            <StatRow label="Open Sales Orders" value={sell.openSalesOrders?.length ?? 0} color="#10b981" />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Link
// ---------------------------------------------------------------------------

export function ERPNextSidebarLink(_props: PluginSidebarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
      <ERPLogo />
      <span>ERPNext</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full Page — ERP Stats Overview
// ---------------------------------------------------------------------------

export function ERPNextPage({ context }: PluginPageProps) {
  const { data, loading, error } = usePluginData<StatsPayload>("erp-stats", {
    companyId: context.companyId ?? undefined,
  });

  if (loading) return <div style={styles.container}><span style={styles.emptyMsg}>Loading ERP data…</span></div>;
  if (error) return <div style={styles.container}><span style={{ ...styles.emptyMsg, color: "#ef4444" }}>Could not load ERP data: {error.message}</span></div>;

  const s = data?.syncStats ?? {};
  const acc = s.accounting ?? {};
  const sell = s.selling ?? {};
  const buy = s.buying ?? {};
  const stock = s.stock ?? {};
  const hr = s.hr ?? {};
  const deliveries = data?.webhookDeliveries ?? [];

  return (
    <div style={{ ...styles.container, maxWidth: 720 }}>
      <div style={{ ...styles.header, fontSize: 18, marginBottom: 16 }}>
        <ERPLogo />
        <span>ERPNext Overview</span>
        <LastSync at={data?.lastSyncAt} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div>
          <div style={styles.sectionTitle}>Accounting</div>
          <StatRow label="Unpaid Sales Invoices" value={acc.unpaidSalesInvoices?.length ?? 0} color="#f59e0b" />
          <StatRow label="Unpaid Purchase Invoices" value={acc.unpaidPurchaseInvoices?.length ?? 0} color="#ef4444" />
          <StatRow label="Draft Payment Entries" value={acc.draftPaymentEntries?.length ?? 0} color="#8b5cf6" />
        </div>
        <div>
          <div style={styles.sectionTitle}>Sales</div>
          <StatRow label="Open Sales Orders" value={sell.openSalesOrders?.length ?? 0} color="#10b981" />
          <StatRow label="Draft Quotations" value={sell.draftQuotations?.length ?? 0} color="#6b7280" />
        </div>
        <div>
          <div style={styles.sectionTitle}>Purchasing</div>
          <StatRow label="Open Purchase Orders" value={buy.openPurchaseOrders?.length ?? 0} color="#0ea5e9" />
          <StatRow label="Pending Material Requests" value={buy.pendingMaterialRequests?.length ?? 0} color="#f97316" />
        </div>
        <div>
          <div style={styles.sectionTitle}>Stock</div>
          <StatRow label="Draft Stock Entries" value={stock.draftStockEntries?.length ?? 0} color="#6b7280" />
          <StatRow label="Negative Stock Alerts" value={stock.negativeStockAlerts?.length ?? 0} color="#ef4444" />
        </div>
        <div>
          <div style={styles.sectionTitle}>HR</div>
          <StatRow label="Pending Leave Requests" value={hr.pendingLeaveApplications?.length ?? 0} color="#8b5cf6" />
          <StatRow label="Pending Expense Claims" value={hr.pendingExpenseClaims?.length ?? 0} color="#f59e0b" />
        </div>
        <div>
          <div style={styles.sectionTitle}>Recent Webhooks</div>
          {deliveries.length === 0 ? (
            <span style={styles.emptyMsg}>No events received yet</span>
          ) : (
            deliveries.slice(0, 5).map((d, i) => (
              <div key={i} style={{ fontSize: 11, padding: "3px 0", borderBottom: "1px solid var(--color-border, #e5e7eb)" }}>
                <strong>{d.event}</strong> — {d.doctype} {d.docname}
                <br />
                <span style={{ color: "var(--color-text-muted, #6b7280)" }}>
                  {new Date(d.receivedAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue Tab — linked ERP documents
// ---------------------------------------------------------------------------

export function ERPNextIssueTab({ context }: PluginDetailTabProps) {
  const { data: entities, loading, error } = usePluginData<ErpEntityRecord[]>("erp-entities", {
    scopeKind: "issue",
    scopeId: context.entityId,
  });

  const list = entities ?? [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <ERPLogo />
        <span>Linked ERP Documents</span>
        {list.length > 0 && <span style={styles.badge}>{list.length}</span>}
      </div>
      {loading && <span style={styles.emptyMsg}>Loading…</span>}
      {error && <span style={{ ...styles.emptyMsg, color: "#ef4444" }}>Error: {error.message}</span>}
      {!loading && !error && list.length === 0 && (
        <span style={styles.emptyMsg}>No ERP documents linked to this issue.</span>
      )}
      {!loading && !error && list.map((e) => (
        <div key={e.id} style={styles.statRow}>
          <div>
            <div style={{ fontWeight: 500 }}>{e.title ?? e.externalId}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted, #6b7280)" }}>
              {e.entityType} · {new Date(e.updatedAt).toLocaleDateString()}
            </div>
          </div>
          {e.status && (
            <span style={styles.pill(
              e.status === "submitted" ? "#10b981"
                : e.status === "cancelled" ? "#ef4444"
                : "#6b7280"
            )}>
              {e.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Tab — linked ERP documents at project scope
// ---------------------------------------------------------------------------

export function ERPNextProjectTab({ context }: PluginDetailTabProps) {
  const { data: entities, loading, error } = usePluginData<ErpEntityRecord[]>("erp-entities", {
    scopeKind: "project",
    scopeId: context.entityId,
  });

  const list = entities ?? [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <ERPLogo />
        <span>ERP Documents (Project)</span>
        {list.length > 0 && <span style={styles.badge}>{list.length}</span>}
      </div>
      {loading && <span style={styles.emptyMsg}>Loading…</span>}
      {error && <span style={{ ...styles.emptyMsg, color: "#ef4444" }}>Error: {error.message}</span>}
      {!loading && !error && list.length === 0 && (
        <span style={styles.emptyMsg}>No ERP documents linked to this project.</span>
      )}
      {!loading && !error && list.map((e) => (
        <div key={e.id} style={styles.statRow}>
          <span style={{ fontWeight: 500 }}>{e.title ?? e.externalId}</span>
          {e.status && <span style={styles.pill("#6b7280")}>{e.status}</span>}
        </div>
      ))}
    </div>
  );
}
