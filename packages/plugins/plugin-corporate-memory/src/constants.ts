export const PLUGIN_ID = "paperclip-corporate-memory";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "corporate-memory";

export const SLOT_IDS = {
  page: "corporate-memory-page",
  dashboardWidget: "corporate-memory-dashboard-widget",
  sidebar: "corporate-memory-sidebar",
} as const;

export const EXPORT_NAMES = {
  page: "CorporateMemoryPage",
  dashboardWidget: "CorporateMemoryDashboardWidget",
  sidebar: "CorporateMemorySidebarLink",
} as const;

export const JOB_KEYS = {
  weeklyDigest: "memory-weekly-digest",
} as const;

export const TOOL_NAMES = {
  search: "corporate_memory_search",
  get: "corporate_memory_get",
  list: "corporate_memory_list",
  upsert: "corporate_memory_upsert",
} as const;

export const DATA_KEYS = {
  memoryList: "memory-list",
  memoryDoc: "memory-doc",
  memoryStats: "memory-stats",
} as const;

export const STATE_KEYS = {
  index: "memory-index",
  docPrefix: "memory-doc-",
} as const;

// ---------------------------------------------------------------------------
// Taxonomy — 2-level hierarchy: Category > DocType
// ---------------------------------------------------------------------------

export interface TaxonomyDocTypes {
  [key: string]: string;
}

export interface TaxonomyCategory {
  label: string;
  icon: string;
  types: TaxonomyDocTypes;
}

export const TAXONOMY: Record<string, TaxonomyCategory> = {
  juridique: {
    label: "Juridique & Légal",
    icon: "⚖️",
    types: {
      statuts: "Statuts & Actes constitutifs",
      contrats: "Contrats & Conventions",
      conformite: "Conformité & Réglementaire",
      propriete_intellectuelle: "Propriété intellectuelle",
      fiscal_legal: "Fiscalité & Optimisation légale",
    },
  },
  strategique: {
    label: "Documents Stratégiques",
    icon: "🎯",
    types: {
      plan_strategique: "Plan stratégique",
      etude_marche: "Étude de marché",
      analyse_concurrentielle: "Analyse concurrentielle",
      roadmap: "Feuille de route (Roadmap)",
      expansion: "Plan d'expansion géographique",
    },
  },
  financier: {
    label: "Finance & Comptabilité",
    icon: "💰",
    types: {
      budget: "Budget & Prévisions",
      plan_comptable: "Plan comptable",
      rapport_financier: "Rapport financier",
      tresorerie: "Trésorerie & Cash flow",
      fiscal_finance: "Fiscalité & Déclarations",
    },
  },
  technique: {
    label: "Architecture & Technique",
    icon: "🏗️",
    types: {
      dat: "DAT — Document d'Architecture Technique",
      specs_fonc: "Spécifications fonctionnelles",
      specs_tech: "Spécifications techniques",
      api: "Documentation API & Intégrations",
      infra: "Infrastructure & DevOps",
      securite: "Sécurité & Conformité technique",
    },
  },
  rapports: {
    label: "Rapports & Analyses",
    icon: "📊",
    types: {
      rapport_board: "Rapport mensuel Board",
      rapport_marche: "Rapport d'analyse marché",
      rapport_audit: "Rapport d'audit",
      compte_rendu: "Compte rendu de réunion (CR)",
      veille: "Veille stratégique & réglementaire",
    },
  },
  gouvernance: {
    label: "Gouvernance & Décisions",
    icon: "🏛️",
    types: {
      pv: "Procès-verbal (PV) d'assemblée",
      decision: "Registre des décisions fondateur",
      politique: "Politiques & Chartes internes",
      organigramme: "Organigramme & Structure",
      kpi: "KPIs & Tableaux de bord",
    },
  },
  operations: {
    label: "Opérations & Procédures",
    icon: "⚙️",
    types: {
      sop: "SOP — Procédure opérationnelle standard",
      checklist: "Checklists & Guides",
      fournisseurs: "Fournisseurs & Partenaires",
      logistique: "Logistique & Supply chain",
      continuite: "Plan de continuité",
    },
  },
  rh: {
    label: "Ressources Humaines",
    icon: "👥",
    types: {
      fiche_poste: "Fiche de poste",
      politique_rh: "Politique RH",
      formation: "Plan de formation",
      recrutement: "Recrutement & Onboarding",
    },
  },
};

