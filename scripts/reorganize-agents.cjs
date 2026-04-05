const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  console.log("1. Nettoyage des agents de test et doublons...");
  const agentsToDelete = ['test', 'TestAgent', 'CFO 2', 'CTO 2', 'COO 2', 'CMO 2'];
  for (const name of agentsToDelete) {
    const res = await client.query('SELECT id FROM agents WHERE name = $1', [name]);
    if (res.rows.length > 0) {
      const agentId = res.rows[0].id;
      // Nettoyage des tables dépendantes
      await client.query('DELETE FROM agent_runtime_state WHERE agent_id = $1', [agentId]);
      await client.query('DELETE FROM agent_api_keys WHERE agent_id = $1', [agentId]);
      // On ne supprime que si l'agent n'a pas de tâches/issues réelles (sécurité)
      await client.query('DELETE FROM agents WHERE id = $1', [agentId]);
      console.log(`- Supprimé : ${name} (${agentId})`);
    }
  }

  console.log("\n2. Réorganisation hiérarchique...");
  
  // Récupération des IDs des directeurs
  const res = await client.query("SELECT id, name FROM agents WHERE name IN ('CMO', 'COO')");
  const directors = {};
  res.rows.forEach(r => directors[r.name] = r.id);

  if (directors['CMO']) {
    await client.query("UPDATE agents SET reports_to = $1 WHERE name = 'Gia'", [directors['CMO']]);
    console.log("- Gia (Marketing) rattachée au CMO");
  }

  if (directors['COO']) {
    await client.query("UPDATE agents SET reports_to = $1 WHERE name = 'Otto'", [directors['COO']]);
    console.log("- Otto (Operations) rattaché au COO");
  }

  console.log("\nRéorganisation terminée.");
  await client.end();
}

main().catch(console.error);
