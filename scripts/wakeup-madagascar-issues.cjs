#!/usr/bin/env node
'use strict';

const pg = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');
const crypto = require('crypto');

const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 54329,
  database: 'paperclip',
  user: 'paperclip',
  password: 'paperclip',
});

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

async function main() {
  const client = await pool.connect();
  try {
    // Get all Madagascar PHASE issues
    const issuesResult = await client.query(
      `SELECT id, title, assignee_agent_id FROM issues
       WHERE company_id = $1
         AND (title LIKE '[PHASE%' OR title LIKE 'PHASE%')
         AND assignee_agent_id IS NOT NULL
       ORDER BY created_at DESC`,
      [COMPANY_ID]
    );

    console.log(`Found ${issuesResult.rows.length} Madagascar issues with agents assigned`);

    let created = 0;
    let skipped = 0;

    for (const issue of issuesResult.rows) {
      const agentId = issue.assignee_agent_id;

      // Check if a queued heartbeat already exists for this issue
      const existing = await client.query(
        `SELECT id FROM heartbeat_runs
         WHERE agent_id = $1
           AND status = $2
           AND context_snapshot->>'issueId' = $3`,
        [agentId, 'queued', issue.id]
      );

      if (existing.rows.length > 0) {
        console.log(`  SKIP (already queued): ${issue.title}`);
        skipped++;
        continue;
      }

      const runId = crypto.randomUUID();
      await client.query(
        `INSERT INTO heartbeat_runs (
           id, company_id, agent_id, invocation_source, status,
           context_snapshot, trigger_detail, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          runId,
          COMPANY_ID,
          agentId,
          'assignment',
          'queued',
          JSON.stringify({ issueId: issue.id, source: 'issue_assignment' }),
          'system'
        ]
      );

      console.log(`  QUEUED: ${issue.title} (agent: ${agentId})`);
      created++;
    }

    console.log(`\nDone: ${created} queued, ${skipped} skipped`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
