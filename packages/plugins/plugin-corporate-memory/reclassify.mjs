import pg from 'pg';
const { Client } = pg;

const CLASSIFICATION_RULES = [
  ["juridique","statuts",["statuts","actes constitutifs","immatricul","kbis","greffe","gbc1","constitution société","sasu","sarl"]],
  ["juridique","contrats",["contrat","convention","accord","engagement","clause","prestation"]],
  ["juridique","conformite",["conformité","rgpd","compliance","réglementaire","autorisation","licence","permis"]],
  ["juridique","fiscal_legal",["convention fiscale","double imposition","retenue source","are","arce","dividende","optimis","is","fiscal","impôt","tva","taxe"]],
  ["strategique","plan_strategique",["plan stratégique","vision","mission","objectif stratégique","orientations"]],
  ["strategique","etude_marche",["étude de marché","analyse marché","demande","offre","segment"]],
  ["strategique","analyse_concurrentielle",["concurrence","concurrent","analyse concurrentielle","positionnement","benchmark"]],
  ["strategique","roadmap",["roadmap","feuille de route","jalons","milestone","planning"]],
  ["strategique","expansion",["expansion","madagascar","mauritius","océan indien","international","export","africa"]],
  ["financier","budget",["budget","prévision","plan financier","fy2026","financement"]],
  ["financier","plan_comptable",["plan comptable","syscohada","pcg","clôture comptable","liasse"]],
  ["financier","rapport_financier",["rapport financier","bilan","p&l","compte de résultat","consolidation"]],
  ["financier","tresorerie",["trésorerie","cash pooling","compte bancaire","virement","liquidité","cash flow"]],
  ["financier","fiscal_finance",["déclaration","tva t1","liasse fiscale","dgi","calendrier fiscal","compliance fiscale"]],
  ["technique","dat",["architecture","dat","design technique","stack","choix technologique","schéma architecture"]],
  ["technique","specs_fonc",["spécifications fonctionnelles","cahier des charges","user story","fonctionnalité","feature"]],
  ["technique","specs_tech",["spécifications techniques","endpoint","modèle","django","database","schema"]],
  ["technique","api",["documentation api","intégration","api"]],
  ["technique","infra",["infrastructure","devops","ci/cd","déploiement","docker","kubernetes","serveur","vps","infra"]],
  ["technique","securite",["sécurité","xss","injection","jwt","pentest","vulnerability","chiffrement"]],
  ["rapports","rapport_board",["rapport board","rapport mensuel","comité"]],
  ["rapports","rapport_marche",["rapport marché","veille marché"]],
  ["rapports","rapport_audit",["audit","commissaire aux comptes","contrôle","vérification"]],
  ["rapports","compte_rendu",["compte rendu"," cr ","réunion"]],
  ["rapports","veille",["veille","actualité","tendance"]],
  ["gouvernance","pv",["procès-verbal","assemblée générale","résolution"," pv "]],
  ["gouvernance","decision",["décision","valider","approuver","arbitrage","validation fondateur"]],
  ["gouvernance","politique",["politique","charte","règlement","code de conduite"]],
  ["gouvernance","organigramme",["organigramme","structure","hiérarchie","responsabilités"]],
  ["gouvernance","kpi",["kpi","indicateur","tableau de bord","performance","dashboard","objectif chiffré"]],
  ["operations","sop",["procédure","sop","processus","workflow","manuel"]],
  ["operations","fournisseurs",["fournisseur","partenaire","prestataire","sous-traitant"]],
  ["operations","logistique",["logistique","supply chain","transport","livraison","stock","entrepôt"]],
  ["operations","checklist",["checklist","liste vérification","étapes"]],
  ["rh","recrutement",["recrutement","embauche","onboarding","offre emploi","candidat"]],
  ["rh","formation",["formation","compétences","certification","apprentissage"]],
  ["rh","fiche_poste",["fiche de poste","description poste","responsabilités","missions"]],
  ["rh","politique_rh",["politique rh","congés","salaire","avantages","ressources humaines"]],
];

