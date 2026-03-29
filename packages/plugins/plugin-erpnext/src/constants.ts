export const PLUGIN_ID = "paperclip-erpnext";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "erpnext";

export const SLOT_IDS = {
  page: "erpnext-page",
  sidebar: "erpnext-sidebar-link",
  dashboardWidget: "erpnext-dashboard-widget",
  issueTab: "erpnext-issue-tab",
  projectTab: "erpnext-project-tab",
} as const;

export const EXPORT_NAMES = {
  page: "ERPNextPage",
  sidebar: "ERPNextSidebarLink",
  dashboardWidget: "ERPNextDashboardWidget",
  issueTab: "ERPNextIssueTab",
  projectTab: "ERPNextProjectTab",
} as const;

export const JOB_KEYS = {
  fullSync: "full-sync",
  pendingDocuments: "pending-documents",
} as const;

export const WEBHOOK_KEYS = {
  erpnextEvent: "erpnext-event",
} as const;

/**
 * Tools exposed to agents via the plugin tool registry.
 * Each name maps to a handler in worker.ts.
 */
export const TOOL_NAMES = {
  getDocument: "erp_get_document",
  listDocuments: "erp_list_documents",
  createDocument: "erp_create_document",
  updateDocument: "erp_update_document",
  submitDocument: "erp_submit_document",
  cancelDocument: "erp_cancel_document",
  callMethod: "erp_call_method",
  getReport: "erp_get_report",
  search: "erp_search",
  getStats: "erp_get_stats",
} as const;

/**
 * Plugin state keys (instance-scoped unless noted).
 */
export const STATE_KEYS = {
  lastSyncAt: "last_sync_at",
  syncStats: "sync_stats",
  webhookDeliveries: "webhook_deliveries",
} as const;

/**
 * ERPNext module → relevant doctypes mapping.
 * Used by agents to understand what they can interact with.
 */
export const ERP_MODULES = {
  accounting: {
    label: "Accounting",
    doctypes: ["Sales Invoice", "Purchase Invoice", "Payment Entry", "Journal Entry", "Account", "Cost Center"],
  },
  selling: {
    label: "Selling",
    doctypes: ["Customer", "Quotation", "Sales Order", "Delivery Note", "Sales Invoice"],
  },
  buying: {
    label: "Buying",
    doctypes: ["Supplier", "Purchase Order", "Purchase Receipt", "Purchase Invoice", "Material Request"],
  },
  stock: {
    label: "Stock",
    doctypes: ["Item", "Warehouse", "Stock Entry", "Delivery Note", "Purchase Receipt", "Bin"],
  },
  hr: {
    label: "HR",
    doctypes: ["Employee", "Leave Application", "Attendance", "Salary Slip", "Expense Claim", "Job Opening"],
  },
  projects: {
    label: "Projects",
    doctypes: ["Project", "Task", "Timesheet", "Activity Cost"],
  },
  crm: {
    label: "CRM",
    doctypes: ["Lead", "Opportunity", "Contact", "Address", "Campaign", "Contract"],
  },
  manufacturing: {
    label: "Manufacturing",
    doctypes: ["BOM", "Work Order", "Job Card", "Production Plan"],
  },
} as const;
