# Project Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the codebase, fix broken build dependencies in `aperant-workspace`, and optimize performance by making synchronous Git operations asynchronous.

**Architecture:** Use promise-based process spawning to replace blocking `spawnSync` calls and fix monorepo dependency linking.

**Tech Stack:** Node.js, TypeScript, Drizzle ORM, pnpm, Git.

---

### Task 1: Cleanup & Hygiene

**Files:**
- Remove: `server.log`, `ui.log`, `verify_cuj.py`
- Modify: `.gitignore`

- [ ] **Step 1: Delete debug files**

Run: `rm server.log ui.log verify_cuj.py`

- [ ] **Step 2: Update .gitignore**

Add `*.log` to the root `.gitignore` to prevent future clutter.

- [ ] **Step 3: Commit cleanup**

```bash
git add .gitignore
git rm server.log ui.log verify_cuj.py
git commit -m "chore: cleanup debug logs and update .gitignore"
```

### Task 2: Fix Plugin Dependencies & Build

**Files:**
- Modify: `packages/plugins/aperant-workspace/package.json`
- Modify: `packages/plugins/aperant-workspace/tsconfig.json`

- [ ] **Step 1: Fix @types/node version**

Change `"@types/node": "^24.12.0"` to `"@types/node": "^20.17.19"` in `packages/plugins/aperant-workspace/package.json`.

- [ ] **Step 2: Add React to peerDependencies**

Add `"react": ">=18"`, `"react-dom": ">=18"` if missing, and ensure devDependencies include `@types/react` and `@types/react-dom`.

- [ ] **Step 3: Update tsconfig.json**

Ensure `jsx` is set to `react-jsx` and `types` are correctly configured.

- [ ] **Step 4: Run clean install**

Run: `pnpm install --no-frozen-lockfile --no-interactive`

- [ ] **Step 5: Verify types**

Run: `pnpm --filter @paperclipai/aperant-workspace typecheck`

### Task 3: Asynchronous Refactoring of Git Operations

**Files:**
- Create/Modify: `packages/plugins/aperant-workspace/src/utils/spawn-promise.ts`
- Modify: `packages/plugins/aperant-workspace/src/merge/orchestrator.ts`
- Modify: `packages/plugins/aperant-workspace/src/utils/git-isolation.ts`

- [ ] **Step 1: Create spawnPromise utility**

Implement a robust async wrapper for Node's `spawn`.

- [ ] **Step 2: Refactor GitIsolation to async**

Update `provisionWorktree`, `cleanupWorktree`, etc., to return `Promise<void>` and use `spawnPromise`.

- [ ] **Step 3: Refactor MergeOrchestrator to async**

Change `spawnSync` calls in `getFileFromBranch` and other core merge methods to `await spawnPromise`.

- [ ] **Step 4: Propagate async to consumers**

Update `src/worker.ts` or any other callers to handle the new `async` methods.

### Task 4: Final Validation

- [ ] **Step 1: Run full monorepo typecheck**

Run: `pnpm -r typecheck`

- [ ] **Step 2: Run plugin tests**

Run: `pnpm --filter @paperclipai/aperant-workspace test`

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "perf: optimize plugin git operations to be asynchronous and fix build dependencies"
```