const LEGACY_MAP = {
  legal: { category: "juridique", docType: "contrats" },
  fiscal: { category: "juridique", docType: "fiscal_legal" },
  governance: { category: "gouvernance", docType: "decision" },
  strategy: { category: "strategique", docType: "plan_strategique" },
  finance: { category: "financier", docType: "budget" },
  operations: { category: "operations", docType: "sop" },
  technology: { category: "technique", docType: "dat" },
  hr: { category: "rh", docType: "politique_rh" },
};

function classify(title, body) {
  const text = (title + ' ' + (body || '')).toLowerCase();
  for (const [category, docType, keywords] of CLASSIFICATION_RULES) {
    if (keywords.some(kw => text.includes(kw))) {
      return { category, docType };
    }
  }
  return { category: "gouvernance", docType: "decision" };
}

const client = new Client({ connectionString: 'postgres://paperclip:paperclip@127.0.0.1:54329/paperclip' });
await client.connect();

const PLUGIN_ID = 'paperclip-corporate-memory';

// Get index (already parsed as JS object by pg JSONB driver)
const idxRes = await client.query(
  `SELECT value_json FROM plugin_state WHERE plugin_id=$1 AND state_key='memory-index' AND scope_kind='global'`,
  [PLUGIN_ID]
);

if (idxRes.rows.length === 0) {
  console.log('No index found');
  await client.end();
  process.exit(0);
}

const index = idxRes.rows[0].value_json; // already a JS object!
console.log(`Index has ${index.entries?.length || 0} entries`);

let updated = 0;
let skipped = 0;

for (const entry of (index.entries || [])) {
  const docKey = `memory-doc-${entry.id}`;
  const docRes = await client.query(
    `SELECT value_json FROM plugin_state WHERE plugin_id=$1 AND state_key=$2 AND scope_kind='global'`,
    [PLUGIN_ID, docKey]
  );
  if (docRes.rows.length === 0) { skipped++; continue; }

  const doc = docRes.rows[0].value_json; // already a JS object!

  // Determine new category/docType
  let newCategory, newDocType;
  if (doc.category && !LEGACY_MAP[doc.category]) {
    // Already new taxonomy
    skipped++;
    continue;
  }

  if (doc.domain && LEGACY_MAP[doc.domain]) {
    newCategory = LEGACY_MAP[doc.domain].category;
    newDocType = LEGACY_MAP[doc.domain].docType;
  } else if (doc.category && LEGACY_MAP[doc.category]) {
    newCategory = LEGACY_MAP[doc.category].category;
    newDocType = LEGACY_MAP[doc.category].docType;
  } else {
    const result = classify(doc.title || '', doc.body || doc.summary || '');
    newCategory = result.category;
    newDocType = result.docType;
  }

  // Refine with classification rules
  const refined = classify(doc.title || '', doc.body || doc.summary || '');
  // Use refined if it's more specific
  newCategory = refined.category;
  newDocType = refined.docType;

  // Update doc
  doc.category = newCategory;
  doc.docType = newDocType;
  delete doc.domain;

  // Update entry in index
  entry.category = newCategory;
  entry.docType = newDocType;

  // Save updated doc
  await client.query(
    `UPDATE plugin_state SET value_json=$1 WHERE plugin_id=$2 AND state_key=$3 AND scope_kind='global'`,
    [JSON.stringify(doc), PLUGIN_ID, docKey]
  );
  updated++;
}

// Save updated index
await client.query(
  `UPDATE plugin_state SET value_json=$1 WHERE plugin_id=$2 AND state_key='memory-index' AND scope_kind='global'`,
  [JSON.stringify(index), PLUGIN_ID]
);

console.log(`Done: ${updated} updated, ${skipped} skipped`);
await client.end();
