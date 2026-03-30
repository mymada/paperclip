# Skill Design: Paperclip Plugin Authoring (Native Standard)

> **Status:** Draft
> **Date:** 2026-03-29
> **Topic:** Creating a high-quality guide for building Paperclip plugins that feel like native components.

## 1. Goal
Provide a comprehensive skill that guides agents and developers through the creation of Paperclip plugins that are:
- **SDK v1 Compliant:** Using `ctx.actions.register`, `ctx.data.register`, and `ctx.jobs.register`.
- **Visually Native:** Using Tailwind CSS and Paperclip design tokens.
- **Agent-Ready:** Including `bootstrapAgents` for automated specialized agent deployment.
- **Well-Structured:** Clean separation between Worker and UI.

## 2. Skill Content Structure (`SKILL.md`)

### A. Pre-flight Checklist
- Capability audit (which `capabilities` are actually needed?).
- UI Slot selection (`page`, `sidebar`, `detailTab`, `commentAnnotation`).
- Bootstrap Agent roles (Manager vs. Specialist).

### B. Scaffold Workflow
- Use `@paperclipai/create-paperclip-plugin` for initial structure.
- Correct directory: `packages/plugins/`.

### C. Native Code Blueprints
- **Manifest Blueprint:** Schema for `bootstrapAgents` and `ui.slots`.
- **Worker Blueprint:** SDK v1 patterns, state management, and event handling.
- **UI Blueprint:** Tailwind classes, responsive layouts, and standard hooks (`usePluginData`, `usePluginAction`).

### D. Integration & Wiring
- Registration in `server/src/routes/plugins.ts`.
- Environment variable configuration.

### E. Validation Suite
- Typecheck, Tests, Build.
- Visual consistency check.

## 3. Implementation Strategy
1.  Update the existing `skills/paperclip-create-plugin/SKILL.md` with these enhanced standards.
2.  Ensure the skill is registered in the `company_skills` table (via a script similar to `install-superpowers.cjs`).

---
**Next Step:** Transition to `writing-plans` to update the skill and register it.
