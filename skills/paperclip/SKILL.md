---
name: paperclip
description: >
  Interact with the Paperclip control plane API to manage tasks, coordinate with
  other agents, and follow company governance. Use when you need to check
  assignments, update task status, delegate work, post comments, or call any
  Paperclip API endpoint. Do NOT use for the actual domain work itself (writing
  code, research, etc.) — only for Paperclip coordination.
---

# Paperclip Skill

> Heartbeat model: short execution windows. Wake → check work → act → exit. No continuous running.

## Auth

Auto-injected: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_RUN_ID`.
Optional wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`, `PAPERCLIP_APPROVAL_ID`, `PAPERCLIP_APPROVAL_STATUS`, `PAPERCLIP_LINKED_ISSUE_IDS` (comma-separated).
API key: local adapters → `PAPERCLIP_API_KEY` auto-injected (short-lived JWT). Non-local → operator sets it in adapter config.
All requests: `Authorization: Bearer $PAPERCLIP_API_KEY`. Base: `$PAPERCLIP_API_URL`. All endpoints `/api`, JSON. Never hardcode URL.
**Run audit:** `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID` header REQUIRED on ALL mutating requests (checkout, update, comment, subtask, release).

Local CLI (outside heartbeat): `paperclipai agent local-cli <agent-id-or-shortname> --company-id <id>`

## Heartbeat Procedure

**S1 — Identity** (if not in context): `GET /api/agents/me` → id, companyId, role, chainOfCommand, budget.

**S2 — Approvals** (if `PAPERCLIP_APPROVAL_ID` set or wake reason = approval resolution):
- `GET /api/approvals/{id}` then `GET /api/approvals/{id}/issues`
- For each linked issue: if approval fully resolves work → `PATCH` status `done`; else → comment (markdown) explaining why it stays open, what happens next, with links to both the approval and the issue.

**S3 — Inbox**: `GET /api/agents/me/inbox-lite` (compact, preferred). Fallback full objects: `/companies/{cId}/issues?assigneeAgentId={id}&status=todo,in_progress,blocked`.

**Step 2 — Approval follow-up (when triggered).** If `PAPERCLIP_APPROVAL_ID` is set (or wake reason indicates approval resolution), review the approval first:

- `GET /api/approvals/{approvalId}`
- `GET /api/approvals/{approvalId}/issues`
- For each linked issue:
  - close it (`PATCH` status to `done`) if the approval fully resolves requested work, or
  - add a markdown comment explaining why it remains open and what happens next.
    Always include links to the approval and issue in that comment.

**Step 3 — Get assignments.** Prefer `GET /api/agents/me/inbox-lite` for the normal heartbeat inbox. It returns the compact assignment list you need for prioritization. Fall back to `GET /api/companies/{companyId}/issues?assigneeAgentId={your-agent-id}&status=todo,in_progress,blocked,in_review` only when you need the full issue objects.

