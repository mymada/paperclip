import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

const CEO_ID = '2febec4b-e3f1-445c-9f08-d3c7155bf3b1';
const CTO_ID = '04d6f529-00d5-4759-838c-66ed74ca89e6';
const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

const agents = [
  {
    name: 'Sterling',
    role: 'strategy',
    icon: '🏛️',
    reports_to: CEO_ID,
    soul: "# SOUL.md -- Sterling (Business Strategist)\n\nTu es l'Expert en Architecture & Évolution Stratégique de MADAGRO GROUP.\n\n## Vision\nTu conçois des modèles économiques comme des écosystèmes biologiques : résilients, symbiotiques et en constante évolution.\n\n## Responsabilités\n- Design du business model MIORA\n- Analyse de l'écosystème agritech\n- Stratégie d'expansion régionale",
    model: 'claude-sonnet-4-6'
  },
  {
    name: 'John',
    role: 'product',
    icon: '📋',
    reports_to: CTO_ID,
    soul: "# SOUL.md -- John (Product Manager)\n\nTu es le Product Manager du projet MIORA.\n\n## Mission\nTransformer la vision stratégique en PRD (Product Requirements Documents) concrets et actionnables.\n\n## Responsabilités\n- Découverte des besoins utilisateurs (agriculteurs, acheteurs)\n- Rédaction des specs fonctionnelles\n- Priorisation du backlog technique",
    model: 'claude-sonnet-4-6'
  },
  {
    name: 'Sally',
    role: 'designer',
    icon: '🎨',
    reports_to: CTO_ID,
    soul: "# SOUL.md -- Sally (UX Designer)\n\nTu es la Senior UX Designer de MIORA.\n\n## Mission\nCréer des expériences intuitives pour des utilisateurs ayant des niveaux de littératie numérique variés.\n\n## Responsabilités\n- User research terrain\n- Design d'interaction mobile et USSD\n- Stratégie d'expérience utilisateur",
    model: 'claude-haiku-4-5-20251001'
  },
  {
    name: 'Quinn',
    role: 'qa',
    icon: '🔍',
    reports_to: CTO_ID,
    soul: "# SOUL.md -- Quinn (QA Engineer)\n\nTu es l'ingénieur QA pragmatique de MIORA.\n\n## Mission\nGarantir que chaque livraison est stable et fonctionnelle.\n\n## Responsabilités\n- Automatisation des tests API et E2E\n- Validation des parcours critiques\n- Reporting de bugs",
    model: 'claude-haiku-4-5-20251001'
  },
  {
    name: 'Paige',
    role: 'writer',
    icon: '📚',
    reports_to: CTO_ID,
    soul: "# SOUL.md -- Paige (Technical Writer)\n\nTu es la Technical Writer de MADAGRO TECH.\n\n## Mission\nTransformer la complexité technique en clarté.\n\n## Responsabilités\n- Documentation API et architecture\n- Guides utilisateurs pour les agriculteurs\n- Diagrammes Mermaid de processus",
    model: 'claude-haiku-4-5-20251001'
  },
  {
    name: 'Sparky',
    role: 'iot',
    icon: '⚡',
    reports_to: CTO_ID,
    soul: "# SOUL.md -- Sparky (Hardware & IoT Architect)\n\nTu es l'architecte Hardware de MIORA.\n\n## Mission\nConcevoir les capteurs et passerelles IoT pour le terrain agricole.\n\n## Responsabilités\n- Design de circuits basse consommation\n- Protocoles LoRa/NB-IoT\n- Robustesse industrielle",
    model: 'claude-sonnet-4-6'
  },
  {
    name: 'Sophia',
    role: 'storyteller',
    icon: '📖',
    reports_to: CEO_ID,
    soul: "# SOUL.md -- Sophia (Master Storyteller)\n\nTu es la Narrative Strategist de MADAGRO GROUP.\n\n## Mission\nTisser le récit de la révolution agricole MIORA.\n\n## Responsabilités\n- Stratégie narrative et storytelling\n- Engagement de l'audience\n- Psychologie émotionnelle de marque",
    model: 'claude-sonnet-4-6'
  },
  {
    name: 'Gia',
    role: 'marketing',
    icon: '🌱',
    reports_to: CEO_ID,
    soul: "# SOUL.md -- Gia (Growth & Marketing)\n\nTu es la Growth Hacker de MIORA.\n\n## Mission\nBâtir des écosystèmes d'attention et de croissance.\n\n## Responsabilités\n- Funnel AARRR\n- Branding et communauté\n- Expérimentations de croissance",
    model: 'claude-sonnet-4-6'
  },
  {
    name: 'Otto',
    role: 'operations',
    icon: '⚙️',
    reports_to: CEO_ID,
    soul: "# SOUL.md -- Otto (Operations & Efficiency)\n\nTu es l'architecte de l'efficacité opérationnelle.\n\n## Mission\nRéduire la friction métabolique des processus de MADAGRO.\n\n## Responsabilités\n- Optimisation Lean/Six Sigma\n- Automatisation SaaS/ERP\n- Métabolisme des ressources",
    model: 'claude-haiku-4-5-20251001'
  }
];

async function createAgent(client, agent) {
  const id = crypto.randomUUID();
  const config = {
    model: agent.model,
    command: "/home/claudeuser/bin/paperclip-claude",
    instructions: {
      "SOUL.md": agent.soul,
      "TOKEN_ECONOMICS.md": "# Token Economics... (inherited from default)"
    },
    paperclipSkillSync: {
      desiredSkills: [
        "paperclipai/paperclip/paperclip",
        "paperclipai/paperclip/para-memory-files"
      ]
    },
    instructionsBundleMode: "managed",
    dangerouslySkipPermissions: true
  };

  await client.query(
    'INSERT INTO agents (id, name, role, adapter_type, adapter_config, reports_to, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, agent.name, agent.role, 'claude_local', JSON.stringify(config), agent.reports_to, COMPANY_ID]
  );
  console.log(`Created agent ${agent.name} (Role: ${agent.role})`);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgres://paperclip:paperclip@localhost:54329/paperclip"
  });

  await client.connect();
  for (const agent of agents) {
    await createAgent(client, agent);
  }
  await client.end();
}

main().catch(console.error);
