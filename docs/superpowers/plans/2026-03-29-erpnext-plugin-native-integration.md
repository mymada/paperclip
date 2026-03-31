# ERPNext Plugin Native Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the ERPNext plugin into a native-feel extension with Tailwind styling, smart comment annotations, and bidirectional actions.

**Architecture:** Refactor the UI bundle to use Tailwind CSS and host design tokens. Enhance the plugin manifest and worker to support interactive actions and conversation augmentation.

**Tech Stack:** React, Tailwind CSS, TypeScript, Paperclip Plugin SDK.

---

### Task 1: UI Style Refactoring & Manifest Update

**Files:**
- Modify: `packages/plugins/plugin-erpnext/src/manifest.ts`
- Modify: `packages/plugins/plugin-erpnext/src/ui/index.tsx`

- [ ] **Step 1: Update Manifest Capabilities**

Add `ui.commentAnnotation.register` to the `capabilities` array in `packages/plugins/plugin-erpnext/src/manifest.ts`.

- [ ] **Step 2: Replace Inline Styles with Tailwind in SidebarLink**

```tsx
// Before:
export function ERPNextSidebarLink(_props: PluginSidebarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
      <ERPLogo />
      <span>ERPNext</span>
    </div>
  );
}

// After:
export function ERPNextSidebarLink(_props: PluginSidebarProps) {
  return (
    <div className="flex items-center gap-2 py-1 text-foreground/80 hover:text-foreground transition-colors cursor-pointer">
      <ERPLogo />
      <span className="text-sm font-medium">ERPNext</span>
    </div>
  );
}
```

- [ ] **Step 3: Refactor Dashboard Widget**

Remove the `styles` object and use Tailwind classes like `bg-card`, `p-4`, `rounded-lg`, `border-border`. Ensure the typography matches the host's sidebar widgets.

- [ ] **Step 4: Refactor Main Page & Tabs**

Apply Tailwind classes to `ERPNextPage`, `ERPNextIssueTab`, and `ERPNextProjectTab`. Remove hardcoded `maxWidth` and use `w-full max-w-4xl mx-auto` (or similar responsive classes).

- [ ] **Step 5: Commit UI Refactor**

```bash
git add packages/plugins/plugin-erpnext/src/ui/index.tsx packages/plugins/plugin-erpnext/src/manifest.ts
git commit -m "style: refactor ERPNext UI to use Tailwind CSS and native design tokens"
```

### Task 2: Implement Interactive Actions (Sync Now)

**Files:**
- Modify: `packages/plugins/plugin-erpnext/src/constants.ts`
- Modify: `packages/plugins/plugin-erpnext/src/worker.ts`
- Modify: `packages/plugins/plugin-erpnext/src/ui/index.tsx`

- [ ] **Step 1: Define ACTION_KEYS**

Add `syncNow: "sync-now"` to `ACTION_KEYS` in `packages/plugins/plugin-erpnext/src/constants.ts`.

- [ ] **Step 2: Implement performAction in Worker**

In `packages/plugins/plugin-erpnext/src/worker.ts`, add:

```typescript
ctx.onAction(ACTION_KEYS.syncNow, async () => {
  await ctx.jobs.run(JOB_KEYS.fullSync);
  return { success: true, timestamp: new Date().toISOString() };
});
```

- [ ] **Step 3: Add Sync Button to UI**

Use `usePluginAction(ACTION_KEYS.syncNow)` in `ERPNextPage` and `ERPNextDashboardWidget`. Add a button with a loading state.

- [ ] **Step 4: Commit Actions**

```bash
git add packages/plugins/plugin-erpnext/src/
git commit -m "feat: add 'Sync Now' action to ERPNext plugin UI"
```

### Task 3: Implement Smart Comment Annotations

**Files:**
- Modify: `packages/plugins/plugin-erpnext/src/manifest.ts`
- Modify: `packages/plugins/plugin-erpnext/src/ui/index.tsx`
- Modify: `packages/plugins/plugin-erpnext/src/worker.ts`

- [ ] **Step 1: Register Comment Annotation Slot**

Add the `commentAnnotation` slot to `ui.slots` in `manifest.ts`.

- [ ] **Step 2: Implement ERPNextCommentAnnotation Component**

Create the component in `ui/index.tsx`. It should:
1. Parse `context.commentBody` (if available in props) or rely on a regex match.
2. Use `usePluginData("erp-doc-status", { id })` to fetch document status.
3. Render a native-looking badge (e.g., `flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`).

- [ ] **Step 3: Implement get-doc-status in Worker**

Register a data handler in `worker.ts` that fetches the status of a specific ERP document by its ID (e.g., `SINV-001`).

- [ ] **Step 4: Commit Annotations**

```bash
git add packages/plugins/plugin-erpnext/src/
git commit -m "feat: implement smart comment annotations for ERP document IDs"
```

### Task 4: Final Validation

- [ ] **Step 1: Verify Theme Compliance**

Check Light and Dark modes. The Tailwind classes should automatically respond if using `dark:` modifiers or if Paperclip's theme variables are correctly mapped.

- [ ] **Step 2: Full Build Test**

Run: `pnpm --filter @paperclipai/plugin-erpnext build`

- [ ] **Step 3: Integration Smoke Test**

Verify that clicking "Sync Now" updates the "Last Sync" timestamp in the UI. Post a comment with "SINV-00001" and check for the annotation badge.

- [ ] **Step 4: Final Commit**

```bash
git add .
git commit -m "chore: finalize ERPNext plugin native integration"
```
