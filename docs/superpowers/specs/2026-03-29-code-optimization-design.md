# Code Optimization & Build Repair Design

> **Status:** Approved
> **Date:** 2026-03-29
> **Topic:** Fix build failures, clean up debug artifacts, and refactor synchronous blocking calls in the `aperant-workspace` plugin.

## 1. Goal
Restore codebase stability by fixing the broken build in the plugins workspace and optimize performance by refactoring synchronous Git operations to asynchronous ones in the `aperant-workspace` plugin.

## 2. Architecture & Cleanup
The project is a monorepo. Recently merged changes introduced debug files at the root and a new plugin (`aperant-workspace`) with invalid dependency versions and blocking I/O calls.

### Cleanup
- **Remove:** `server.log`, `ui.log`, `verify_cuj.py` from the root directory.
- **Update:** `.gitignore` to include `*.log` and common debug artifacts.

### Build Repair (aperant-workspace)
- **Dependency Fix:** Change `@types/node` from `^24.12.0` (invalid) to `^20.17.19` (matching the rest of the project).
- **TSConfig Fix:** Ensure `jsx: react-jsx` is set and `types` include `node` and `react`.
- **Dependency Sync:** Run `pnpm install --no-frozen-lockfile` to stabilize `pnpm-lock.yaml`.

## 3. Performance Optimization (Asynchronous Refactor)
The `aperant-workspace` plugin uses `spawnSync` for Git operations in `src/merge/orchestrator.ts`. This blocks the Node.js event loop.

### Approach
- **Refactor:** Replace `spawnSync` with a promise-based `spawn` wrapper.
- **Async Propagation:** Convert synchronous methods in `MergeOrchestrator` and `GitIsolation` utilities to `async` methods using `await`.
- **Concurrent Safety:** Ensure that asynchrony doesn't introduce race conditions in file system operations during merges.

## 4. Testing & Verification
- **Build:** `pnpm -r typecheck` must pass for all workspace projects.
- **Tests:** `pnpm --filter @paperclipai/aperant-workspace test` must pass after refactoring.
- **Integration:** Verify that the plugin still loads and functions correctly within the Paperclip server.

---
**Next Step:** Transition to the `writing-plans` skill to create a task-by-task implementation plan.
