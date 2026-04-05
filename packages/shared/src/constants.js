const COMPANY_STATUSES = ["active", "paused", "archived"];
const DEPLOYMENT_MODES = ["local_trusted", "authenticated"];
const DEPLOYMENT_EXPOSURES = ["private", "public"];
const AUTH_BASE_URL_MODES = ["auto", "explicit"];
const AGENT_STATUSES = [
  "active",
  "paused",
  "idle",
  "running",
  "error",
  "pending_approval",
  "terminated"
];
const AGENT_ADAPTER_TYPES = [
  "process",
  "http",
  "claude_local",
  "codex_local",
  "gemini_local",
  "opencode_local",
  "pi_local",
  "cursor",
  "openclaw_gateway",
  "hermes_local"
];
const AGENT_ROLES = [
  "ceo",
  "cto",
  "cmo",
  "cfo",
  "engineer",
  "designer",
  "pm",
  "qa",
  "devops",
  "researcher",
  "general"
];
const AGENT_ROLE_LABELS = {
  ceo: "CEO",
  cto: "CTO",
  cmo: "CMO",
  cfo: "CFO",
  engineer: "Engineer",
  designer: "Designer",
  pm: "PM",
  qa: "QA",
  devops: "DevOps",
  researcher: "Researcher",
  general: "General"
};
const AGENT_ICON_NAMES = [
  "bot",
  "cpu",
  "brain",
  "zap",
  "rocket",
  "code",
  "terminal",
  "shield",
  "eye",
  "search",
  "wrench",
  "hammer",
  "lightbulb",
  "sparkles",
  "star",
  "heart",
  "flame",
  "bug",
  "cog",
  "database",
  "globe",
  "lock",
  "mail",
  "message-square",
  "file-code",
  "git-branch",
  "package",
  "puzzle",
  "target",
  "wand",
  "atom",
  "circuit-board",
  "radar",
  "swords",
  "telescope",
  "microscope",
  "crown",
  "gem",
  "hexagon",
  "pentagon",
  "fingerprint"
];
const ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled"
];
const INBOX_MINE_ISSUE_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done"
];
const INBOX_MINE_ISSUE_STATUS_FILTER = INBOX_MINE_ISSUE_STATUSES.join(",");
const ISSUE_PRIORITIES = ["critical", "high", "medium", "low"];
const PROOF_TIERS = [0, 1, 2, 3];
const RBAC_SCOPES = [
  "finance",
  "strategic_vision",
  "source_code",
  "legal",
  "hr",
  "ops",
  "general"
];
const ISSUE_ORIGIN_KINDS = ["manual", "routine_execution"];
const GOAL_LEVELS = ["company", "team", "agent", "task"];
const GOAL_STATUSES = ["planned", "active", "achieved", "cancelled"];
const PROJECT_STATUSES = [
  "backlog",
  "planned",
  "in_progress",
  "completed",
  "cancelled"
];
const ROUTINE_STATUSES = ["active", "paused", "archived"];
const ROUTINE_CONCURRENCY_POLICIES = ["coalesce_if_active", "always_enqueue", "skip_if_active"];
const ROUTINE_CATCH_UP_POLICIES = ["skip_missed", "enqueue_missed_with_cap"];
const ROUTINE_TRIGGER_KINDS = ["schedule", "webhook", "api"];
const ROUTINE_TRIGGER_SIGNING_MODES = ["bearer", "hmac_sha256"];
const ROUTINE_VARIABLE_TYPES = ["text", "textarea", "number", "boolean", "select"];
const ROUTINE_RUN_STATUSES = [
  "received",
  "coalesced",
  "skipped",
  "issue_created",
  "completed",
  "failed"
];
const ROUTINE_RUN_SOURCES = ["schedule", "manual", "api", "webhook"];
const COMPANY_LESSON_STATUSES = ["draft", "active", "archived"];
const PAUSE_REASONS = ["manual", "budget", "system"];
const PROJECT_COLORS = [
  "#6366f1",
  // indigo
  "#8b5cf6",
  // violet
  "#ec4899",
  // pink
  "#ef4444",
  // red
  "#f97316",
  // orange
  "#eab308",
  // yellow
  "#22c55e",
  // green
  "#14b8a6",
  // teal
  "#06b6d4",
  // cyan
  "#3b82f6"
  // blue
];
const APPROVAL_TYPES = [
  "hire_agent",
  "approve_ceo_strategy",
  "budget_override_required",
  "peer_review",
  "llm_judge"
];
const APPROVAL_STATUSES = [
  "pending",
  "revision_requested",
  "approved",
  "rejected",
  "cancelled"
];
const SECRET_PROVIDERS = [
  "local_encrypted",
  "aws_secrets_manager",
  "gcp_secret_manager",
  "vault"
];
const STORAGE_PROVIDERS = ["local_disk", "s3"];
const BILLING_TYPES = [
  "metered_api",
  "subscription_included",
  "subscription_overage",
  "credits",
  "fixed",
  "unknown"
];
const FINANCE_EVENT_KINDS = [
  "inference_charge",
  "platform_fee",
  "credit_purchase",
  "credit_refund",
  "credit_expiry",
  "byok_fee",
  "gateway_overhead",
  "log_storage_charge",
  "logpush_charge",
  "provisioned_capacity_charge",
  "training_charge",
  "custom_model_import_charge",
  "custom_model_storage_charge",
  "manual_adjustment"
];
const FINANCE_DIRECTIONS = ["debit", "credit"];
const FINANCE_UNITS = [
  "input_token",
  "output_token",
  "cached_input_token",
  "request",
  "credit_usd",
  "credit_unit",
  "model_unit_minute",
  "model_unit_hour",
  "gb_month",
  "train_token",
  "unknown"
];
const BUDGET_SCOPE_TYPES = ["company", "agent", "project"];
const BUDGET_METRICS = ["billed_cents"];
const BUDGET_WINDOW_KINDS = ["calendar_month_utc", "lifetime"];
const BUDGET_THRESHOLD_TYPES = ["soft", "hard"];
const BUDGET_INCIDENT_STATUSES = ["open", "resolved", "dismissed"];
const BUDGET_INCIDENT_RESOLUTION_ACTIONS = [
  "keep_paused",
  "raise_budget_and_resume"
];
const HEARTBEAT_INVOCATION_SOURCES = [
  "timer",
  "assignment",
  "on_demand",
  "automation"
];
const WAKEUP_TRIGGER_DETAILS = ["manual", "ping", "callback", "system"];
const WAKEUP_REQUEST_STATUSES = [
  "queued",
  "deferred_issue_execution",
  "claimed",
  "coalesced",
  "skipped",
  "completed",
  "failed",
  "cancelled"
];
const HEARTBEAT_RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out"
];
const LIVE_EVENT_TYPES = [
  "heartbeat.run.queued",
  "heartbeat.run.status",
  "heartbeat.run.event",
  "heartbeat.run.log",
  "agent.status",
  "activity.logged",
  "plugin.ui.updated",
  "plugin.worker.crashed",
  "plugin.worker.restarted"
];
const PRINCIPAL_TYPES = ["user", "agent"];
const MEMBERSHIP_STATUSES = ["pending", "active", "suspended"];
const INSTANCE_USER_ROLES = ["instance_admin"];
const INVITE_TYPES = ["company_join", "bootstrap_ceo"];
const INVITE_JOIN_TYPES = ["human", "agent", "both"];
const JOIN_REQUEST_TYPES = ["human", "agent"];
const JOIN_REQUEST_STATUSES = ["pending_approval", "approved", "rejected"];
const PERMISSION_KEYS = [
  "agents:create",
  "users:invite",
  "users:manage_permissions",
  "tasks:assign",
  "tasks:assign_scope",
  "joins:approve"
];
const PLUGIN_API_VERSION = 1;
const PLUGIN_STATUSES = [
  "installed",
  "ready",
  "disabled",
  "error",
  "upgrade_pending",
  "uninstalled"
];
const PLUGIN_CATEGORIES = [
  "connector",
  "workspace",
  "automation",
  "ui"
];
const PLUGIN_CAPABILITIES = [
  // Data Read
  "companies.read",
  "projects.read",
  "project.workspaces.read",
  "issues.read",
  "issue.comments.read",
  "issue.documents.read",
  "agents.read",
  "goals.read",
  "goals.create",
  "goals.update",
  "activity.read",
  "costs.read",
  // Data Write
  "issues.create",
  "issues.update",
  "issue.comments.create",
  "issue.documents.write",
  "agents.pause",
  "agents.resume",
  "agents.invoke",
  "agent.sessions.create",
  "agent.sessions.list",
  "agent.sessions.send",
  "agent.sessions.close",
  "activity.log.write",
  "metrics.write",
  "telemetry.track",
  // Plugin State
  "plugin.state.read",
  "plugin.state.write",
  // Runtime / Integration
  "events.subscribe",
  "events.emit",
  "jobs.schedule",
  "webhooks.receive",
  "http.outbound",
  "secrets.read-ref",
  // Agent Tools
  "agent.tools.register",
  // UI
  "instance.settings.register",
  "ui.sidebar.register",
  "ui.page.register",
  "ui.detailTab.register",
  "ui.dashboardWidget.register",
  "ui.commentAnnotation.register",
  "ui.action.register"
];
const PLUGIN_UI_SLOT_TYPES = [
  "page",
  "detailTab",
  "taskDetailView",
  "dashboardWidget",
  "sidebar",
  "sidebarPanel",
  "projectSidebarItem",
  "globalToolbarButton",
  "toolbarButton",
  "contextMenuItem",
  "commentAnnotation",
  "commentContextMenuItem",
  "settingsPage"
];
const PLUGIN_RESERVED_COMPANY_ROUTE_SEGMENTS = [
  "dashboard",
  "onboarding",
  "companies",
  "company",
  "settings",
  "plugins",
  "org",
  "agents",
  "projects",
  "issues",
  "goals",
  "approvals",
  "costs",
  "activity",
  "inbox",
  "design-guide",
  "tests"
];
const PLUGIN_LAUNCHER_PLACEMENT_ZONES = [
  "page",
  "detailTab",
  "taskDetailView",
  "dashboardWidget",
  "sidebar",
  "sidebarPanel",
  "projectSidebarItem",
  "globalToolbarButton",
  "toolbarButton",
  "contextMenuItem",
  "commentAnnotation",
  "commentContextMenuItem",
  "settingsPage"
];
const PLUGIN_LAUNCHER_ACTIONS = [
  "navigate",
  "openModal",
  "openDrawer",
  "openPopover",
  "performAction",
  "deepLink"
];
const PLUGIN_LAUNCHER_BOUNDS = [
  "inline",
  "compact",
  "default",
  "wide",
  "full"
];
const PLUGIN_LAUNCHER_RENDER_ENVIRONMENTS = [
  "hostInline",
  "hostOverlay",
  "hostRoute",
  "external",
  "iframe"
];
const PLUGIN_UI_SLOT_ENTITY_TYPES = [
  "project",
  "issue",
  "agent",
  "goal",
  "run",
  "comment"
];
const PLUGIN_STATE_SCOPE_KINDS = [
  "instance",
  "company",
  "project",
  "project_workspace",
  "agent",
  "issue",
  "goal",
  "run"
];
const PLUGIN_JOB_STATUSES = [
  "active",
  "paused",
  "failed"
];
const PLUGIN_JOB_RUN_STATUSES = [
  "pending",
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
];
const PLUGIN_JOB_RUN_TRIGGERS = [
  "schedule",
  "manual",
  "retry"
];
const PLUGIN_WEBHOOK_DELIVERY_STATUSES = [
  "pending",
  "success",
  "failed"
];
const PLUGIN_EVENT_TYPES = [
  "company.created",
  "company.updated",
  "project.created",
  "project.updated",
  "project.workspace_created",
  "project.workspace_updated",
  "project.workspace_deleted",
  "issue.created",
  "issue.updated",
  "issue.comment.created",
  "agent.created",
  "agent.updated",
  "agent.status_changed",
  "agent.run.started",
  "agent.run.finished",
  "agent.run.failed",
  "agent.run.cancelled",
  "goal.created",
  "goal.updated",
  "approval.created",
  "approval.decided",
  "cost_event.created",
  "activity.logged"
];
const PLUGIN_BRIDGE_ERROR_CODES = [
  "WORKER_UNAVAILABLE",
  "CAPABILITY_DENIED",
  "WORKER_ERROR",
  "TIMEOUT",
  "UNKNOWN"
];
export {
  AGENT_ADAPTER_TYPES,
  AGENT_ICON_NAMES,
  AGENT_ROLES,
  AGENT_ROLE_LABELS,
  AGENT_STATUSES,
  APPROVAL_STATUSES,
  APPROVAL_TYPES,
  AUTH_BASE_URL_MODES,
  BILLING_TYPES,
  BUDGET_INCIDENT_RESOLUTION_ACTIONS,
  BUDGET_INCIDENT_STATUSES,
  BUDGET_METRICS,
  BUDGET_SCOPE_TYPES,
  BUDGET_THRESHOLD_TYPES,
  BUDGET_WINDOW_KINDS,
  COMPANY_LESSON_STATUSES,
  COMPANY_STATUSES,
  DEPLOYMENT_EXPOSURES,
  DEPLOYMENT_MODES,
  FINANCE_DIRECTIONS,
  FINANCE_EVENT_KINDS,
  FINANCE_UNITS,
  GOAL_LEVELS,
  GOAL_STATUSES,
  HEARTBEAT_INVOCATION_SOURCES,
  HEARTBEAT_RUN_STATUSES,
  INBOX_MINE_ISSUE_STATUSES,
  INBOX_MINE_ISSUE_STATUS_FILTER,
  INSTANCE_USER_ROLES,
  INVITE_JOIN_TYPES,
  INVITE_TYPES,
  ISSUE_ORIGIN_KINDS,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  JOIN_REQUEST_STATUSES,
  JOIN_REQUEST_TYPES,
  LIVE_EVENT_TYPES,
  MEMBERSHIP_STATUSES,
  PAUSE_REASONS,
  PERMISSION_KEYS,
  PLUGIN_API_VERSION,
  PLUGIN_BRIDGE_ERROR_CODES,
  PLUGIN_CAPABILITIES,
  PLUGIN_CATEGORIES,
  PLUGIN_EVENT_TYPES,
  PLUGIN_JOB_RUN_STATUSES,
  PLUGIN_JOB_RUN_TRIGGERS,
  PLUGIN_JOB_STATUSES,
  PLUGIN_LAUNCHER_ACTIONS,
  PLUGIN_LAUNCHER_BOUNDS,
  PLUGIN_LAUNCHER_PLACEMENT_ZONES,
  PLUGIN_LAUNCHER_RENDER_ENVIRONMENTS,
  PLUGIN_RESERVED_COMPANY_ROUTE_SEGMENTS,
  PLUGIN_STATE_SCOPE_KINDS,
  PLUGIN_STATUSES,
  PLUGIN_UI_SLOT_ENTITY_TYPES,
  PLUGIN_UI_SLOT_TYPES,
  PLUGIN_WEBHOOK_DELIVERY_STATUSES,
  PRINCIPAL_TYPES,
  PROJECT_COLORS,
  PROJECT_STATUSES,
  PROOF_TIERS,
  RBAC_SCOPES,
  ROUTINE_CATCH_UP_POLICIES,
  ROUTINE_CONCURRENCY_POLICIES,
  ROUTINE_RUN_SOURCES,
  ROUTINE_RUN_STATUSES,
  ROUTINE_STATUSES,
  ROUTINE_TRIGGER_KINDS,
  ROUTINE_TRIGGER_SIGNING_MODES,
  ROUTINE_VARIABLE_TYPES,
  SECRET_PROVIDERS,
  STORAGE_PROVIDERS,
  WAKEUP_REQUEST_STATUSES,
  WAKEUP_TRIGGER_DETAILS
};