export type MemoryCategory = keyof typeof TAXONOMY;

export const CATEGORIES = Object.keys(TAXONOMY) as MemoryCategory[];

export const DEFAULT_CATEGORY: MemoryCategory = "gouvernance";
export const DEFAULT_DOC_TYPE = "decision";

// ---------------------------------------------------------------------------
// Classification rules: ordered list of [category, docType, keywords[]]
// ---------------------------------------------------------------------------

export const CLASSIFICATION_RULES: Array<[string, string, string[]]> = [
  // juridique/statuts
  ["juridique", "statuts", ["statuts", "actes constitutifs", "immatricul", "kbis", "greffe", "gbc1", "constitution société", "sasu", "sarl"]],
  // juridique/contrats
  ["juridique", "contrats", ["contrat", "convention", "accord", "engagement", "clause", "prestation"]],
  // juridique/conformite
  ["juridique", "conformite", ["conformité", "rgpd", "compliance", "réglementaire", "autorisation", "licence", "permis"]],
  // juridique/fiscal_legal
  ["juridique", "fiscal_legal", ["convention fiscale", "double imposition", "retenue source", "are", "arce", "dividende", "optimis", "is", "fiscal", "impôt", "tva", "taxe"]],

  // strategique/plan_strategique
  ["strategique", "plan_strategique", ["plan stratégique", "vision", "mission", "objectif stratégique", "orientations"]],
  // strategique/etude_marche
  ["strategique", "etude_marche", ["étude de marché", "analyse marché", "demande", "offre", "segment"]],
  // strategique/analyse_concurrentielle
  ["strategique", "analyse_concurrentielle", ["concurrence", "concurrent", "analyse concurrentielle", "positionnement", "benchmark"]],
  // strategique/roadmap
  ["strategique", "roadmap", ["roadmap", "feuille de route", "jalons", "milestone", "planning"]],
  // strategique/expansion
  ["strategique", "expansion", ["expansion", "madagascar", "mauritius", "océan indien", "international", "export", "africa"]],

  // financier/budget
  ["financier", "budget", ["budget", "prévision", "plan financier", "fy2026", "financement"]],
  // financier/plan_comptable
  ["financier", "plan_comptable", ["plan comptable", "syscohada", "pcg", "clôture comptable", "liasse"]],
  // financier/rapport_financier
  ["financier", "rapport_financier", ["rapport financier", "bilan", "p&l", "compte de résultat", "consolidation"]],
  // financier/tresorerie
  ["financier", "tresorerie", ["trésorerie", "cash pooling", "compte bancaire", "virement", "liquidité", "cash flow"]],
  // financier/fiscal_finance
  ["financier", "fiscal_finance", ["déclaration", "tva t1", "liasse fiscale", "dgi", "calendrier fiscal", "compliance fiscale"]],

  // technique/dat
  ["technique", "dat", ["architecture", "dat", "design technique", "stack", "choix technologique", "schéma architecture"]],
  // technique/specs_fonc
  ["technique", "specs_fonc", ["spécifications fonctionnelles", "cahier des charges", "user story", "fonctionnalité", "feature"]],
  // technique/specs_tech
  ["technique", "specs_tech", ["spécifications techniques", "endpoint", "modèle", "django", "database", "schema"]],
  // technique/api
  ["technique", "api", ["documentation api", "intégration", "api"]],
  // technique/infra
  ["technique", "infra", ["infrastructure", "devops", "ci/cd", "déploiement", "docker", "kubernetes", "serveur", "vps", "infra"]],
  // technique/securite
  ["technique", "securite", ["sécurité", "xss", "injection", "jwt", "pentest", "vulnerability", "chiffrement"]],

  // rapports/rapport_board
  ["rapports", "rapport_board", ["rapport board", "rapport mensuel", "comité"]],
  // rapports/rapport_marche
  ["rapports", "rapport_marche", ["rapport marché", "veille marché"]],
  // rapports/rapport_audit
  ["rapports", "rapport_audit", ["audit", "commissaire aux comptes", "contrôle", "vérification"]],
  // rapports/compte_rendu
  ["rapports", "compte_rendu", ["compte rendu", " cr ", "réunion"]],
  // rapports/veille
  ["rapports", "veille", ["veille", "actualité", "tendance"]],

  // gouvernance/pv
  ["gouvernance", "pv", ["procès-verbal", "assemblée générale", "résolution", " pv "]],
  // gouvernance/decision
  ["gouvernance", "decision", ["décision", "valider", "approuver", "arbitrage", "validation fondateur"]],
  // gouvernance/politique
  ["gouvernance", "politique", ["politique", "charte", "règlement", "code de conduite"]],
  // gouvernance/organigramme
  ["gouvernance", "organigramme", ["organigramme", "structure", "hiérarchie", "responsabilités"]],
  // gouvernance/kpi
  ["gouvernance", "kpi", ["kpi", "indicateur", "tableau de bord", "performance", "dashboard", "objectif chiffré"]],

  // operations/sop
  ["operations", "sop", ["procédure", "sop", "processus", "workflow", "manuel"]],
  // operations/fournisseurs
  ["operations", "fournisseurs", ["fournisseur", "partenaire", "prestataire", "sous-traitant"]],
  // operations/logistique
  ["operations", "logistique", ["logistique", "supply chain", "transport", "livraison", "stock", "entrepôt"]],
  // operations/checklist
  ["operations", "checklist", ["checklist", "liste vérification", "étapes"]],

  // rh/recrutement
  ["rh", "recrutement", ["recrutement", "embauche", "onboarding", "offre emploi", "candidat"]],
  // rh/formation
  ["rh", "formation", ["formation", "compétences", "certification", "apprentissage"]],
  // rh/fiche_poste
  ["rh", "fiche_poste", ["fiche de poste", "description poste", "responsabilités", "missions"]],
  // rh/politique_rh
  ["rh", "politique_rh", ["politique rh", "congés", "salaire", "avantages", "ressources humaines"]],
];

