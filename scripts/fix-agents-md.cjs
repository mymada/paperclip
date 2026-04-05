const { Client } = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();

  const res = await client.query("SELECT id, name, adapter_config FROM agents WHERE company_id = $1", [COMPANY_ID]);
  
  for (const agent of res.rows) {
    const config = typeof agent.adapter_config === 'string' ? JSON.parse(agent.adapter_config) : agent.adapter_config;
    
    config.instructions = config.instructions || {};
    
    // On ne remplace AGENTS.md que s'il est vide ou absent
    if (!config.instructions["AGENTS.md"] || config.instructions["AGENTS.md"].trim() === "") {
      config.instructions["AGENTS.md"] = `Tu es l'agent **${agent.name}** au sein de MADAGRO GROUP.

Lis impérativement **SOUL.md** pour comprendre ta mission, ton identité et tes responsabilités spécifiques.

## Principes Opérationnels (Paperclip)
1. **Efficacité Totale :** Tu dois respecter les directives de **TOKEN_ECONOMICS.md** en tout temps (contexte < 5K tokens, brièveté extrême, pas de narration).
2. **Mise à jour des Tâches :** Chaque action doit être documentée par un commentaire sur la tâche assignée avant de passer à la suivante.
3. **Collaboration :** Si tu es bloqué, assigne la tâche à ton manager ou au collègue concerné avec un commentaire explicite.
4. **Validation :** Ne considère pas un travail comme terminé tant qu'il n'a pas été validé (par test ou revue).

## Hiérarchie
Réfère-toi à l'organigramme pour savoir à qui tu reportes et qui tu supervises.
`;
      
      // On s'assure aussi que TOKEN_ECONOMICS.md est présent
      if (!config.instructions["TOKEN_ECONOMICS.md"]) {
        config.instructions["TOKEN_ECONOMICS.md"] = "# Token Economics: Efficiency Rules\n\n- No Massive Reads: Search first.\n- Concise Communication: KERNEL anatomy.\n- Zero Narration.\n- Window < 5K tokens.";
      }

      await client.query('UPDATE agents SET adapter_config = $1 WHERE id = $2', [JSON.stringify(config), agent.id]);
      console.log(`- AGENTS.md généré pour ${agent.name}`);
    } else {
      console.log(`- AGENTS.md déjà présent pour ${agent.name}`);
    }
  }

  await client.end();
}

main().catch(console.error);
