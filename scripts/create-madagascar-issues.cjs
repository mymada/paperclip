const pg = require('/root/paperclip/node_modules/.pnpm/pg@8.18.0/node_modules/pg');
const crypto = require('crypto');
const { Client } = pg;

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';
const PROJ_HOLDING = 'b5300a3f-f6f2-4816-9c57-ad20f79e15cd';
const PROJ_OCEAN   = '6f8d3eb3-057d-460c-b1d7-2175fb11a9b1';
const PROJ_BOARD   = '04b33790-d10b-490c-8e33-92a96010df39';
const FISCAL   = 'd1bbddfb-8248-4324-9833-7d99c5407105';
const STERLING = 'ff61e396-7c29-486c-8592-69a7363363dd';
const CFO      = '9536b4c0-552b-46aa-82b0-a73a86336a22';

const issues = [
  {
    title: "[PHASE 1 — URGENCE] Clarifier la compatibilité ARE/chômage avec la création d'entreprise",
    project_id: PROJ_BOARD,
    priority: 'critical',
    status: 'todo',
    assignee: STERLING,
    description: `## Contexte fondateur
Le fondateur de MADAGRO GROUP est en fin de contrat salarié en France. Il doit comprendre PRÉCISÉMENT les règles avant d'agir, sous peine de devoir rembourser des allocations indûment perçues.

## Mission
Tu es Sterling, stratège de MADAGRO. Produis une note d'action immédiate et pratique.

## Livrable : Note pratique ARE + création d'entreprise

### 1. LES 3 DISPOSITIFS CLÉS

**ACRE** — Aide à la Création ou Reprise d'Entreprise
- Exonération 50% des charges sociales la 1ère année (si revenus < 3 PASS = 46k€)
- Demande : formulaire Urssaf AVANT immatriculation (ou simultanément)
- Condition d'obtention de l'ARCE

**ARE maintenu** — Allocation mensuelle réduite
- Calcul : ARE mensuel − (70% × revenus nets d'activité)
- Obligation de déclaration mensuelle sur pole-emploi.fr
- Sécurité maximale pour le fondateur

**ARCE** — Capital immédiat
- 60% du reliquat ARE versé en 2 tranches (création + 6 mois)
- Irréversible — fin du versement mensuel
- Nécessite l'ACRE préalablement accordée

### 2. OBLIGATIONS LÉGALES — CALENDRIER

- Fin du contrat : s'inscrire France Travail dans les 12 mois (idéalement J+1)
- Immatriculation : déclarer à France Travail dans les 72H
- Chaque mois : déclarer les revenus d'activité (même si 0)
- Déclarer l'ACRE à l'Urssaf au moment de l'immatriculation

### 3. RISQUES À ÉVITER ABSOLUMENT

- Ne PAS immatriculer sans avoir informé France Travail → trop-perçu exigé
- Ne PAS exercer d'activité avant immatriculation → travail dissimulé
- Ne PAS omettre la déclaration mensuelle → remboursement intégral possible

### 4. CHECKLIST ACTIONS CETTE SEMAINE

- [ ] Vérifier la date de fin de contrat exacte et le nombre de jours de droit ARE
- [ ] S'inscrire sur pole-emploi.fr dès la fin du contrat
- [ ] Simuler les droits sur simulateur.pole-emploi.fr
- [ ] Prendre RDV conseiller France Travail avec le projet MADAGRO
- [ ] Calculer : ARCE vs maintien ARE → issue [BOARD ⚠️] Décision ARCE

### 5. SIMULATION SIMPLIFIÉE

Si reliquat ARE = 20 000€ et ARE mensuel = 1 500€ :
- ARCE option : 12 000€ immédiat (60%) + 8 000€ à M+6 = 20 000€ total, zéro mensuel
- Maintien ARE : 1 500€/mois pendant 13 mois = 19 500€ total, revenus réguliers

Point de bascule : si revenus MADAGRO dépassent 2 142€/mois brut avant M+13 → ARCE est meilleure`
  },
  {
    title: "[PHASE 1] Définir précisément l'objet du projet Madagascar",
    project_id: PROJ_HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: STERLING,
    description: `## Contexte
MADAGRO GROUP est un groupe agri-tech malgache. MIORA est la plateforme SaaS agricole. Tu dois formaliser la fiche projet de référence.

## Mission
Tu es Sterling, stratège de MADAGRO. Produis le document de définition du projet — la boussole pour toutes les décisions futures.

## Livrable : Project Charter MADAGRO GROUP

### VISION
Devenir le leader de l'agriculture intelligente à Madagascar en connectant 100 000 agriculteurs aux marchés régionaux via la data et l'IA d'ici 2030.

### PROBLÈMES RÉSOLUS
1. Accès aux marchés : 80% des agriculteurs malgaches ne peuvent pas exporter faute de traçabilité et de contacts acheteurs
2. Financement agricole : crédit récolte inaccessible pour les petits producteurs (< 2ha)
3. Rendements sous-optimaux : pas de données terrain pour guider les pratiques agricoles

### SOLUTION MIORA
Plateforme SaaS combinant :
- Capteurs IoT Sparky (données terrain temps réel)
- Trust Score (fiabilité agriculteur pour accès crédit et marketplace)
- Marketplace B2B (mise en relation producteurs/acheteurs export)
- Mobile Money (paiements et crédit via téléphone)
- Dashboard coopérative (pilotage, conformité, commission)

### MODÈLE ÉCONOMIQUE (à détailler)

| Source de revenus | Mécanisme | Cible An 1 | Cible An 3 |
|------------------|-----------|-----------|-----------|
| Abonnements MIORA | 1 000-5 000 Ar/mois/agriculteur | 500 abonnés | 10 000 abonnés |
| Commission Marketplace | 2.5% par transaction | 50 transactions | 1 000 transactions |
| Crédit Récolte | 8-12% annuel | 20 prêts pilotes | 500 prêts |
| Licences coopératives B2B | Abonnement annuel | 5 coopératives | 50 coopératives |

### CLIENTS CIBLES
1. Agriculteurs membres de coopératives (profil : 1-5ha, smartphone Android basique)
2. Coopératives agricoles certifiées (profil : 20-100 membres, leadership réceptif)
3. Acheteurs export Océan Indien (importateurs France, Réunion, Maurice)

### MÉTRIQUES SUCCÈS AN 1
- 100 fermes avec capteur Sparky actif
- 500 agriculteurs actifs MIORA
- 10 contrats export signés via Marketplace
- MRR ≥ 500k Ariary (≈ 100€) à M+6
- 3 coopératives partenaires signées

### RISQUES CRITIQUES
1. Connectivité rurale → Mitigation : mode offline-first + USSD fallback
2. Adoption agriculteurs → Mitigation : formation terrain via chefs de coopérative
3. Trésorerie fondateur → Mitigation : ARCE + prêt d'honneur BPI`
  },
  {
    title: "[PHASE 1] Étude de marché Madagascar / Océan Indien",
    project_id: PROJ_OCEAN,
    priority: 'high',
    status: 'todo',
    assignee: STERLING,
    description: `## Mission
Tu es Sterling, stratège de MADAGRO. Produis une étude de marché complète pour valider le potentiel de MADAGRO/MIORA avant d'engager les fonds.

## Livrable : Rapport d'étude de marché (12-15 pages Markdown)

### 1. TAILLE DU MARCHÉ AGRICOLE MALGACHE

Données de référence :
- PIB agricole Madagascar : ~26% du PIB (≈ 3.5 Mds USD secteur)
- Nombre d'agriculteurs : ~4 millions de ménages
- Surface cultivée : 3.5M hectares (1.2M riz)
- Part small-holders (< 2ha) : 80%
- Pénétration Mobile Money : 45% (Orange Money + MVola)
- Smartphones en zone rurale : 15% (croissance 25%/an)

Marché adressable MIORA (TAM/SAM/SOM) :
- TAM : tous les agriculteurs avec téléphone (600k ménages)
- SAM : coopératives structurées avec leadership digital (2 000 coopératives = 100k agriculteurs)
- SOM An 1 : Lac Alaotra (riz) + Sava (vanille) = 5 000 agriculteurs cibles

### 2. CULTURES CIBLES ET PRIX D'EXPORT

| Culture | Production annuelle | Prix export actuel | Marchés prioritaires | Certification demandée |
|---------|--------------------|--------------------|---------------------|----------------------|
| Vanille | 2 500-3 000 t/an | 400-600 USD/kg | France, USA, Allemagne | FLO, Bio, ECOCERT |
| Riz (Vary gasy) | 3.5 Mt/an | Marché local + La Réunion | Réunion, Comores | GAP |
| Litchi | 20 000 t export | 1.5-2 USD/kg | France (Oct-Jan) | GlobalGAP |
| Poivre noir | 2 000 t/an | 5-8 USD/kg | Europe, Asie | Bio |
| Girofle | 5 000-8 000 t/an | 3-5 USD/kg | Monde | - |

### 3. ANALYSE CONCURRENTIELLE

Concurrents globaux (non présents à Madagascar) :
- DigiFarm (Safaricom Kenya) : Mobile Money + agri-data, non présent à Madagascar
- Hello Tractor : mécanisation, pas de SaaS data
- Agriledger : blockchain, pilotes Caraïbes/Afrique, pas de traction Madagascar

Acteurs locaux existants :
- BVPI-SEHP : projet de développement rizicole (ONG, pas commercial)
- FIFABE : fédération intrants (distribution, pas SaaS)
- Applis bancaires BNI/BOA : paiements seulement, pas de data agricole

Conclusion : Aucun concurrent direct sur le segment SaaS agri-data Madagascar.

### 4. OPPORTUNITÉS OCÉAN INDIEN

Accords commerciaux exploitables :
- COMESA (Common Market for Eastern and Southern Africa) : accès 600M consommateurs, droits de douane réduits 0-25%
- EPA UE-Madagascar : accès préférentiel 97% produits agricoles vers l'UE, sans quota pour vanille/épices
- Accord Madagascar-Maurice : hub financier régional via GBC1

Marchés export prioritaires :
1. La Réunion (DOM-FR) : 900k habitants, fort pouvoir d'achat, préférence produits locaux Océan Indien
2. Maurice : hub de redistribution, forte demande produits premium, 1.3M habitants
3. Comores : demande produits de base (riz, légumineuses), proximité géographique
4. France métro : diaspora malgache 200k personnes, restauration asiatique en croissance

### 5. BARRIÈRES ET FACTEURS CLÉ DE SUCCÈS

Barrières identifiées :
- Infrastructure routière : 30% des routes praticables toute l'année
- Électricité rurale : taux d'accès ~15% en zone agricole
- Littératie numérique : 60% des agriculteurs n'ont jamais utilisé une app
- Corruption douanière : impact sur coûts d'export (-5 à -15% marges)

Facteurs Clés de Succès MIORA :
- Partenariat avec chef de coopérative (pas de démarche individuelle)
- App fonctionnelle offline + USSD/SMS pour zones sans 4G
- Formation terrain systématique (coach agricole MIORA)
- Intégration Mobile Money dès J+1 (pas de friction paiement)
- Ancrage local fort (équipe malgache, langue malagasy)

### 6. RECOMMANDATION STRATÉGIQUE

Zone pilote recommandée : LAC ALAOTRA (Alaotra-Mangoro)
- Plus grande plaine rizicole de Madagascar
- Coopératives structurées (HMAD, FAUR, VFTV)
- Infrastructure 4G disponible sur les axes principaux
- Accès Tamatave (port export) en 4h de route
- Modèle exportable vers Sava (vanille) à M+9

Timeline réaliste :
- M+1 à M+3 : Pilote 10 fermes (proof of concept)
- M+4 à M+6 : Extension 100 fermes (pilote commercial)
- M+7 à M+12 : Lancement Marketplace + 3 contrats export signés`
  },
  {
    title: "[PHASE 2] Choisir le statut juridique en France",
    project_id: PROJ_HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: FISCAL,
    description: `## Mission
Tu es Fiscaliste de MADAGRO. Produis une note de recommandation claire sur le statut juridique optimal pour la structure française.

## Livrable : Note de recommandation statut juridique France

### CONTEXTE DE DÉCISION
- Fondateur seul au démarrage
- Activité : holding animatrice de MADAGRO GROUP Madagascar
- Besoin de régime mère-fille (dividendes Madagascar exonérés à 95%)
- Compatible ARE/ARCE obligatoire
- Levée de fonds future prévue (Série A à 18 mois)
- Budget création < 500€

### COMPARATIF DES STATUTS

| Critère | Micro-entrepreneur | SASU | SARL EURL |
|---------|:-----------------:|:----:|:---------:|
| Coût création | 0€ | 200-500€ | 300-600€ |
| Plafond CA | 77k€ | Illimité | Illimité |
| Holding possible | NON | OUI | OUI |
| Régime mère-fille | NON | OUI ✅ | OUI ✅ |
| Levée de fonds (SAS) | NON | OUI ✅ | Difficile |
| Protection patrimoine | NON | OUI | OUI |
| Compatibilité ARE | OUI | OUI | OUI |
| Statut social | Micro-social | Assimilé salarié | TNS (gérant majo.) |
| IS / IR | IR seulement | IS (option IR) | IS obligatoire |

### RECOMMANDATION : SASU (code APE/NAF 6420Z — Holdings)

Justification :
1. Seule structure permettant le régime mère-fille (économie fiscale majeure sur dividendes malgaches)
2. Transformation en SAS facile si associés rejoignent
3. Statut assimilé salarié = accès à la protection sociale complète (retraite, maladie)
4. Compatible ARCE (le capital ARCE peut être apporté à la SASU)
5. Structure idéale pour la Série A future (investisseurs préfèrent les SAS)

Code NAF recommandé : 6420Z "Activités des sociétés holding"
Objet social : "La prise de participations dans toute société, notamment dans des sociétés agri-tech, et toutes prestations de services aux filiales"

### ALTERNATIVE : Double structure

En complément de la SASU holding, créer une micro-entreprise pour :
- Facturer des prestations de conseil à court terme (revenus rapides)
- Plafond 77k€ services — suffisant pour la phase de démarrage
- Coût : 0€ de création, 12-22% de charges selon revenus

Cette combinaison (SASU + auto-entrepreneur) est légale et optimale pour la phase 1.

### PLAN D'ACTION IMMÉDIAT
1. Décider du capital (minimum 1€, recommandé 1 000€ pour crédibilité)
2. Rédiger les statuts (voir issue Immatriculation)
3. Déposer sur guichet-entreprises.fr (délai 3-5 jours)
4. Déclarer à France Travail dans les 72H après immatriculation`
  },
  {
    title: "[PHASE 2] Choisir la structure juridique côté Madagascar",
    project_id: PROJ_OCEAN,
    priority: 'high',
    status: 'todo',
    assignee: FISCAL,
    description: `## Mission
Tu es Fiscaliste de MADAGRO Group. Produis la recommandation de structure juridique pour opérer légalement à Madagascar.

## Livrable : Note de recommandation structure malgache

### OPTIONS DISPONIBLES

**SARL malgache** (Société à Responsabilité Limitée)
- Capital minimum : 200 000 Ariary (~40€) depuis réforme 2021
- Création via EDBM : 3-5 jours ouvrés
- IS : 20% du résultat
- Dividendes vers France : 5% retenue à la source (convention Franco-Malgache)
- Recommandé pour Phase 1 ✅

**SA malgache** — Trop lourde pour Phase 1 (capital min 10M Ar)

**Simple contrat commercial** — Risque juridique, pas de protection

### RECOMMANDATION : SARL malgache à associé unique (MADAGRO HOLDING = 100%)

Configuration :
- Associé unique : MADAGRO HOLDING SASU (France)
- Gérant : fondateur ou manager local de confiance
- Objet : développement logiciel, conseil agricole, commerce de produits agricoles
- Capital initial : 2M Ariary (~400€) — signal de sérieux pour les partenaires locaux

### PROCÉDURE EDBM (Economic Development Board of Madagascar)

Documents requis :
- Formulaire EDBM de constitution (téléchargeable sur edbm.mg)
- Statuts en français (modèle disponible sur EDBM)
- Copie passeport associé(s) certifiée conforme
- KBIS MADAGRO HOLDING (associé français)
- Justificatif de domicile des gérants
- Attestation de dépôt capital (BNI Madagascar ou BOA)
- Contrat de domiciliation si pas de local propre

Délai total : 5-7 jours ouvrés, coût : ~50 000 Ariary (~10€) officiels

### COMPTE BANCAIRE RECOMMANDÉ
**BNI Madagascar** : meilleure infrastructure SWIFT pour flux France-Madagascar
- Documents : statuts + NIF + RCS + identité gérant
- Délai ouverture : 5-10 jours ouvrés

### OBLIGATIONS FISCALES ANNUELLES
- IS 20% (déclaration avant 15 Avril)
- TVA 20% (si CA > 200M Ar/an ≈ 40k€)
- IRSA mensuel (retenue salaires)
- CNaPS trimestriel (cotisations sociales employeur)

### AVANTAGES FISCAUX DISPONIBLES
- Zone Franche Industrielle (ZFI) : IS à 10% si activité éligible (transformation agricole)
- Exonérations EDBM pour investissements > 500M Ar : à explorer Phase 2`
  },
  {
    title: "[PHASE 2] Rédiger le Business Plan",
    project_id: PROJ_HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: STERLING,
    description: `## Mission
Tu es Sterling, stratège de MADAGRO. Produis le business plan complet du groupe, utilisable pour les financements (BPI, prêt d'honneur) et les partenaires.

## Livrable : Business Plan MADAGRO GROUP — Complet (Markdown)

### STRUCTURE OBLIGATOIRE (8 sections)

**1. RÉSUMÉ EXÉCUTIF (1 page)**
- Vision en 1 phrase percutante
- Problème : chiffres d'impact (% agriculteurs sans accès marché)
- Solution : MIORA en 3 lignes
- Traction actuelle : nombre de coopératives approchées, pilotes en cours
- Équipe : fondateur + description compétences clés
- Besoin : X€ pour Y mois de runway
- Projections : CA An 1/2/3

**2. PROBLÈME ET SOLUTION**
Détailler les 3 problèmes avec données factuelles
Pourquoi MAINTENANT : convergence Mobile Money + IA + 4G rurale
Solution MIORA : fonctionnalités, différenciation vs alternatives

**3. ANALYSE DE MARCHÉ** (reprendre les données de l'étude de marché)
- TAM/SAM/SOM avec chiffres
- Concurrence (trous dans le marché)
- Avantage compétitif durable

**4. MODÈLE ÉCONOMIQUE**

Tableau projections financières 3 ans (mensuel An 1, trimestriel An 2-3) :
| Mois | Abonnés | MRR (Ar) | CA Total | Charges | Résultat |
|------|---------|----------|----------|---------|---------|
| M1 | 50 | 50k | ... | ... | ... |
| M3 | 150 | 150k | ... | ... | ... |
| M6 | 500 | 500k | ... | ... | ... |
| M12 | 2000 | 2M | ... | ... | ... |

Seuil de rentabilité : mois X avec Y abonnés

**5. PLAN OPÉRATIONNEL**
- Structure : fondateur + équipe locale Madagascar + agents IA
- Infrastructure : VPS + IoT Sparky + app mobile + Paperclip
- Partenariats clés : Orange Money, coopératives HMAD/FAUR, EDBM
- Jalons 12 mois avec dates et KPIs

**6. PLAN FINANCIER DÉTAILLÉ**

Budget opérationnel mensuel :
| Poste | M1-M3 | M4-M6 | M7-M12 |
|-------|-------|-------|--------|
| Serveur VPS | 40€ | 40€ | 80€ |
| Équipe locale Mada | 0€ | 500€ | 1 500€ |
| Déplacements | 200€ | 500€ | 300€ |
| Outils IA/Paperclip | 100€ | 200€ | 400€ |
| IoT Sparky (prototypes) | 350€ | 0€ | 500€ |
| Marketing | 50€ | 200€ | 500€ |
| **TOTAL** | **740€** | **1 440€** | **3 280€** |

**7. PLAN DE FINANCEMENT**
- ARCE ou ARE + prêt d'honneur = bootstrap 18 mois
- Détail source par source avec montants et timing

**8. RISQUES ET MITIGATION**
Top 5 risques avec probabilité, impact et plan de réponse concret`
  },
  {
    title: "[PHASE 2] Identifier et sécuriser les financements",
    project_id: PROJ_HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: CFO,
    description: `## Mission
Tu es CFO de MADAGRO Group. Produis la cartographie complète des financements disponibles et un plan d'action priorisé.

## Livrable : Plan de financement MADAGRO — Phase 1 (18 mois)

### FINANCEMENT FONDATEUR

| Source | Montant estimé | Timing | Action requise |
|--------|---------------|--------|----------------|
| ARCE (60% reliquat ARE) | À calculer selon droits | J+60 après création | Voir issue ARCE/ARE |
| Économies personnelles | Variable | Immédiat | - |

### DISPOSITIFS PUBLICS FRANCE — PRIORITÉ HAUTE

**Prêt d'honneur Initiative France / Réseau Entreprendre**
- Montant : 5 000 à 50 000€ (taux 0%, sans garantie personnelle)
- Condition : dossier + jury de chefs d'entreprise
- Délai : 2-3 mois après dépôt
- Action : contacter Initiative France de sa région + préparer BP

**Prêt à la création BPI France**
- Montant : 10 000 à 100 000€
- Condition : projet innovant + co-financement bancaire
- Action : prendre RDV BPI via bpifrance.fr/contactez-nous

**Microcrédit Adie**
- Montant : jusqu'à 12 000€ en 48h
- Condition : pas d'accès au crédit bancaire classique
- Idéal : financer prototypes Sparky IoT rapidement

**Subventions régionales**
- Variable selon région (certaines ont des aides pour projets franco-africains)
- Action : contacter le service développement économique de la région

### FINANCEMENTS MADAGASCAR / INTERNATIONAL

| Source | Description | Montant potentiel | Délai |
|--------|-------------|-----------------|-------|
| AFD — Agence Française de Développement | Prêts projets agriculture Afrique | 50k-500k€ | 6-12 mois |
| PROPARCO (filiale AFD) | Investissements secteur privé Afrique | 500k€+ | 12 mois+ |
| USAID Feed the Future | Subventions agri-tech développement | 25k-250k USD | Appels annuels |
| GreenTec Capital Partners | VC Afrique early-stage | 100k-500k€ | 6 mois |
| EDBM Investment Incentives | Exonérations fiscales Madagascar | Non-monétaire | Immédiat |

### RÉSEAUX ET DIASPORA

- **Association CIMES** (Communauté des Ingénieurs Malgaches de l'Étranger) : réseau business
- **CCI France-Madagascar** (ccifm.mg) : introductions partenaires
- **Club Afrique BPI** : entrepreneurs franco-africains, événements networking
- **AFAC** (Association France Afrique Commerce) : contacts importateurs

### TIMELINE RECOMMANDÉE

- Mois 1 : ARCE demandée + dossier prêt d'honneur déposé
- Mois 2-3 : Jury prêt d'honneur + BPI dossier
- Mois 4-6 : Premiers revenus MIORA pilote (validation traction)
- Mois 12-18 : Série A 200-500k€ (si MRR ≥ 5M Ar / 1 000€)`
  },
  {
    title: "[PHASE 3] Immatriculer l'entreprise en France",
    project_id: PROJ_HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: FISCAL,
    description: `## Mission
Tu es Fiscaliste de MADAGRO. Produis le dossier complet et opérationnel pour immatriculer MADAGRO HOLDING SASU cette semaine.

## Livrable 1 : Statuts SASU complets (prêts à signer)

Produis les statuts complets de MADAGRO HOLDING SASU avec tous les articles :

ARTICLE 1 — Forme : Société par Actions Simplifiée Unipersonnelle (SASU)
ARTICLE 2 — Objet social : "La société a pour objet la prise, la détention, la gestion et la cession de participations dans toute société ou groupement, notamment dans des sociétés à vocation agricole, technologique ou commerciale opérant à Madagascar ou dans la zone Océan Indien. L'animation active du groupe par la fourniture de services de direction stratégique, financière, administrative et commerciale à ses filiales. Toutes opérations industrielles, commerciales, financières, mobilières ou immobilières pouvant se rattacher directement ou indirectement à l'objet social."
ARTICLE 3 — Dénomination : MADAGRO HOLDING
ARTICLE 4 — Siège social : [Adresse du fondateur]
ARTICLE 5 — Durée : 99 ans à compter de l'immatriculation
ARTICLE 6 — Capital social : 1 000 euros divisé en 1 000 actions de 1 euro de valeur nominale
ARTICLE 7 — Libération du capital : [conditions]
ARTICLE 8 — Président : [Nom fondateur], pouvoirs étendus
[... produire TOUS les articles jusqu'à dissolution et liquidation ...]

## Livrable 2 : Checklist guichet-entreprises.fr

AVANT LE DÉPÔT (J-7) :
- [ ] Statuts signés (2 exemplaires avec paraphe sur chaque page)
- [ ] Dépôt capital sur compte séquestre Qonto (48h) ou notaire
- [ ] Attestation de dépôt capital obtenue
- [ ] CNI fondateur recto/verso
- [ ] Justificatif de domicile siège < 3 mois
- [ ] Déclaration bénéficiaires effectifs (DBE) complétée

DÉPÔT EN LIGNE :
- [ ] Créer compte sur guichet-entreprises.fr
- [ ] Choisir : Création → Société → SAS/SASU
- [ ] Code NAF : 6420Z (Holdings)
- [ ] Uploader tous les documents
- [ ] Payer : 75€ greffe + 150€ annonce légale (automatique)
- [ ] Délai KBIS : 3-5 jours ouvrés

APRÈS KBIS (obligatoire) :
- [ ] Notifier France Travail dans les 72H (si ARE en cours)
- [ ] Transmettre KBIS à Qonto pour libérer le capital
- [ ] Demander ACRE à l'Urssaf (formulaire en ligne)
- [ ] Ouvrir registre des assemblées
- [ ] Souscrire RC Pro si activité de service

## Livrable 3 : Première décision du Président (template)

DÉCISION DE L'ASSOCIÉ UNIQUE VALANT AGC :
1. Adoption des statuts
2. Nomination du Président sans rémunération (an 1)
3. Date d'ouverture du premier exercice : [date immatriculation]
Fait à [ville], le [date] — Signature : [Fondateur]`
  },
  {
    title: "[PHASE 3] Mettre en place les opérations Madagascar",
    project_id: PROJ_OCEAN,
    priority: 'medium',
    status: 'todo',
    assignee: STERLING,
    description: `## Mission
Tu es Sterling, stratège de MADAGRO. Produis le plan opérationnel pour démarrer les activités terrain à Madagascar dans les 90 jours.

## Livrable : Plan opérationnel Madagascar 90 jours

### ÉQUIPE LOCALE — RECRUTEMENT PRIORITAIRE

| Poste | Priorité | Profil | Salaire | Canaux recrutement |
|-------|----------|--------|---------|-------------------|
| Manager Opérationnel | CRITIQUE | 5+ ans ONG/agribusiness, malgachophone, permis B, réseau coopératives | 500-700k Ar/mois | LinkedIn MG, bouche-à-oreille EDBM |
| Commercial terrain | Haute | Réseau coopératives Lac Alaotra, smartphone | 300k Ar + commission | Références coopératives |
| Développeur Django junior | Haute | Diplôme EMIT/ESTI, Python confirmé | 400-500k Ar/mois | Alumni EMIT, JobMadagascar.com |

### INFRASTRUCTURE PHYSIQUE — PHASE 1

Recommandation : Co-working Antananarivo (budget maîtrisé)
- **iHub Madagascar** (Tsaralalana) : 150-200k Ar/mois, 2-3 postes, communauté tech
- **Hub Mada** (Analakely) : 100k Ar/mois, accès réseau startup
- Alternative bureau propre Phase 2 : quartier Andranomahery, ~400k Ar/mois

### OUTILS COLLABORATION FRANCO-MALGACHE

- Communication : WhatsApp Business Groups (équipe terrain) + Slack (tech)
- Documents : Google Workspace (Docs, Sheets, Drive) partagé France-Madagascar
- Gestion projet : Paperclip (issues, agents) + GitHub (code)
- Comptabilité locale : Excel + expert-comptable ONEC Madagascar
- Transferts d'argent : Wise Business (€ → Ar, frais réduits)

### CALENDRIER 90 JOURS

**MOIS 1 — FONDATIONS**
- Semaine 1 : Créer SARL MADAGRO GROUP via EDBM (5 jours)
- Semaine 2 : Ouvrir compte BNI Madagascar pro
- Semaine 3 : Domicilier au co-working iHub
- Semaine 4 : Identifier 3-5 candidats Manager Opérationnel

**MOIS 2 — ACTIVATION TERRAIN**
- Recruter Manager Opérationnel (entretiens + test)
- 1er voyage fondateur Madagascar (2 semaines minimum)
- Rencontres : 10 chefs de coopératives (Lac Alaotra — Ambatondrazaka)
- Accord de principe signé avec 3 coopératives pilotes
- Installation 5 capteurs Sparky prototype (test réseau LoRa)

**MOIS 3 — PILOTE COMMERCIAL**
- Recruter 1-2 commerciaux terrain
- Onboarding 50 premiers agriculteurs sur MIORA
- 1ers paiements Mobile Money reçus
- Rapport d'impact pilote M+3

### BUDGET OPÉRATIONNEL MADAGASCAR AN 1

| Poste | Mensuel | Annuel |
|-------|---------|--------|
| Co-working | 150k Ar | 1.8M Ar |
| Manager Opérationnel | 600k Ar | 7.2M Ar |
| 2 commerciaux terrain | 650k Ar | 7.8M Ar |
| Transport / logistique | 200k Ar | 2.4M Ar |
| 10 prototypes Sparky (investissement unique) | - | 3.5M Ar |
| Marketing local | 100k Ar | 1.2M Ar |
| **TOTAL** | **1.7M Ar** | **~24M Ar (~4 800€)** |`
  },
  {
    title: "[PHASE 3] Gérer la fiscalité et comptabilité bi-nationale",
    project_id: PROJ_HOLDING,
    priority: 'high',
    status: 'todo',
    assignee: FISCAL,
    description: `## Mission
Tu es Fiscaliste de MADAGRO Group. Produis le guide fiscal et comptable complet pour gérer MADAGRO HOLDING (France) + MADAGRO GROUP (Madagascar) sans risques.

## Livrable : Guide fiscal bi-national MADAGRO

### 1. CONVENTION FISCALE FRANCE-MADAGASCAR — POINTS CLÉS

Signée en 1983, applicable aux résidents fiscaux des deux pays :
- **Dividendes** (article 10) : retenue à la source Madagascar = 5% (vs 30% sans convention)
- **Redevances logiciel MIORA** (article 12) : 10% retenue source Madagascar
- **Intérêts prêt intragroupe** (article 11) : 0% si bénéficiaire effectif est une société française

Risque établissement stable : si le fondateur signe des contrats depuis la France au nom de MADAGRO GROUP Madagascar → risque de créer un "établissement stable" imposable en France sur les bénéfices malgaches.
RÈGLE : Le fondateur ne signe que des contrats pour MADAGRO HOLDING depuis la France, jamais directement pour la filiale malgache.

### 2. FLUX INTRAGROUPE ET PRIX DE TRANSFERT

Chaque transaction entre entités doit être au prix de marché (arm's length) :

| Transaction | Prix recommandé | Documentation |
|-------------|----------------|---------------|
| Management fees HOLDING → MADAGRO GROUP | 3-5% du CA de la filiale | Contrat de services de management |
| Licence logiciel MIORA | 8-12% du CA SaaS | Contrat de licence |
| Prêt intragroupe | Euribor 3M + 2.5-3% | Convention de trésorerie |

### 3. PLAN COMPTABLE BI-NATIONAL

France — PCG (Plan Comptable Général) :
- Compte 261 : Titres de participation (actions MADAGRO GROUP)
- Compte 274 : Créances rattachées à des participations (prêt)
- Compte 706 : Management fees facturés aux filiales
- Compte 761 : Produits de participation (dividendes reçus de Madagascar)

Madagascar — SYSCOHADA révisé :
- Classe 1 : Capitaux propres et passifs non courants
- Compte 164 : Emprunts auprès des associés (prêt HOLDING)
- Classe 7 : Revenus (ventes produits agricoles, abonnements MIORA)
- Classe 6 : Charges d'exploitation

### 4. CALENDRIER FISCAL ANNUEL

France (MADAGRO HOLDING SASU) :
- 15 Janvier : Liasse fiscale IS (si exercice calendaire) + déclaration 2777 dividendes
- Mensuel : TVA CA3 si option mensuel (ou trimestriel si CA < 700k€ HT)
- Mai : CVAE si CA > 500k€ (probablement non applicable Phase 1)

Madagascar (MADAGRO GROUP SARL) :
- 15 Avril : Déclaration et paiement IS 20%
- Mensuel : TVA (si CA > 200M Ar) + IRSA (salaires)
- Trimestriel : CNaPS (cotisations sociales)
- Annuel : Liasse SYSCOHADA déposée au greffe du Tribunal de Commerce

### 5. TRANSFERTS DE FONDS LÉGAUX

Canaux autorisés et recommandés :
- **Wise Business** (recommandé) : EUR → MGA, frais ~0.7%, délai 1-3 jours
- **Virement SWIFT BNI Madagascar** : délai 3-5 jours, frais 25-50€/virement
- Western Union Business : rapide mais frais élevés (2-3%)

Pour chaque virement : conserver la preuve du motif (facture management fee, remboursement prêt, dividende) et la retenue à la source prélevée.

### 6. EXPERT-COMPTABLE RECOMMANDÉ

France : Cabinet spécialisé franco-africain (expérience SYSCOHADA + convention fiscale Madagascar)
Budget : 2 000-4 000€/an pour suivi holding simple + déclarations IS

Madagascar : Expert-comptable membre ONEC (Ordre National des Experts Comptables)
Budget : 500k-1M Ariary/an
Critères : expérience IS + reporting actionnaire étranger + bonne maîtrise français`
  }
];

