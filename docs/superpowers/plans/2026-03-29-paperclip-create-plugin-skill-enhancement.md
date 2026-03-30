# Enhanced Paperclip Plugin Creation Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `paperclip-create-plugin` skill to include Paperclip's native design standards, SDK v1 compliance, and bootstrap agent patterns.

**Architecture:** Rewrite the `SKILL.md` content and register it in the company database.

**Tech Stack:** Markdown, SQL/Node.js (for registration).

---

### Task 1: Update SKILL.md Content

**Files:**
- Modify: `skills/paperclip-create-plugin/SKILL.md`

- [ ] **Step 1: Rewrite the Ground Rules section**

Incorporate the mandate for Tailwind CSS, SDK v1, and Bootstrap Agents.

- [ ] **Step 2: Add Code Blueprints**

Include minimal, high-quality examples for `manifest.ts`, `worker.ts`, and `ui/index.tsx`.

- [ ] **Step 3: Update Verification section**

Add visual consistency checks and specific SDK v1 validation.

- [ ] **Step 4: Commit changes**

```bash
git add skills/paperclip-create-plugin/SKILL.md
git commit -m "feat(skill): enhance paperclip-create-plugin with native standards"
```

### Task 2: Register/Update Skill in Database

**Files:**
- Create: `scripts/register-enhanced-skill.cjs`

- [ ] **Step 1: Create registration script**

Write a script to upsert the enhanced skill into the `company_skills` table.

- [ ] **Step 2: Run registration**

Run: `node scripts/register-enhanced-skill.cjs`

- [ ] **Step 3: Verify registration**

Check the database or UI to ensure the skill is updated.

- [ ] **Step 4: Commit script**

```bash
git add scripts/register-enhanced-skill.cjs
git commit -m "chore: add skill registration script for create-plugin"
```

### Task 3: Final Verification

- [ ] **Step 1: Self-test**

Activate the skill: `activate_skill("paperclip-create-plugin")` and verify the content matches the plan.

- [ ] **Step 2: Final cleanup**

```bash
rm scripts/register-enhanced-skill.cjs
git commit -m "chore: cleanup registration script"
```
