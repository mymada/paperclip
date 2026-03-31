import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

// Agents
const AGENTS = {
  CEO:      '2febec4b-e3f1-445c-9f08-d3c7155bf3b1',
  CTO:      '04d6f529-00d5-4759-838c-66ed74ca89e6',
  CFO:      '9536b4c0-552b-46aa-82b0-a73a86336a22',
  COO:      '324cb945-f325-449b-9a9f-60c19caeaa64',
  CMO:      'b74f640e-f419-4b13-a49a-753c4b1da215',
  Sterling: 'ff61e396-7c29-486c-8592-69a7363363dd',
  John:     'aff49a2f-30a0-49a4-8541-4b2b4b430a8b',
  Sally:    'a20f38df-9829-4be0-a656-5eba1c4a4f34',
  Quinn:    '2ab530d1-f824-4961-b759-03fed4ae23d0',
  Paige:    'b37bbebd-6206-4dbb-97c3-74889ade3a86',
  Sparky:   'd07f94eb-13d6-4b5a-8e00-d8193398b7fd',
  Sophia:   '2529a43b-d07f-43c7-963f-e66bd5c7d12a',
  Gia:      '37faede0-3903-4a5a-b83f-6e07bb31f0bc',
  Otto:     '6cc3f262-e1d5-48a2-b98b-b80789269094',
  Comptable:'f5a5abb3-9c9b-4deb-ab6c-c666af1b9aec',
  Fiscal:   'd1bbddfb-8248-4324-9833-7d99c5407105',
};

// Projects
const PROJ = {
  ERP:       'e8647dff-1430-456d-9371-2cd212407b37',
  SUPPLY:    '4ea830d3-0600-42ad-89cd-805c4cdab233',
  TRADE:     'b287b524-d8eb-467d-89b9-f8049faccb10',
  GOUV:      'd0e35eae-6fc9-419e-b9c6-5fd26682b2bf',
  RETAIL:    '4aaed6da-c3ed-4251-9f8c-f104851556d3',
  TRUST:     'a98f4a6c-fd41-4a2f-b1f9-f4edf01e7c49',
  IOT:       'f9328057-80cf-48d5-a682-9efff41e0b03',
  GTM:       'd35116e7-c779-40b9-8be0-a210633044ba',
  SAAY:      '253bcaf4-fa05-4901-b87b-c8dfe50f8674',
  DESIGN:    '14cabad4-e5a1-4f63-9707-cdd118b34084',
  HOLDING:   'b5300a3f-f6f2-4816-9c57-ad20f79e15cd',
  OCEAN:     '6f8d3eb3-057d-460c-b1d7-2175fb11a9b1',
  BOARD:     '04b33790-d10b-490c-8e33-92a96010df39',
};