async function main() {
  const client = new Client({ connectionString: 'postgres://paperclip:paperclip@localhost:54329/paperclip' });
  await client.connect();
  let created = 0, updated = 0;

  for (const issue of issues) {
    const existing = await client.query(
      'SELECT id FROM issues WHERE company_id = $1 AND title = $2',
      [COMPANY_ID, issue.title]
    );

    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE issues SET description=$1, priority=$2, project_id=$3, assignee_agent_id=$4, updated_at=NOW() WHERE company_id=$5 AND title=$6',
        [issue.description, issue.priority, issue.project_id, issue.assignee, COMPANY_ID, issue.title]
      );
      console.log('UPDATED: ' + issue.title.substring(0, 70));
      updated++;
    } else {
      const id = crypto.randomUUID();
      await client.query(
        'INSERT INTO issues (id, company_id, project_id, title, description, status, priority, assignee_agent_id, origin_kind, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())',
        [id, COMPANY_ID, issue.project_id, issue.title, issue.description, issue.status, issue.priority, issue.assignee, 'manual']
      );
      console.log('CREATED [' + issue.priority + ']: ' + issue.title.substring(0, 70));
      created++;
    }
  }

  console.log('\nRésultat: ' + created + ' créées, ' + updated + ' mises à jour');
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
