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
const FOUNDER_USER_ID = 'imklJeEGZZXrfKdo3NfLl48sEos8jaVZ'; // t.gianny@gmail.com

// Issues qui nécessitent une action humaine du fondateur (pas des agents)
const FOUNDER_ACTION_TITLES = [
  '🔐 [ACTION FONDATEUR] Négocier rupture conventionnelle avec employeur',
  '[PRE-CHOMAGE] Checklist actions AVANT fin du contrat de travail',
  '[ACTION FONDATEUR] Créer compte France Travail + simuler droits ARE',
  '✅ [VALIDATION FONDATEUR] Statuts MADAGRO GROUP SAS — à signer',
  '[BOARD ⚠️] Décision ARCE (capital) vs Maintien ARE mensuel — deadline 7 Avril',
  '📊 [DÉCISION FONDATEUR] ARCE ou Maintien ARE — choisir la stratégie',
  '[FONDATEUR] Strategie chomage + creation entreprise - ACRE/ARCE/ARE',
  '[BOARD] Valider architecture technique MIORA Phase 4 — stack mobile + infra + budget',
  'Ouvrir compte bancaire professionnel MADAGRO HOLDING SA',
  '[HOLDING] Apport en nature des parts MADAGRO GROUP dans la HOLDING',
  '[HOLDING] Convention de trésorerie Holding → Filiales (cash pooling)',
  '[ÎLE MAURICE] Créer entité GBC1 — dossier FSC + avocat local + compte bancaire',
];

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== ÉTAPE 1 : Création des labels ===\n');

    // Créer les labels si ils n'existent pas
    const labels = [
      { name: '🔴 ACTION FONDATEUR', color: '#ef4444' },
      { name: '🤖 AGENT EN COURS', color: '#3b82f6' },
      { name: '⚠️ BLOQUÉ', color: '#f97316' },
      { name: '✅ LIVRABLE PRÊT', color: '#22c55e' },
    ];

    const labelIds = {};
    for (const label of labels) {
      const existing = await client.query(
        'SELECT id FROM labels WHERE company_id = $1 AND name = $2',
        [COMPANY_ID, label.name]
      );
      let labelId;
      if (existing.rows.length > 0) {
        labelId = existing.rows[0].id;
        console.log(`  Label existant: ${label.name} (${labelId})`);
      } else {
        labelId = crypto.randomUUID();
        await client.query(
          'INSERT INTO labels (id, company_id, name, color, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [labelId, COMPANY_ID, label.name, label.color]
        );
        console.log(`  Label créé: ${label.name} (${labelId})`);
      }
      labelIds[label.name] = labelId;
    }

    console.log('\n=== ÉTAPE 2 : Tag issues ACTION FONDATEUR + assignation fondateur ===\n');

    for (const title of FOUNDER_ACTION_TITLES) {
      const issueRes = await client.query(
        'SELECT id, status FROM issues WHERE company_id = $1 AND title = $2',
        [COMPANY_ID, title]
      );
      if (issueRes.rows.length === 0) {
        console.log(`  NOT FOUND: ${title.slice(0, 60)}`);
        continue;
      }
      const issue = issueRes.rows[0];

      // Assigner au fondateur si pas déjà fait
      await client.query(
        'UPDATE issues SET assignee_user_id = $1, updated_at = NOW() WHERE id = $2 AND assignee_user_id IS NULL',
        [FOUNDER_USER_ID, issue.id]
      );

      // Ajouter label ACTION FONDATEUR
      const existingLabel = await client.query(
        'SELECT 1 FROM issue_labels WHERE issue_id = $1 AND label_id = $2',
        [issue.id, labelIds['🔴 ACTION FONDATEUR']]
      );
      if (existingLabel.rows.length === 0) {
        await client.query(
          'INSERT INTO issue_labels (issue_id, label_id, company_id, created_at) VALUES ($1, $2, $3, NOW())',
          [issue.id, labelIds['🔴 ACTION FONDATEUR'], COMPANY_ID]
        );
      }
      console.log(`  ✅ Tagged: ${title.slice(0, 70)}`);
    }

    console.log('\n=== ÉTAPE 3 : Relance tous les agents (todo/in_progress sans run queued) ===\n');

    // Récupérer toutes les issues avec agent assigné, pas de run queued actif
    const issuesToWakeup = await client.query(`
      SELECT i.id, i.title, i.status, i.priority, i.assignee_agent_id
      FROM issues i
      WHERE i.company_id = $1
        AND i.status IN ('todo', 'in_progress', 'blocked')
        AND i.assignee_agent_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM heartbeat_runs hr
          WHERE hr.context_snapshot->>'issueId' = i.id::text
            AND hr.status = 'queued'
        )
      ORDER BY
        CASE i.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        CASE i.status WHEN 'in_progress' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END
    `, [COMPANY_ID]);

    console.log(`  ${issuesToWakeup.rows.length} issues à relancer\n`);

    let created = 0;
    for (const issue of issuesToWakeup.rows) {
      const runId = crypto.randomUUID();
      await client.query(`
        INSERT INTO heartbeat_runs (
          id, company_id, agent_id, invocation_source, status,
          context_snapshot, trigger_detail, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        runId,
        COMPANY_ID,
        issue.assignee_agent_id,
        'assignment',
        'queued',
        JSON.stringify({ issueId: issue.id, source: 'issue_assignment' }),
        'system'
      ]);
      console.log(`  QUEUED [${issue.priority}/${issue.status}]: ${issue.title.slice(0, 70)}`);
      created++;
    }

    console.log(`\n=== TERMINÉ ===`);
    console.log(`  Labels créés/vérifiés: ${labels.length}`);
    console.log(`  Issues fondateur taguées: ${FOUNDER_ACTION_TITLES.length}`);
    console.log(`  Agents relancés: ${created}`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
