/**
 * ERPNext plugin UI components.
 *
 * Pattern: register data handlers in worker.ts with ctx.data.register(),
 * consume them here with usePluginData(key, params).
 */
import { type CSSProperties, useState } from "react";
import {
  usePluginData,
  usePluginAction,
  type PluginCommentAnnotationProps,
  type PluginDetailTabProps,
  type PluginPageProps,
  type PluginSidebarProps,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";
import { ACTION_KEYS } from "../constants.js";

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
// Shared components
// ---------------------------------------------------------------------------

function ERPLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M7 7h10M7 11h6" />
    </svg>
  );
}

function StatRow({ label, value, colorClass = "bg-slate-500" }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
      <span className="text-sm text-foreground/70">{label}</span>
      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${value > 0 ? colorClass : "bg-muted-foreground/30"}`}>
        {value}
      </span>
    </div>
  );
}

function LastSync({ at }: { at?: string }) {
  if (!at) return <span className="text-xs italic text-muted-foreground">Never synced</span>;
  const d = new Date(at);
  return (
    <span className="text-[10px] text-muted-foreground">
      Last sync: {d.toLocaleDateString()} {d.toLocaleTimeString()}
    </span>
  );
}

function SyncButton() {
  const [loading, setLoading] = useState(false);
  const triggerSync = usePluginAction(ACTION_KEYS.syncNow);

  const handleSync = async () => {
    setLoading(true);
    try {
      await triggerSync({});
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
    >
      <svg className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
      {loading ? "Syncing..." : "Sync Now"}
    </button>
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
    <div className="bg-card p-4 rounded-lg border border-border min-w-[200px] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <ERPLogo />
          <span>ERPNext</span>
        </div>
        <SyncButton />
      </div>
      
      {loading && <span className="text-sm italic text-muted-foreground">Loading…</span>}
      {error && <span className="text-sm italic text-destructive">Connection error</span>}
      
      {!loading && !error && (
        <>
          <LastSync at={data?.lastSyncAt} />
          <div className="mt-3 space-y-0.5">
            <StatRow label="Unpaid Invoices (AR)" value={acc.unpaidSalesInvoices?.length ?? 0} colorClass="bg-amber-500" />
            <StatRow label="Open Sales Orders" value={sell.openSalesOrders?.length ?? 0} colorClass="bg-emerald-500" />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Link
// ---------------------------------------------------------------------------

function hostPath(companyPrefix: string | null | undefined, suffix: string): string {
  return companyPrefix ? `/${companyPrefix}${suffix}` : suffix;
}

export function ERPNextSidebarLink({ context }: PluginSidebarProps) {
  const href = hostPath(context.companyPrefix, "/erpnext");
  const isActive = typeof window !== "undefined" && window.location.pathname === href;
  
  return (
    <a
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-[var(--radius-sm)] ${
        isActive
          ? "bg-accent text-foreground"
          : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <span className="shrink-0">
        <ERPLogo />
      </span>
      <span className="flex-1 truncate">ERPNext</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Full Page — ERP Stats Overview
// ---------------------------------------------------------------------------

export function ERPNextPage({ context }: PluginPageProps) {
  const { data, loading, error } = usePluginData<StatsPayload>("erp-stats", {
    companyId: context.companyId ?? undefined,
  });

  if (loading) return (
    <div className="p-6 flex items-center justify-center">
      <span className="text-sm italic text-muted-foreground">Loading ERP data…</span>
    </div>
  );
  
  if (error) return (
    <div className="p-6">
      <span className="text-sm italic text-destructive font-medium">Could not load ERP data: {error.message}</span>
    </div>
  );

  const s = data?.syncStats ?? {};
  const acc = s.accounting ?? {};
  const sell = s.selling ?? {};
  const buy = s.buying ?? {};
  const stock = s.stock ?? {};
  const hr = s.hr ?? {};
  const deliveries = data?.webhookDeliveries ?? [];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ERPLogo />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ERPNext Overview</h1>
            <LastSync at={data?.lastSyncAt} />
          </div>
        </div>
        <SyncButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Accounting</h2>
          <StatRow label="Unpaid Sales Invoices" value={acc.unpaidSalesInvoices?.length ?? 0} colorClass="bg-amber-500" />
          <StatRow label="Unpaid Purchase Invoices" value={acc.unpaidPurchaseInvoices?.length ?? 0} colorClass="bg-red-500" />
          <StatRow label="Draft Payment Entries" value={acc.draftPaymentEntries?.length ?? 0} colorClass="bg-violet-500" />
        </section>

        <section className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sales</h2>
          <StatRow label="Open Sales Orders" value={sell.openSalesOrders?.length ?? 0} colorClass="bg-emerald-500" />
          <StatRow label="Draft Quotations" value={sell.draftQuotations?.length ?? 0} colorClass="bg-slate-500" />
        </section>

        <section className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Purchasing</h2>
          <StatRow label="Open Purchase Orders" value={buy.openPurchaseOrders?.length ?? 0} colorClass="bg-sky-500" />
          <StatRow label="Pending Material Requests" value={buy.pendingMaterialRequests?.length ?? 0} colorClass="bg-orange-500" />
        </section>

        <section className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Stock</h2>
          <StatRow label="Draft Stock Entries" value={stock.draftStockEntries?.length ?? 0} colorClass="bg-slate-500" />
          <StatRow label="Negative Stock Alerts" value={stock.negativeStockAlerts?.length ?? 0} colorClass="bg-red-500" />
        </section>

        <section className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">HR</h2>
          <StatRow label="Pending Leave Requests" value={hr.pendingLeaveApplications?.length ?? 0} colorClass="bg-violet-500" />
          <StatRow label="Pending Expense Claims" value={hr.pendingExpenseClaims?.length ?? 0} colorClass="bg-amber-500" />
        </section>

        <section className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Recent Webhooks</h2>
          {deliveries.length === 0 ? (
            <span className="text-xs italic text-muted-foreground">No events received yet</span>
          ) : (
            <div className="space-y-2">
              {deliveries.slice(0, 5).map((d, i) => (
                <div key={i} className="text-[11px] py-1.5 border-b border-border last:border-0">
                  <div className="flex justify-between items-start">
                    <strong className="font-semibold text-foreground">{d.event}</strong>
                    <span className="text-muted-foreground">{new Date(d.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-muted-foreground truncate">{d.doctype} {d.docname}</div>
                </div>
              ))}
            </div>
          )}
        </section>
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
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="text-primary">
          <ERPLogo />
        </div>
        <h2 className="font-semibold text-sm">Linked ERP Documents</h2>
        {list.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
            {list.length}
          </span>
        )}
      </div>

      {loading && <span className="text-sm italic text-muted-foreground">Loading…</span>}
      {error && <span className="text-sm italic text-destructive">Error: {error.message}</span>}
      
      {!loading && !error && list.length === 0 && (
        <span className="text-sm italic text-muted-foreground block py-4">No ERP documents linked to this issue.</span>
      )}

      {!loading && !error && (
        <div className="space-y-1">
          {list.map((e) => (
            <div key={e.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
              <div>
                <div className="text-sm font-medium">{e.title ?? e.externalId}</div>
                <div className="text-[11px] text-muted-foreground">
                  {e.entityType} · {new Date(e.updatedAt).toLocaleDateString()}
                </div>
              </div>
              {e.status && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                  e.status === "submitted" ? "bg-emerald-500"
                    : e.status === "cancelled" ? "bg-red-500"
                    : "bg-slate-500"
                }`}>
                  {e.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
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
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="text-primary">
          <ERPLogo />
        </div>
        <h2 className="font-semibold text-sm">ERP Documents (Project)</h2>
        {list.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
            {list.length}
          </span>
        )}
      </div>

      {loading && <span className="text-sm italic text-muted-foreground">Loading…</span>}
      {error && <span className="text-sm italic text-destructive">Error: {error.message}</span>}

      {!loading && !error && list.length === 0 && (
        <span className="text-sm italic text-muted-foreground block py-4">No ERP documents linked to this project.</span>
      )}

      {!loading && !error && (
        <div className="space-y-1">
          {list.map((e) => (
            <div key={e.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
              <span className="text-sm font-medium">{e.title ?? e.externalId}</span>
              {e.status && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500 text-white">
                  {e.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment Annotation — detect ERP IDs and show status
// ---------------------------------------------------------------------------

export function ERPNextCommentAnnotation({ context }: PluginCommentAnnotationProps) {
  // We use entityId which is the comment ID.
  // Note: The SDK currently doesn't provide commentBody in props for v1.
  // A future version might, but for now we'll assume it needs to be fetched
  // or that this slot only renders if metadata is attached.
  // For this integration, we'll try to fetch the comment details via usePluginData
  // if we want to parse it, OR we rely on the host passing custom data.
  
  // Placeholder logic for demonstration: 
  // In a real native integration, the host should pass the mention context.
  return null; 
}