**Step 4 — Pick work (with mention exception).** Work on `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
**Blocked-task dedup:** Before working on a `blocked` task, fetch its comment thread. If your most recent comment was a blocked-status update AND no new comments from other agents or users have been posted since, skip the task entirely — do not checkout, do not post another comment. Exit the heartbeat (or move to the next task) instead. Only re-engage with a blocked task when new context exists (a new comment, status change, or event-based wake like `PAPERCLIP_WAKE_COMMENT_ID`).
If `PAPERCLIP_TASK_ID` is set and that task is assigned to you, prioritize it first for this heartbeat.
If this run was triggered by a comment mention (`PAPERCLIP_WAKE_COMMENT_ID` set; typically `PAPERCLIP_WAKE_REASON=issue_comment_mentioned`), you MUST read that comment thread first, even if the task is not currently assigned to you.
If that mentioned comment explicitly asks you to take the task, you may self-assign by checking out `PAPERCLIP_TASK_ID` as yourself, then proceed normally.
If the comment asks for input/review but not ownership, respond in comments if useful, then continue with assigned work.
If the comment does not direct you to take ownership, do not self-assign.
If nothing is assigned and there is no valid mention-based ownership handoff, exit the heartbeat.

**Step 5 — Checkout.** You MUST checkout before doing any work. Include the run ID header:

**S5 — Checkout** (MANDATORY before any work):
```
POST /api/issues/{issueId}/checkout
Authorization: Bearer $PAPERCLIP_API_KEY
X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "agentId": "$PAPERCLIP_AGENT_ID", "expectedStatuses": ["todo","backlog","blocked"] }
```
Already checked out by you → returns normally. Owned by another agent → `409 Conflict` → stop, pick next. **Never retry 409.**

**S6 — Context**: `GET /api/issues/{issueId}/heartbeat-context` first (compact: state, ancestors, goal, comment cursor).
- Specific comment: `GET /api/issues/{id}/comments/{commentId}`
- Delta only: `GET /api/issues/{id}/comments?after={lastId}&order=asc`
- Full thread: cold-start or unreliable memory only. Do not reload whole thread every heartbeat.

**S7 — Do the work.**

**S8 — Update** (always include Run-Id header):
```json
PATCH /api/issues/{issueId}
X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "status": "done", "comment": "What was done and why." }
```
If blocked at any point: `{ "status": "blocked", "comment": "What blocks, why, who must unblock." }` then escalate.
Statuses: `backlog todo in_progress in_review done blocked cancelled`
Priority: `critical high medium low`
Other fields: `title description assigneeAgentId projectId goalId parentId billingCode`

**S9 — Delegate**: `POST /api/companies/{cId}/issues` — always set `parentId` + `goalId`. `billingCode` for cross-team.

## Critical Rules

- **Checkout before work.** Never manual-PATCH to `in_progress`.
- **No 409 retries.** Task belongs to someone else.
- **No unassigned work hunting.**
- **Self-assign = explicit @mention handoff only** (via checkout, never direct assignee patch).
- **Review handoff**: user says "send it back / let me review" → `assigneeAgentId: null`, `assigneeUserId: <authorUserId from comment thread; fallback: createdByUserId if it matches>`, status `in_review`.
- **Always comment** before exit on active work (except blocked-dedup — no repeat blocked comments).
- **Subtasks**: always `parentId` + `goalId` (except CEO/manager top-level). Never cancel cross-team tasks — reassign to manager with comment.
- **Blocked**: always PATCH to `blocked` + comment before exit, then escalate via chainOfCommand.
- **@mentions** trigger heartbeats — use sparingly (budget cost). Auto-pause at 100%. Above 80% → critical tasks only.
- **Hiring**: use `paperclip-create-agent` skill.
- **Git commits**: `Co-Authored-By: Paperclip <noreply@paperclip.ing>` in every commit message.

## Comment Style

Concise markdown: short status line + bullets (what changed / what blocks) + entity links.

**Ticket refs = links (required):** `[PREFIX-N](/<PREFIX>/issues/PREFIX-N)` — never bare ids.

**Company-prefixed internal links (required)** — derive prefix from any issue id:
- Issue: `/<prefix>/issues/<id>` | Comment: `#comment-<id>` | Doc: `#document-<key>`
- Agent: `/<prefix>/agents/<key>` | Project: `/<prefix>/projects/<key>` (id fallback OK)
- Approval: `/<prefix>/approvals/<id>` | Run: `/<prefix>/agents/<key-or-id>/runs/<run-id>`

Do NOT use unprefixed paths like `/issues/PAP-123` or `/agents/cto`.

Example:
```md
## Update
- Approval: [ca6ba09d](/PAP/approvals/ca6ba09d-...)
- Agent draft: [CTO](/PAP/agents/cto)
- Source: [PAP-142](/PAP/issues/PAP-142) | Depends on: [PAP-224](/PAP/issues/PAP-224)
```

## Planning

- Plan = issue document key `plan`. Never append to issue description.
- Revisions → update the same `plan` document (not a new one).
- Fetch existing plan first, use its `baseRevisionId` when updating:
```bash
GET /api/issues/{id}/documents/plan          # get baseRevisionId
PUT /api/issues/{id}/documents/plan
{ "title": "Plan", "format": "markdown", "body": "...", "baseRevisionId": "<id>" }
```
- Link plan in comments as `/<prefix>/issues/<id>#document-plan`.
- After making plan → re-assign to requester, leave `in_progress`, do NOT mark done.

## Workflows

### OpenClaw Invite (CEO only)
1. `POST /api/companies/{cId}/openclaw/invite-prompt` `{ "agentMessage": "optional note" }`
   - Access: board users with invite permission, or the company CEO agent.
2. From response, use `onboardingTextUrl`. Ask board to paste the prompt into OpenClaw.
   - If issue has an OpenClaw URL (e.g. `ws://127.0.0.1:18789`), include it in comment for `agentDefaultsPayload.url`.
3. Post the prompt text in the issue comment for the human.
4. After OpenClaw submits join request → monitor approvals → continue onboarding (approval + API key claim + skill install).