const issues = [

  // =========================================================
  // MIORA SaaY — Mobile Money & Crédit Récolte
  // =========================================================
  {
    title: '[IMPL] US-002 — Intégration API Orange Money / MVola : endpoint Django + tests',
    description: `## Objectif
Implémenter le backend d'intégration Mobile Money pour permettre les paiements d'abonnement MIORA.

## Livrable attendu
- Endpoint \`POST /api/payments/mobile-money/\` (Django REST Framework)
- Support Orange Money Madagascar + MVola (Telma)
- Gestion callbacks/webhooks de confirmation de paiement
- Tests pytest : cas succès, échec, timeout
- Documentation API endpoint

## Critères d'acceptation
- [ ] Paiement de 1000 Ar déclenché depuis l'interface
- [ ] Confirmation reçue via webhook en < 30s
- [ ] Retry automatique x3 en cas d'échec
- [ ] Log de chaque transaction en DB

## Dépendances
- Sandbox credentials Orange Money / MVola à obtenir via COO
- Modèle \`Payment\` Django existant ou à créer`,
    project_id: PROJ.SAAY,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CTO,
  },
  {
    title: '[IMPL] US-003 — Dashboard "Mon Abonnement" agriculteur (frontend + API)',
    description: `## Objectif
Interface agriculteur pour consulter son statut d'abonnement MIORA, historique paiements, prochaine échéance.

## Livrable attendu
- Page React/Vue : statut abonnement (actif/suspendu/expiré)
- Liste historique paiements (date, montant, statut)
- Indicateur prochaine date de prélèvement
- Endpoint \`GET /api/subscriptions/me/\`
- Tests unitaires composants + tests API

## Critères d'acceptation
- [ ] Agriculteur voit son statut en temps réel
- [ ] Paiement en retard affiché en rouge avec CTA
- [ ] Accessible sur mobile (responsive)
- [ ] Chargement < 2s sur 3G`,
    project_id: PROJ.SAAY,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.Sally,
  },
  {
    title: '[IMPL] US-004 — Celery task relance paiement automatique J-3 / J-1',
    description: `## Objectif
Automatiser les relances de paiement pour réduire le churn involontaire.

## Livrable attendu
- Task Celery \`send_payment_reminder\` déclenchée J-3 et J-1 avant échéance
- Message WhatsApp via Brevo + SMS fallback
- Suppression automatique si paiement reçu entre les deux relances
- Celery beat schedule configuré dans settings
- Tests unitaires + test intégration (mock Brevo)

## Critères d'acceptation
- [ ] Message envoyé exactement J-3 et J-1
- [ ] Aucune relance si déjà payé
- [ ] Log en DB de chaque relance envoyée`,
    project_id: PROJ.SAAY,
    priority: 'medium',
    status: 'todo',
    assignee: AGENTS.CTO,
  },
  {
    title: '[IMPL] US-006 — API métriques abonnement (ARPU, churn, taux activation)',
    description: `## Objectif
Endpoint de métriques pour le dashboard opérationnel MIORA (suivi santé business).

## Livrable attendu
- Endpoint \`GET /api/metrics/subscriptions/\`
- Métriques : nb actifs, ARPU, churn mensuel, taux d'activation J+7
- Filtre par région/coopérative
- Données exportables CSV
- Affiché dans dashboard Admin

## Critères d'acceptation
- [ ] Données correctes vs base de données de référence
- [ ] Réponse < 500ms (avec cache Redis)
- [ ] Accessible uniquement rôle Admin/CFO`,
    project_id: PROJ.SAAY,
    priority: 'medium',
    status: 'todo',
    assignee: AGENTS.Quinn,
  },
  {
    title: '[IMPL] WhatsApp Onboarding — Séquence 7 messages Brevo + Celery triggers',
    description: `## Objectif
Automatiser le parcours onboarding agriculteur sur 7 jours via WhatsApp Business.

## Livrable attendu
- 7 templates Brevo WhatsApp validés (FR + MG)
- Celery chain : inscription → J0 bienvenue → J1 tuto → J3 Trust Score → J5 Mobile Money → J7 bilan
- Webhook de tracking ouverture/clic
- Arrêt automatique si agriculteur désactive

## Critères d'acceptation
- [ ] Séquence complète testable en sandbox
- [ ] Taux de lecture J0 > 80% (baseline benchmark)
- [ ] Message bilingue FR/MG sans fautes`,
    project_id: PROJ.SAAY,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CTO,
  },

  // =========================================================
  // MIORA GTM — Pilote & Déploiement Production
  // =========================================================
  {
    title: '[INFRA] Déployer serveur production MIORA — VPS + Nginx + SSL + monitoring',
    description: `## Objectif
Mettre en production l'application MIORA sur un serveur accessible aux agriculteurs pilotes.

## Livrable attendu
- VPS provisionné (Hetzner / OVH / DigitalOcean — €20-40/mois)
- Nginx configuré + SSL Let's Encrypt
- Docker Compose : Django + Celery + Redis + PostgreSQL
- Monitoring : Uptime Robot (gratuit) + Sentry (errors)
- Backup automatique DB quotidien

## Critères d'acceptation
- [ ] app.miora.mg accessible en HTTPS depuis Madagascar
- [ ] Temps de réponse < 3s sur connexion 4G Madagascar
- [ ] Alerte email si downtime > 5 min
- [ ] Rollback possible en < 15 min

## Urgence
Bloquant pour le pilote 100 fermes prévu Avr-Juin 2026`,
    project_id: PROJ.GTM,
    priority: 'critical',
    status: 'todo',
    assignee: AGENTS.CTO,
  },
  {
    title: '[INFRA] CI/CD pipeline production MIORA — GitHub Actions → déploiement auto VPS',
    description: `## Objectif
Automatiser les déploiements pour réduire les risques d'erreurs manuelles.

## Livrable attendu
- GitHub Actions workflow : test → build → deploy sur push main
- Tests automatiques (pytest + playwright) avant déploiement
- Déploiement zéro-downtime (blue/green ou rolling)
- Secrets gérés via GitHub Secrets

## Critères d'acceptation
- [ ] Push sur main déclenche déploiement en < 5 min
- [ ] Déploiement annulé si un test échoue
- [ ] Notification Slack/WhatsApp sur succès/échec`,
    project_id: PROJ.GTM,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CTO,
  },
  {
    title: '[GTM] Organiser journée démo terrain — 3 coopératives pilotes (Mai 2026)',
    description: `## Objectif
Valider l'adoption utilisateur sur le terrain avant le déploiement à 100 fermes.

## Livrable attendu
- Sélection de 3 coopératives représentatives (différentes régions)
- Plan de la journée : présentation + démo live + formation 2h
- Kit terrain : téléphones Android préchargés, fiches explicatives MG
- Rapport d'observation : frictions identifiées, retours agriculteurs
- Photo/vidéo pour communication

## Critères d'acceptation
- [ ] 3 coopératives confirmées et date fixée avant 30 Avril
- [ ] Au moins 20 agriculteurs testent l'app en live
- [ ] Score satisfaction > 7/10 sur formulaire post-démo`,
    project_id: PROJ.GTM,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.Gia,
  },
  {
    title: '[GTM] Rédiger contrat pilote coopérative — termes, KPIs, durée, compensation',
    description: `## Objectif
Formaliser l'engagement juridique avec les coopératives partenaires du pilote.

## Livrable attendu
- Contrat-type pilote 3 mois (FR + MG)
- KPIs contractualisés : nb agriculteurs inscrits, taux adoption, données partagées
- Compensation prévue (accès gratuit MIORA Pro 6 mois)
- Clause confidentialité données agriculteurs
- Validation par Fiscaliste/Paige

## Critères d'acceptation
- [ ] Contrat validé juridiquement (droit malgache)
- [ ] Signé par au moins 1 coopérative avant 30 Avril`,
    project_id: PROJ.GTM,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.Paige,
  },

  // =========================================================
  // MIORA Marketplace B2B
  // =========================================================
  {
    title: '[PRD] Spécifications techniques Marketplace B2B — modèles Django, API, flux',
    description: `## Objectif
Traduire le PRD Marketplace existant en spécifications techniques implémentables.

## Livrable attendu
- Modèles Django : \`Listing\`, \`Offer\`, \`Contract\`, \`Shipment\`
- API endpoints : CRUD listings, système d'offres, acceptation contrat
- Flux complet : publication → négociation → accord → livraison → paiement
- Wireframes techniques (pas UX) : structure endpoints REST
- Estimation effort : story points par module

## Critères d'acceptation
- [ ] Document validé par CTO + John
- [ ] Couverture 100% des flows du PRD Marketplace`,
    project_id: PROJ.TRADE,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.John,
  },
  {
    title: '[IMPL] Marketplace MVP — Listings produits agricoles + système d\'offres',
    description: `## Objectif
Implémenter le cœur de la marketplace : permettre à un vendeur de publier, un acheteur d'offrir.

## Livrable attendu
- CRUD \`Listing\` : titre, produit, quantité, prix indicatif, région, photos
- Endpoint POST \`/api/marketplace/offers/\` : soumettre une offre sur un listing
- Notifications temps réel (Django Channels ou polling)
- Interface vendeur (liste mes annonces) + acheteur (explorer)
- Tests E2E : parcours complet vendeur → acheteur

## Critères d'acceptation
- [ ] Un vendeur peut publier en < 3 min
- [ ] Un acheteur peut faire une offre en < 1 min
- [ ] Notification reçue par vendeur en < 10s`,
    project_id: PROJ.TRADE,
    priority: 'high',
    status: 'backlog',
    assignee: AGENTS.CTO,
  },

  // =========================================================
  // SPARKY IoT
  // =========================================================
  {
    title: '[IMPL] Endpoint POST /api/iot/telemetry/ — validation payload + persistence + alertes',
    description: `## Objectif
Réceptionner et stocker les données capteurs Sparky en production.

## Livrable attendu
- Endpoint \`POST /api/iot/telemetry/\` sécurisé (API Key device)
- Validation payload : température, humidité, coordonnées GPS, device_id
- Persistence en DB avec timestamp UTC
- Alerte automatique si valeur hors seuil (ex: température > 40°C)
- Tests : payload valide, payload invalide, device inconnu

## Critères d'acceptation
- [ ] 1000 requêtes/heure supportées sans dégradation
- [ ] Donnée visible dans dashboard Trust Score < 5s après envoi
- [ ] Device non-autorisé retourne 401`,
    project_id: PROJ.IOT,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.Sparky,
  },
  {
    title: '[IMPL] Pipeline données capteurs → Trust Score update automatique',
    description: `## Objectif
Connecter les données IoT terrain au moteur Trust Score MIORA.

## Livrable attendu
- Celery task \`update_trust_score_from_telemetry\` déclenchée à chaque nouvelle donnée
- Algorithme : données capteurs → signal de confiance (cohérence, régularité, seuils)
- Mise à jour Trust Score agriculteur en DB
- Dashboard Sparky : graphe données capteurs vs Trust Score dans le temps

## Critères d'acceptation
- [ ] Trust Score se met à jour dans les 60s après données capteur
- [ ] Anomalie capteur visible dans dashboard coopérative`,
    project_id: PROJ.IOT,
    priority: 'medium',
    status: 'backlog',
    assignee: AGENTS.Sparky,
  },

  // =========================================================
  // ERP MADAGRO
  // =========================================================
  {
    title: '[IMPL] Module Inventaire ERP — modèles Django + API REST + interface web',
    description: `## Objectif
Permettre le suivi des stocks agricoles (semences, récoltes, produits transformés) dans l'ERP.

## Livrable attendu
- Modèles : \`Product\`, \`StockMovement\`, \`Warehouse\`, \`StockAlert\`
- API : CRUD produits, mouvements entrée/sortie, état stock temps réel
- Interface web : tableau de bord stock, alertes seuil minimal
- Import CSV pour migration données existantes
- Tests : mouvements corrects, alertes déclenchées

## Critères d'acceptation
- [ ] Comptable peut voir le stock en temps réel
- [ ] Alerte email si stock < seuil configuré
- [ ] Export Excel état stock mensuel`,
    project_id: PROJ.ERP,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CTO,
  },
  {
    title: '[IMPL] Export PDF rapport financier mensuel — Weasyprint + template Board',
    description: `## Objectif
Générer automatiquement le rapport financier mensuel au format PDF pour le Board.

## Livrable attendu
- Template HTML/CSS rapport (logo MADAGRO, tableaux, graphiques)
- Endpoint \`GET /api/reports/monthly/?month=2026-04\` retourne PDF
- Données : P&L, flux trésorerie, stock, KPIs
- Celery task automatique le 1er de chaque mois
- Envoi email automatique au CFO + CEO

## Critères d'acceptation
- [ ] PDF généré en < 30s
- [ ] Données identiques au dashboard ERP
- [ ] Format A4, imprimable, professionnel`,
    project_id: PROJ.ERP,
    priority: 'medium',
    status: 'todo',
    assignee: AGENTS.Comptable,
  },

  // =========================================================
  // AGRO SUPPLY
  // =========================================================
  {
    title: '[COO] Cartographier et qualifier 10 fournisseurs prioritaires (semences, engrais)',
    description: `## Objectif
Construire la base fournisseurs qualifiés pour sécuriser les approvisionnements agricoles.

## Livrable attendu
- Tableau comparatif 10 fournisseurs : prix, délai, certifications, zone de couverture
- Visite ou appel de qualification pour les 3 meilleurs
- Score fournisseur (qualité/prix/fiabilité/localisation)
- Recommandation des 3 fournisseurs stratégiques à contracter

## Critères d'acceptation
- [ ] 10 fournisseurs identifiés et contactés
- [ ] Tableau partagé avec COO et CEO
- [ ] 1 contrat-cadre signé avant Juin 2026`,
    project_id: PROJ.SUPPLY,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.COO,
  },
  {
    title: '[COO] Contrat-type fournisseur MADAGRO SUPPLY — prix, délais, pénalités, qualité',
    description: `## Objectif
Standardiser les relations fournisseurs pour protéger MADAGRO légalement et financièrement.

## Livrable attendu
- Template contrat fournisseur (droit malgache)
- Clauses : prix ferme 3 mois, délai livraison, contrôle qualité, pénalités retard
- Clause force majeure adaptée contexte Madagascar (météo, logistique)
- Validation Fiscaliste + COO

## Critères d'acceptation
- [ ] Contrat validé juridiquement
- [ ] Utilisable pour les 3 premiers fournisseurs qualifiés`,
    project_id: PROJ.SUPPLY,
    priority: 'medium',
    status: 'backlog',
    assignee: AGENTS.Paige,
  },

  // =========================================================
  // AGRO RETAIL & FOOD
  // =========================================================
  {
    title: '[CMO] Modèle de distribution domestique Phase 1 — circuits courts + marchés locaux',
    description: `## Objectif
Définir comment MADAGRO va vendre ses produits sur le marché intérieur malgache.

## Livrable attendu
- Cartographie des canaux : marchés locaux, supermarchés, restaurants, hôtels
- Modèle financier : marges, prix de vente recommandés, coûts logistiques
- 3 partenaires distribution identifiés et approchés
- Plan d'action 90 jours pour les premières ventes domestiques

## Critères d'acceptation
- [ ] Document validé par CEO + COO
- [ ] 1 accord de principe avec 1 distributeur avant Juin 2026`,
    project_id: PROJ.RETAIL,
    priority: 'medium',
    status: 'todo',
    assignee: AGENTS.CMO,
  },

  // =========================================================
  // HOLDING — Actions concrètes
  // =========================================================
  {
    title: '[HOLDING] Immatriculer MADAGRO HOLDING SASU — statuts + dépôt capital + INPI',
    description: `## Objectif
Créer juridiquement la holding française qui chapeautera l'ensemble du groupe.

## Étapes
1. Rédiger les statuts SASU (objet social : holding animatrice, prise de participations)
2. Ouvrir compte séquestre notaire ou banque pour dépôt capital (1€ minimum, recommandé 1000€)
3. Soumettre sur guichet-entreprises.fr (ou INPI) : statuts + justificatifs
4. Obtenir le KBIS et le numéro SIREN
5. Publication annonce légale (environ 150€)

## Livrable attendu
- KBIS MADAGRO HOLDING SASU
- Numéro SIREN actif
- Compte bancaire professionnel ouvert

## Critères d'acceptation
- [ ] KBIS reçu
- [ ] Immatriculation INPI confirmée
- [ ] Deadline : avant fin Mai 2026`,
    project_id: PROJ.HOLDING,
    priority: 'critical',
    status: 'todo',
    assignee: AGENTS.Fiscal,
  },
  {
    title: '[HOLDING] Ouvrir compte bancaire professionnel HOLDING — Qonto ou BNP Pro',
    description: `## Objectif
Disposer d'un compte bancaire dédié à la holding pour gérer les flux inter-filiales.

## Options recommandées
- **Qonto** : 9€/mois, ouverture 100% en ligne, virements SEPA gratuits — idéal pour holding légère
- **BNP Pro** : plus crédible pour partenaires institutionnels, coût plus élevé
- **Shine** : 7.90€/mois, très bien pour auto-entrepreneurs et SASU

## Documents nécessaires
- KBIS de la holding (prérequis)
- Pièce d'identité fondateur
- Justificatif domicile

## Critères d'acceptation
- [ ] Compte ouvert avec IBAN FR actif
- [ ] Carte Visa Pro reçue
- [ ] Accès API bancaire configuré pour l'ERP`,
    project_id: PROJ.HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CFO,
  },
  {
    title: '[HOLDING] Convention de trésorerie Holding → Filiales (cash pooling)',
    description: `## Objectif
Mettre en place un mécanisme légal permettant à la holding de prêter/recevoir des fonds des filiales sans risque fiscal.

## Livrable attendu
- Convention de trésorerie signée entre HOLDING et MADAGRO GROUP SAS
- Taux d'intérêt conforme (taux Banque de France + marge)
- Comptabilisation correcte dans les deux entités
- Validation par expert-comptable

## Critères d'acceptation
- [ ] Convention signée par les deux structures
- [ ] Avis expert-comptable favorable
- [ ] Prix de transfert documentés`,
    project_id: PROJ.HOLDING,
    priority: 'high',
    status: 'backlog',
    assignee: AGENTS.CFO,
  },
  {
    title: '[HOLDING] Apport en nature des parts MADAGRO GROUP dans la HOLDING',
    description: `## Objectif
Transférer les participations du fondateur dans MADAGRO GROUP vers la holding pour bénéficier du régime mère-fille.

## Pourquoi c'est important
- Dividendes remontés à la holding : exonérés à 95% (régime mère-fille)
- Plus-values de cession : report d'imposition
- Optimisation IS via intégration fiscale possible à terme

## Étapes
1. Évaluation des parts MADAGRO GROUP (commissaire aux apports si > 30k€)
2. Résolution d'assemblée générale extraordinaire
3. Enregistrement auprès des impôts
4. Mise à jour des registres des associés

## Critères d'acceptation
- [ ] Acte d'apport signé et enregistré
- [ ] Parts inscrites au nom de la HOLDING dans le registre`,
    project_id: PROJ.HOLDING,
    priority: 'medium',
    status: 'backlog',
    assignee: AGENTS.Fiscal,
  },
  {
    title: '[HOLDING] Pacte d\'actionnaires MADAGRO GROUP — fondateur vs futurs investisseurs',
    description: `## Objectif
Protéger le fondateur avant toute entrée d'investisseurs en formalisant les règles du jeu.

## Clauses essentielles à inclure
- Droit de préemption (priorité d'achat si cession de parts)
- Clause d'agrément (accord requis pour tout nouvel actionnaire)
- Clause anti-dilution (protection en cas de levée de fonds)
- Drag-along / Tag-along (protection minoritaires et majorité)
- Gouvernance : nombre de votes par type de décision
- Vesting fondateur (si co-fondateurs à venir)

## Livrable attendu
- Pacte rédigé par avocat spécialisé (droit des sociétés)
- Validé par le fondateur
- Prêt à être signé avant toute levée de fonds

## Critères d'acceptation
- [ ] Pacte rédigé et relu par avocat
- [ ] Approuvé par fondateur`,
    project_id: PROJ.HOLDING,
    priority: 'high',
    status: 'backlog',
    assignee: AGENTS.Fiscal,
  },

  // =========================================================
  // OCÉAN INDIEN — Île Maurice Hub
  // =========================================================
  {
    title: '[ÎLE MAURICE] Créer entité GBC1 — dossier FSC + avocat local + compte bancaire',
    description: `## Objectif
Concrétiser l'analyse favorable sur Île Maurice en créant une entité opérationnelle.

## Pourquoi une GBC1 (Global Business Company)
- Taux IS : 3% effectif (régime partial exemption)
- Accès réseau de 46 conventions fiscales (dont France-Maurice, Maurice-Madagascar)
- Hub idéal pour facturation internationale et dividendes groupe

## Étapes
1. Mandater un Management Company agréé FSC (ex: Vistra, Trident Trust — budget ~3000€/an)
2. Dossier FSC : business plan, structure actionnariat, KYC fondateur
3. Obtenir le Certificate of Incorporation
4. Ouvrir compte bancaire MCB ou SBM Mauritius

## Livrable attendu
- Entité GBC1 créée et active
- Compte bancaire offshore opérationnel
- Convention de services inter-groupe documentée

## Critères d'acceptation
- [ ] Certificate of Incorporation reçu
- [ ] Compte bancaire MCB ouvert avec IBAN`,
    project_id: PROJ.OCEAN,
    priority: 'high',
    status: 'backlog',
    assignee: AGENTS.Fiscal,
  },

  // =========================================================
  // BOARD — Décisions urgentes fondateur
  // =========================================================
  {
    title: '[BOARD ⚠️ FONDATEUR] Décision : ARCE (capital) vs Maintien ARE mensuel — deadline 7 Avril',
    description: `## Décision requise du fondateur

### Option A — Maintien ARE mensuel
- Continuité des allocations pendant la création
- Montant mensuel maintenu tant que revenus entreprise < ARE
- Sécurité financière maximale court terme
- **Recommandé si : trésorerie personnelle faible, projet encore incertain**

### Option B — ARCE (60% du reliquat en capital)
- Versement immédiat de 60% du solde ARE restant
- Fin du versement mensuel
- Injection de trésorerie dans l'entreprise
- **Recommandé si : projet avancé, besoin de capital immédiat, confiance dans les revenus**

### Calcul à faire avant de décider
\`\`\`
Simulateur : simulateur.pole-emploi.fr
Solde ARE restant × 60% = capital ARCE
vs
ARE mensuel × nb mois restants estimés
\`\`\`

## Action fondateur
- [ ] Simuler les deux options sur pole-emploi.fr
- [ ] Décision communiquée avant 7 Avril 2026
- [ ] Informer CFO pour plan de trésorerie`,
    project_id: PROJ.BOARD,
    priority: 'critical',
    status: 'todo',
  },
  {
    title: '[BOARD] Valider architecture technique MIORA Phase 4 — revue CTO + décision stack',
    description: `## Objectif
Le Board valide les choix techniques structurants avant d'engager les développements Phase 4 (Marketplace + Mobile App).

## Points à valider
1. **Stack mobile** : React Native vs Flutter vs PWA — impact coût et délai
2. **Infrastructure** : monolith Django vs microservices — décision pour 2 ans
3. **Base de données** : PostgreSQL seul vs TimeSeries DB pour IoT (InfluxDB?)
4. **Provider cloud** : AWS vs Hetzner vs OVH Madagascar
5. **Budget infrastructure mensuel** : enveloppe validée

## Livrable attendu
- Document de décision technique signé CEO + CTO
- Budget mensuel infrastructure validé CFO
- Roadmap Phase 4 mise à jour

## Critères d'acceptation
- [ ] Réunion Board tenue avant 15 Avril
- [ ] Toutes les décisions consignées dans un ADR (Architecture Decision Record)`,
    project_id: PROJ.BOARD,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CTO,
  },
  {
    title: '[BOARD] Tableau de bord fondateur — synthèse hebdo automatique (KPIs + actions requises)',
    description: `## Objectif
Le fondateur dispose chaque lundi matin d'un récapitulatif clair : ce qui avance, ce qui bloque, ce qu'il doit décider.

## Contenu du brief hebdo
- Issues en cours par agent (3 max par agent)
- Issues bloquées nécessitant action fondateur
- KPIs semaine : paiements reçus, nouveaux inscrits pilote, coûts IA
- Alertes fiscales/légales (deadlines)
- 1 recommandation prioritaire

## Livrable attendu
- Agent Secretary configuré avec prompt brief hebdo
- Template Markdown standardisé
- Envoi automatique chaque lundi 8h via Paperclip routine
- Format lisible en 5 minutes max

## Critères d'acceptation
- [ ] Premier brief reçu lundi suivant
- [ ] Fondateur confirme : "je comprends la situation en 5 min"`,
    project_id: PROJ.BOARD,
    priority: 'high',
    status: 'todo',
    assignee: AGENTS.CEO,
  },
];