// ---------------------------------------------------------------------------
// Backward-compat: mapping from old flat domain → new category
// ---------------------------------------------------------------------------

export const LEGACY_DOMAIN_TO_CATEGORY: Record<string, MemoryCategory> = {
  legal: "juridique",
  fiscal: "juridique",       // fiscal_legal doc type
  governance: "gouvernance",
  strategy: "strategique",
  finance: "financier",
  operations: "operations",
  technology: "technique",
  hr: "rh",
};

export const LEGACY_DOMAIN_TO_DOCTYPE: Record<string, string> = {
  legal: "contrats",
  fiscal: "fiscal_legal",
  governance: "decision",
  strategy: "plan_strategique",
  finance: "budget",
  operations: "sop",
  technology: "dat",
  hr: "politique_rh",
};

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type MemoryStatus = "draft" | "validated" | "archived";

export const STATUS_LABELS: Record<MemoryStatus, string> = {
  draft: "Brouillon",
  validated: "Validé",
  archived: "Archivé",
};

export const STATUS_COLORS: Record<MemoryStatus, string> = {
  draft: "#e8a800",
  validated: "#1a9e45",
  archived: "#888888",
};

// ---------------------------------------------------------------------------
// Capture comment keywords (unchanged)
// ---------------------------------------------------------------------------

export const CAPTURE_COMMENT_KEYWORDS = [
  "DÉCISION:",
  "NOTE:",
  "IMPORTANT:",
  "RETENIR:",
  "ARCHIVE:",
] as const;
