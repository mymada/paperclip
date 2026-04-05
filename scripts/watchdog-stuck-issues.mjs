#!/usr/bin/env node
/**
 * Watchdog — Relance les agents dont les issues sont bloquées en in_progress
 * après un run succeeded.
 *
 * Logique :
 *   1. Trouve les issues in_progress dont le checkout_run est "succeeded"
 *      depuis plus de STUCK_THRESHOLD_MS
 *   2. Réveille l'agent assigné via POST /api/agents/:id/wakeup
 *
 * Usage : node watchdog-stuck-issues.mjs
 */

import { createRequire } from "module";
import { createHmac } from "crypto";

const require = createRequire(import.meta.url);
const pg = require("/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg/lib/index.js");

const COMPANY_ID  = "c1168b33-f849-4d71-94f7-b670ce8e2b8a";
const JWT_SECRET  = process.env.PAPERCLIP_AGENT_JWT_SECRET ?? "9f5087da9400131543980d3eb7fb8c2633aa16ce4f778e4e0f297e221141b282";
const API_BASE    = "http://localhost:3100";
const STUCK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

const client = new pg.Client({ host: "127.0.0.1", port: 54329, user: "paperclip", database: "paperclip", password: "paperclip" });

function b64url(str) { return Buffer.from(str).toString("base64url"); }

function makeJwt(agentId, runId) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const c = b64url(JSON.stringify({
    sub: agentId, company_id: COMPANY_ID, adapter_type: "claude",
    run_id: runId, iat: now, exp: now + 3600, iss: "paperclip", aud: "paperclip-api",
  }));
  const sig = createHmac("sha256", JWT_SECRET).update(`${h}.${c}`).digest("base64url");
  return `${h}.${c}.${sig}`;
}

async function main() {
  await client.connect();
  const now = new Date();
  console.log(`[watchdog] ${now.toISOString()} — démarrage`);

  // 1. Issues in_progress avec checkout_run succeeded depuis > STUCK_THRESHOLD_MS
  const stuck = await client.query(`
    SELECT i.id, i.identifier, i.title, i.assignee_agent_id, a.name as agent_name,
           i.checkout_run_id, hr.finished_at, hr.status as run_status
    FROM issues i
    JOIN agents a ON i.assignee_agent_id = a.id
    JOIN heartbeat_runs hr ON i.checkout_run_id = hr.id
    WHERE i.company_id = $1
      AND i.status = 'in_progress'
      AND i.hidden_at IS NULL
      AND hr.status = 'succeeded'
      AND hr.finished_at < NOW() - INTERVAL '15 minutes'
      AND a.status NOT IN ('terminated', 'pending_approval', 'paused')
    ORDER BY hr.finished_at ASC
  `, [COMPANY_ID]);

  if (stuck.rows.length === 0) {
    console.log("[watchdog] Aucune issue bloquée. Tout est sain.");
    await client.end();
    return;
  }

  console.log(`[watchdog] ${stuck.rows.length} issue(s) bloquée(s) détectée(s)`);

  // 2. Grouper par agent (éviter de réveiller le même agent plusieurs fois)
  const agentsSeen = new Set();
  let woken = 0;

  for (const issue of stuck.rows) {
    const { assignee_agent_id: agentId, agent_name, identifier, title, finished_at } = issue;
    const stuckMinutes = Math.round((now - new Date(finished_at)) / 60000);
    console.log(`  → [${agent_name}] ${identifier ?? issue.id.slice(0, 8)} — bloquée depuis ${stuckMinutes} min`);

    if (agentsSeen.has(agentId)) {
      console.log(`    (agent déjà réveillé dans ce cycle, skip)`);
      continue;
    }
    agentsSeen.add(agentId);

    // Récupérer un run valide pour le JWT
    const runRow = await client.query(
      `SELECT id FROM heartbeat_runs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [agentId]
    );
    const runId = runRow.rows[0]?.id;
    if (!runId) { console.log(`    ⚠️  Aucun run historique pour ${agent_name}, skip`); continue; }

    const jwt = makeJwt(agentId, runId);
    const res = await fetch(`${API_BASE}/api/agents/${agentId}/wakeup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
        "x-paperclip-run-id": runId,
      },
      body: JSON.stringify({
        source: "on_demand",
        triggerDetail: "manual",
        reason: `watchdog: issue ${identifier ?? issue.id.slice(0, 8)} bloquée depuis ${stuckMinutes} min après run succeeded`,
      }),
    });
    const body = await res.json();
    if (res.status === 202) {
      console.log(`    ✅ ${agent_name} réveillé → ${body.status}`);
      woken++;
    } else {
      console.log(`    ⚠️  ${agent_name} wakeup échoué: ${res.status} ${JSON.stringify(body).slice(0, 80)}`);
    }
  }

  await client.end();
  console.log(`[watchdog] Terminé — ${woken}/${agentsSeen.size} agent(s) réveillé(s)`);
}

main().catch(err => { console.error("[watchdog] Erreur fatale:", err.message); process.exit(1); });