async function createIssues(client, issues) {
  let created = 0;
  let skipped = 0;

  for (const issue of issues) {
    // Check for duplicate by title
    const existing = await client.query(
      'SELECT id FROM issues WHERE company_id = $1 AND title = $2',
      [COMPANY_ID, issue.title]
    );

    if (existing.rows.length > 0) {
      console.log(`SKIP (exists): ${issue.title.substring(0, 60)}`);
      skipped++;
      continue;
    }

    const id = crypto.randomUUID();
    await client.query(`
      INSERT INTO issues (
        id, company_id, project_id, title, description,
        status, priority, assignee_agent_id,
        origin_kind, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', NOW(), NOW())
    `, [
      id,
      COMPANY_ID,
      issue.project_id || null,
      issue.title,
      issue.description || null,
      issue.status || 'backlog',
      issue.priority || 'medium',
      issue.assignee || null,
    ]);

    console.log(`✅ CREATED [${issue.priority.toUpperCase()}] ${issue.title.substring(0, 70)}`);
    created++;
  }

  console.log(`\n📊 Résultat : ${created} issues créées, ${skipped} ignorées (doublon)`);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://paperclip:paperclip@localhost:54329/paperclip'
  });

  await client.connect();
  console.log('🚀 Connexion DB OK — création des issues MIORA + Holding...\n');
  await createIssues(client, issues);
  await client.end();
  console.log('\n✅ Script terminé. Rafraîchis Paperclip pour voir les nouvelles issues.');
}

main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
