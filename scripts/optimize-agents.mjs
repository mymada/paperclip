import pg from 'pg';

const { Client } = pg;

async function updateModel(client, agentName, newModel) {
  const res = await client.query('SELECT id, adapter_config FROM agents WHERE name = $1', [agentName]);
  if (res.rows.length > 0) {
    const agent = res.rows[0];
    const config = typeof agent.adapter_config === 'string' ? JSON.parse(agent.adapter_config) : agent.adapter_config;
    config.model = newModel;
    await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
    console.log(`Updated ${agentName} to ${newModel}`);
  } else {
    console.log(`${agentName} not found`);
  }
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();
  await updateModel(client, 'Fiscaliste', 'claude-haiku-4-5-20251001');
  await updateModel(client, 'Optimisateur', 'claude-haiku-4-5-20251001');
  await client.end();
}

main().catch(console.error);