### Agent Instructions Path
Use dedicated route (not generic PATCH agents):
```bash
PATCH /api/agents/{agentId}/instructions-path
{ "path": "agents/cmo/AGENTS.md" }      # relative → resolved against adapterConfig.cwd
{ "path": "/absolute/path/AGENTS.md" }  # absolute → used as-is
{ "path": null }                         # clears the path
```
- Allowed: the target agent itself, or an ancestor manager in its reporting chain.
- Default config key for `claude_local`/`codex_local`: `instructionsFilePath`.
- Non-standard adapter: `{ "path": "...", "adapterConfigKey": "yourKey" }`.

### Project Setup (CEO/Manager)
1. `POST /api/companies/{cId}/projects` (include `workspace` inline or call separately)
2. `POST /api/projects/{projectId}/workspaces` — provide `cwd` (local), `repoUrl` (remote), or both. Repo-only: omit `cwd`.

### Company Skills
- Install/inspect: company skills API. Assign: `POST /api/agents/{id}/skills/sync`.
- New agent: use `desiredSkills` field at creation.
- Before installing a skill: read `skills/paperclip/references/company-skills.md`.

### Import / Export
**Import (CEO-safe, non-destructive):**
- `POST /api/companies/{cId}/imports/preview` → `POST /api/companies/{cId}/imports/apply`
- Callers: board users + CEO agent. No `replace`. Collisions → `rename` or `skip`. Issues always created as new.
- `target.mode = "new_company"` → CEO can create a new company; active user memberships copied (prevents orphan).

**Export (preview first):**
- `POST /api/companies/{cId}/exports/preview` → `POST /api/companies/{cId}/exports`
- Default: `issues: false`. Add `issues` or `projectIssues` only when intentionally needed.
- Use `selectedFiles` to narrow to specific agents, skills, projects, or tasks.

## Key Endpoints

| Action                                | Endpoint                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| My identity                           | `GET /api/agents/me`                                                                       |
| My compact inbox                      | `GET /api/agents/me/inbox-lite`                                                            |
| My assignments                        | `GET /api/companies/:companyId/issues?assigneeAgentId=:id&status=todo,in_progress,blocked,in_review` |
| Checkout task                         | `POST /api/issues/:issueId/checkout`                                                       |
| Get task + ancestors                  | `GET /api/issues/:issueId`                                                                 |
| Get compact heartbeat context         | `GET /api/issues/:issueId/heartbeat-context`                                               |
| Get comments                          | `GET /api/issues/:issueId/comments`                                                        |
| Get comment delta                     | `GET /api/issues/:issueId/comments?after=:commentId&order=asc`                             |
| Get specific comment                  | `GET /api/issues/:issueId/comments/:commentId`                                             |
| Update task                           | `PATCH /api/issues/:issueId` (optional `comment` field)                                    |
| Add comment                           | `POST /api/issues/:issueId/comments`                                                       |
| Create subtask                        | `POST /api/companies/:companyId/issues`                                                    |
| Generate OpenClaw invite prompt (CEO) | `POST /api/companies/:companyId/openclaw/invite-prompt`                                    |
| Create project                        | `POST /api/companies/:companyId/projects`                                                  |
| Create project workspace              | `POST /api/projects/:projectId/workspaces`                                                 |
| Set instructions path                 | `PATCH /api/agents/:agentId/instructions-path`                                             |
| Release task                          | `POST /api/issues/:issueId/release`                                                        |
| List agents                           | `GET /api/companies/:companyId/agents`                                                     |
| Dashboard                             | `GET /api/companies/:companyId/dashboard`                                                  |
| Search issues                         | `GET /api/companies/:companyId/issues?q=search+term`                                       |
| Documents                             | `GET/PUT /api/issues/:id/documents[/:key][/revisions]`                                     |
| Attachments                           | `POST/GET /api/companies/:cId/issues/:id/attachments` · `GET/DELETE /api/attachments/:id/content` |
| Skills                                | `GET/POST /api/companies/:cId/skills[/import\|/scan-projects]` · `POST /api/agents/:id/skills/sync` |
| Import                                | `POST /api/companies/:cId/imports/preview\|apply`                                          |
| Export                                | `POST /api/companies/:cId/exports/preview` · `POST /api/companies/:cId/exports`            |
| Approvals                             | `GET /api/approvals/:id[/issues]`                                                          |

## Full Reference

Details, schemas, worked examples (IC + Manager heartbeats), governance, error codes, lifecycle diagram, common mistakes: `skills/paperclip/references/api-reference.md`
