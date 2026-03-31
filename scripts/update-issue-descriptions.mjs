/**
 * Script : Mise à jour des descriptions des issues MIORA / Holding
 * Chaque description est conçue pour qu'un agent AI puisse produire
 * un livrable concret et utilisable sans intervention humaine.
 */

import pg from 'pg';
const { Client } = pg;

const COMPANY_ID = 'c1168b33-f849-4d71-94f7-b670ce8e2b8a';

// ─── CONTEXTE GLOBAL injecté dans chaque description ─────────────────────────
const CTX = `
## Contexte MADAGRO GROUP / MIORA

**MADAGRO GROUP** est un groupe agri-tech malgache structuré en holding avec 8 filiales :
- MADAGRO SUPPLY (approvisionnement semences/intrants)
- MADAGRO TRADE (export Océan Indien / international)
- MADAGRO RETAIL & FOOD (distribution domestique)
- MADAGRO TECH (ERP propriétaire + SaaS MIORA)
- MADAGRO IOT (capteurs terrain Sparky)
- MADAGRO FINANCE (crédit récolte, Mobile Money)
- MADAGRO GOV (gouvernance, juridique, fiscal)
- MADAGRO COMM (storytelling, marketing)

**MIORA** est la plateforme SaaS qui connecte agriculteurs, coopératives et acheteurs à Madagascar.
Fonctionnalités principales :
- Trust Score agriculteur (basé sur données IoT capteurs + historique)
- Marketplace B2B (mise en relation producteurs / acheteurs export)
- Crédit Récolte via Mobile Money (Orange Money / MVola)
- Dashboard coopérative (suivi rendement, conformité, commission)
- Onboarding WhatsApp (séquence 7 jours, bilingue FR/MG)

**Stack technique MIORA** (à développer par la filiale MADAGRO TECH) :
- Backend : Django + Django REST Framework + Celery + Redis + PostgreSQL
- Frontend : React (web) + React Native ou PWA (mobile)
- Paiements : Orange Money Madagascar API + MVola (Telma)
- Messaging : Brevo (WhatsApp Business API) + SMS fallback
- IoT : ESP32-S3 + LoRa SX1276 → MQTT → backend Django
- Déploiement : VPS Hetzner/OVH + Nginx + Docker Compose + GitHub Actions CI/CD

**Environnement Paperclip** :
- Tu es un agent IA au sein de MADAGRO GROUP orchestré par Paperclip
- Tes livrables sont des **documents Paperclip** (work products, documents attachés à l'issue)
- Pour les specs techniques : produis des fichiers Markdown structurés
- Pour les documents légaux/contrats : produis des drafts complets en Markdown
- Pour le code : produis du code complet et fonctionnel dans des blocs de code
- Utilise l'outil paperclip pour sauvegarder tes livrables sur l'issue
`;

// ─── DESCRIPTIONS DÉTAILLÉES PAR ISSUE ───────────────────────────────────────

const descriptions = {

  // ═══════════════════════════════════════════════════════════
  // MIORA SaaY — Mobile Money & Crédit Récolte
  // ═══════════════════════════════════════════════════════════

  '[IMPL] US-002 — Intégration API Orange Money / MVola : endpoint Django + tests': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Tu dois produire une **spécification technique complète + prototype de code** pour l'intégration des paiements Mobile Money dans MIORA.

## Contexte business
Les agriculteurs malgaches paient leur abonnement MIORA (1000-5000 Ar/mois) via leur téléphone Mobile Money. Deux opérateurs cibles :
- **Orange Money Madagascar** : ~60% de parts de marché
- **MVola (Telma)** : ~35% de parts de marché

## Ce que tu dois produire

### Livrable 1 : Architecture technique (document Markdown)
- Diagramme de séquence du flux paiement : agriculteur → MIORA → opérateur → webhook confirmation
- Modèle de données Django : table \`Payment\`, \`Subscription\`, \`PaymentWebhook\`
- Gestion des états : pending → processing → confirmed → failed → refunded
- Stratégie retry (3 tentatives avec backoff exponentiel)

### Livrable 2 : Code Django complet
Produis le code pour les fichiers suivants :

\`\`\`
# apps/payments/models.py
class Payment(models.Model):
    id = ...  # complet avec tous les champs

# apps/payments/views.py
class MobileMoneyPaymentView(APIView):
    ...

# apps/payments/mobile_money.py
class OrangeMoneyClient:
    ...
class MVolaClient:
    ...

# apps/payments/webhooks.py
class PaymentWebhookView(APIView):
    ...

# apps/payments/tasks.py (Celery)
@shared_task
def process_payment_confirmation(payment_id):
    ...

# apps/payments/tests.py
class TestMobileMoneyPayment(TestCase):
    ...
\`\`\`

### Livrable 3 : Documentation API (Markdown)
- Endpoints : POST /api/payments/initiate/, POST /api/payments/webhook/
- Paramètres, réponses, codes d'erreur
- Guide d'obtention des credentials sandbox Orange Money / MVola

## Critères de validation
- [ ] Code Python syntaxiquement correct et complet (pas de pseudo-code)
- [ ] Tests couvrant : paiement réussi, paiement échoué, webhook malformé
- [ ] Gestion sécurisée des secrets (pas de credentials hardcodés)
- [ ] Prêt à être implémenté par un développeur junior sans questions supplémentaires
`,

  '[IMPL] US-003 — Dashboard Mon Abonnement agriculteur (frontend + API)': `${CTX}

## Mission
Tu es Sally, Senior UX Designer de MIORA. Tu dois produire les **maquettes fonctionnelles + spécifications frontend** du dashboard "Mon Abonnement" pour l'agriculteur.

## Profil utilisateur
- **Persona** : Jean-Pierre, 42 ans, riziculteur à Lac Alaotra
- Smartphone Android basique (RAM 2GB), connexion 3G intermittente
- Faible littératie numérique, parle Malagasy et français basique
- Découvre MIORA via une coopérative locale

## Ce que tu dois produire

### Livrable 1 : Spécifications UX complètes (document Markdown)

**Page "Mon Abonnement" — contenu requis :**
1. Statut abonnement (badge visuel : ACTIF 🟢 / SUSPENDU 🟡 / EXPIRÉ 🔴)
2. Nom du plan (Gratuit / MIORA Pro / MIORA Premium)
3. Date prochaine échéance + montant (ex: "1 500 Ar — 15 Avril 2026")
4. Historique 3 derniers paiements (date, montant, statut, numéro Mobile Money)
5. Bouton "Payer maintenant" (si en retard) → déclenche flux Orange Money
6. Indicateur Trust Score actuel (1-5 étoiles) + lien vers détail

**Règles UX obligatoires :**
- Police minimum 16px (accessibilité)
- Contraste couleurs WCAG AA
- Fonctionnel offline (cache données 24h)
- Bilingue : chaque texte en FR et MG (toggle en haut)
- Pas de menu complexe : max 2 niveaux de navigation

### Livrable 2 : Spécifications API pour le CTO (document Markdown)

\`\`\`
GET /api/v1/subscriptions/me/
Authorization: Bearer {token}

Response 200:
{
  "status": "active" | "suspended" | "expired",
  "plan": "free" | "pro" | "premium",
  "plan_display_fr": "MIORA Pro",
  "plan_display_mg": "MIORA Pro",
  "next_billing_date": "2026-04-15",
  "next_billing_amount_ariary": 1500,
  "trust_score": 3.8,
  "trust_score_stars": 4,
  "payments": [
    {
      "date": "2026-03-15",
      "amount_ariary": 1500,
      "status": "confirmed",
      "mobile_money_ref": "OM2026031500123"
    }
  ]
}
\`\`\`

### Livrable 3 : Composants React (code complet)
Produis le code pour :
- \`SubscriptionStatusBadge.tsx\` — badge statut coloré
- \`SubscriptionDashboard.tsx\` — page principale
- \`PaymentHistoryList.tsx\` — liste paiements
- \`TrustScoreWidget.tsx\` — widget étoiles

**Style :** Tailwind CSS, palette verte (#2D6A4F principal, #52B788 accent)

## Critères de validation
- [ ] Maquettes utilisables par un développeur front sans briefing complémentaire
- [ ] Spécifications API complètes et cohérentes
- [ ] Composants React fonctionnels (pas de pseudo-code)
- [ ] Testé mentalement sur écran 360px de large (mobile Android basique)
`,

  '[IMPL] US-004 — Celery task relance paiement automatique J-3 / J-1': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis le **code Celery complet** pour les relances automatiques de paiement.

## Logique métier
- J-3 avant échéance : message WhatsApp de rappel amical
- J-1 avant échéance : message WhatsApp urgent + SMS fallback
- Si paiement reçu entre les deux : annuler la relance J-1
- Si non payé à J+1 : suspendre le compte (changer statut → "suspended")
- Ne pas envoyer si compte déjà suspendu ou annulé

## Ce que tu dois produire

### Code complet Django/Celery :

\`\`\`python
# apps/subscriptions/tasks.py
# Tous les imports, décorateurs @shared_task, logique complète

# Task 1: check_upcoming_payments()
# → Cron quotidien 8h UTC+3 (Antananarivo)
# → Trouve tous les abonnements avec échéance dans 3 jours
# → Déclenche send_payment_reminder(subscription_id, days_before=3)

# Task 2: send_payment_reminder(subscription_id, days_before)
# → Récupère subscription + profil agriculteur
# → Construit message selon template (FR ou MG selon préférence)
# → Envoie via Brevo WhatsApp API
# → Fallback SMS si WhatsApp échoue
# → Log l'envoi en DB (table ReminderLog)

# Task 3: suspend_unpaid_subscriptions()
# → Cron quotidien 9h UTC+3
# → Finds subscriptions past due > 24h
# → Status → "suspended"
# → Notifie l'agriculteur

# apps/subscriptions/models.py
# class ReminderLog(models.Model) — log de toutes les relances

# apps/subscriptions/tests.py
# Tests unitaires complets avec mocks Brevo
\`\`\`

### Configuration Celery Beat :

\`\`\`python
# celery_config.py — schedule complet avec timezones
CELERY_BEAT_SCHEDULE = {
    'check-upcoming-payments': { ... },
    'suspend-unpaid-subscriptions': { ... },
}
\`\`\`

### Templates de messages (document Markdown) :
- Message J-3 en français
- Message J-3 en Malagasy
- Message J-1 en français
- Message J-1 en Malagasy
- Message de suspension en français + Malagasy

## Critères de validation
- [ ] Aucune relance si paiement déjà reçu
- [ ] Timezone Madagascar (UTC+3) correctement gérée
- [ ] Tests mockés Brevo et Mobile Money
- [ ] Pas de fuite de données téléphone dans les logs
`,

  '[IMPL] US-006 — API métriques abonnement (ARPU, churn, taux activation)': `${CTX}

## Mission
Tu es Quinn, QA Engineer de MIORA. Produis les **spécifications de test + code endpoint** pour le dashboard métriques abonnement.

## Contexte
Le CFO et le CEO ont besoin de suivre la santé du SaaS MIORA en temps réel. Les métriques sont critiques pour les décisions d'investissement et d'expansion régionale.

## Ce que tu dois produire

### Livrable 1 : Spécifications endpoint API (Markdown)

\`\`\`
GET /api/v1/metrics/subscriptions/
Authorization: Bearer {token} (rôle Admin ou CFO uniquement)
Query params: ?period=monthly&region=alaotra&from=2026-01-01&to=2026-03-31

Response 200:
{
  "period": "2026-Q1",
  "summary": {
    "total_active": 847,
    "new_subscribers": 234,
    "churned": 45,
    "churn_rate_percent": 5.3,
    "arpu_ariary": 1847,
    "mrr_ariary": 1564009,
    "activation_rate_7days_percent": 73.2
  },
  "by_region": [...],
  "by_cooperative": [...],
  "trend_monthly": [...]
}
\`\`\`

### Livrable 2 : Code Django complet

\`\`\`python
# apps/metrics/views.py
class SubscriptionMetricsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrCFO]

    def get(self, request):
        # Calcul ARPU, MRR, churn, activation rate
        # Avec cache Redis (TTL 1h)
        ...

# apps/metrics/calculators.py
def calculate_churn_rate(from_date, to_date, region=None): ...
def calculate_arpu(period): ...
def calculate_activation_rate(cohort_date): ...

# apps/metrics/serializers.py
class SubscriptionMetricsSerializer(serializers.Serializer): ...

# apps/metrics/tests.py — Tests complets
class TestSubscriptionMetrics(TestCase):
    def test_churn_rate_calculation(self): ...
    def test_arpu_empty_period(self): ...
    def test_unauthorized_access(self): ...
\`\`\`

### Livrable 3 : Plan de test QA complet (Markdown)
- Scénarios de test manuels (smoke test)
- Cas limites : période sans données, région inconnue, accès non autorisé
- Critères de performance : réponse < 500ms avec 10k abonnés

## Critères de validation
- [ ] Seuls Admin et CFO peuvent accéder (401 pour les autres)
- [ ] Calculs mathématiquement corrects (formules documentées)
- [ ] Cache Redis pour éviter les requêtes DB répétées
`,

  '[IMPL] WhatsApp Onboarding — Séquence 7 messages Brevo + Celery triggers': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis la **séquence complète d'onboarding WhatsApp** pour les nouveaux agriculteurs MIORA.

## Contexte
Quand un agriculteur s'inscrit via la coopérative, il reçoit une séquence de 7 messages sur 7 jours pour l'amener à activer son compte, comprendre le Trust Score, et configurer son paiement Mobile Money.

**Taux d'engagement cible :** 70% d'activation à J+7

## Ce que tu dois produire

### Livrable 1 : Les 7 templates de messages (document Markdown)

Pour chaque message : version française ET malagasy, avec variables personnalisées.

**J+0 (inscription) — Bienvenue :**
\`\`\`
🌱 Bienvenue sur MIORA, {prenom} !
Votre compte coopérative {nom_cooperative} est créé.
👉 Complétez votre profil : {lien_app}
Ny fiarahabana, {prenom}! ... (version MG)
\`\`\`

**J+1 — Tuto Trust Score**
**J+3 — Première utilisation**
**J+5 — Configurer Mobile Money**
**J+7 — Bilan d'activation**
**J+14 — Relance si non activé**
**J+30 — Rapport impact (si actif)**

→ Produis TOUS les textes complets, pas juste des titres.

### Livrable 2 : Architecture Celery (code complet)

\`\`\`python
# apps/onboarding/tasks.py

@shared_task
def start_onboarding_sequence(farmer_id: int):
    """Déclenché à l'inscription. Lance la chaîne de messages."""
    ...

@shared_task
def send_onboarding_message(farmer_id: int, day: int):
    """
    day: 0, 1, 3, 5, 7, 14, 30
    Vérifie si le farmer est déjà activé avant d'envoyer.
    Envoie via Brevo WhatsApp API.
    Fallback SMS si WhatsApp échoue (numéro non WhatsApp).
    Loggue tout en DB.
    """
    ...

# Celery chain/chord pour orchestrer les 7 jours
def build_onboarding_chain(farmer_id):
    return chain(
        send_onboarding_message.s(farmer_id, 0),
        send_onboarding_message.apply_async.s(farmer_id, 1, countdown=86400),
        ...
    )

# apps/onboarding/brevo_client.py
class BrevoWhatsAppClient:
    def send_template(self, phone, template_id, variables): ...
    def send_sms_fallback(self, phone, message): ...
\`\`\`

### Livrable 3 : Configuration Brevo (guide Markdown)
- Comment créer les templates dans Brevo
- Variables à configurer
- Configuration webhook pour tracking ouverture/clic
- Comment tester en sandbox

## Critères de validation
- [ ] 7 messages complets bilingues, prêts à charger dans Brevo
- [ ] Code Celery fonctionnel avec gestion d'erreurs
- [ ] Aucun envoi si agriculteur déjà activé (éviter spam)
`,

  // ═══════════════════════════════════════════════════════════
  // GTM — Production & Pilote
  // ═══════════════════════════════════════════════════════════

  '[INFRA] Déployer serveur production MIORA — VPS + Nginx + SSL + monitoring': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis le **plan de déploiement complet + configuration prête à l'emploi** pour mettre MIORA en production.

## Contraintes
- Budget serveur max : 40€/mois
- Doit être accessible depuis Madagascar (latence < 3s sur 4G)
- Uptime cible : 99.5%
- Rollback possible en < 15 minutes

## Ce que tu dois produire

### Livrable 1 : Comparatif hébergeurs (tableau Markdown)

| Hébergeur | Config | Prix/mois | Localisation | Latence Madagascar | Recommandation |
|-----------|--------|-----------|--------------|-------------------|----------------|
| Hetzner CX32 | 4vCPU/8GB | 11€ | Nuremberg | ~120ms | ... |
| OVH VPS Value | 2vCPU/4GB | 7€ | Paris | ~110ms | ... |
| ... | ... | ... | ... | ... | ... |

→ Recommandation finale avec justification.

### Livrable 2 : docker-compose.yml production complet

\`\`\`yaml
# docker-compose.prod.yml
version: '3.9'
services:
  web:
    image: ghcr.io/madagro/miora-backend:latest
    ...
  celery:
    ...
  celery-beat:
    ...
  redis:
    ...
  db:
    image: postgres:16-alpine
    ...
  nginx:
    ...
  certbot:
    ...
\`\`\`

### Livrable 3 : Script de déploiement initial (bash)

\`\`\`bash
#!/bin/bash
# deploy-initial.sh
# Usage: ./deploy-initial.sh user@vps-ip
# Installe Docker, clone le repo, configure SSL, démarre les services
...
\`\`\`

### Livrable 4 : Configuration monitoring (Markdown)
- Uptime Robot : URLs à surveiller, fréquence, contacts d'alerte
- Sentry DSN : configuration dans Django settings
- Alertes : quand alerter, qui alerter, procédure d'urgence

### Livrable 5 : Checklist pré-lancement (Markdown)
- [ ] SSL Let's Encrypt valide
- [ ] Base de données avec backup automatique
- [ ] Variables d'environnement configurées (liste complète)
- [ ] Test de charge basique (100 requêtes concurrentes)
- [ ] Accès depuis IP malgache vérifié

## Critères de validation
- [ ] docker-compose.yml sans erreurs de syntaxe
- [ ] Script bash exécutable du premier coup sur Ubuntu 22.04
- [ ] Monitoring configuré AVANT le lancement
- [ ] Coût total < 40€/mois justifié
`,

  '[INFRA] CI/CD pipeline production MIORA — GitHub Actions → déploiement auto VPS': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis la **configuration GitHub Actions complète** pour automatiser les déploiements MIORA.

## Flux cible
\`\`\`
git push main → Tests (pytest + lint) → Build Docker image →
Push GHCR → SSH deploy VPS → Smoke test → Notification équipe
\`\`\`

## Ce que tu dois produire

### Livrable 1 : Workflow GitHub Actions complet

\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run pytest
        ...
      - name: Run flake8/black
        ...

  build:
    needs: test
    steps:
      - name: Build and push Docker image
        ...

  deploy:
    needs: build
    steps:
      - name: Deploy via SSH
        ...
      - name: Health check
        ...
      - name: Notify team (WhatsApp/Slack)
        ...
      - name: Rollback on failure
        ...
\`\`\`

### Livrable 2 : Workflow de rollback d'urgence

\`\`\`yaml
# .github/workflows/rollback.yml
# Déclenché manuellement ou sur échec du health check
# Remet la version précédente en production en < 5 minutes
\`\`\`

### Livrable 3 : Dockerfile multi-stage optimisé

\`\`\`dockerfile
# Dockerfile
# Stage 1: deps
FROM python:3.12-slim AS deps
...
# Stage 2: build
FROM deps AS build
...
# Stage 3: production (image minimale)
FROM python:3.12-slim AS production
...
\`\`\`

### Livrable 4 : Variables GitHub Secrets requises (liste Markdown)
\`\`\`
VPS_HOST=
VPS_USER=
VPS_SSH_KEY=
GHCR_TOKEN=
DJANGO_SECRET_KEY=
DATABASE_URL=
REDIS_URL=
ORANGE_MONEY_API_KEY=
BREVO_API_KEY=
SENTRY_DSN=
\`\`\`

## Critères de validation
- [ ] Pipeline s'arrête si les tests échouent
- [ ] Déploiement zéro-downtime (gunicorn --reload ou blue-green)
- [ ] Rollback en 1 clic depuis GitHub Actions
- [ ] Image Docker < 300MB
`,

  '[GTM] Organiser journée démo terrain — 3 coopératives pilotes (Mai 2026)': `${CTX}

## Mission
Tu es Gia, Growth & Marketing de MIORA. Produis le **plan complet de la journée démo terrain** pour valider l'adoption agriculteur avant le déploiement à 100 fermes.

## Objectif de la journée
Faire tester MIORA à 20+ agriculteurs en conditions réelles. Identifier les frictions. Obtenir les premiers engagements de coopératives partenaires.

## Ce que tu dois produire

### Livrable 1 : Sélection des 3 coopératives cibles (document Markdown)

Critères de sélection :
- Taille : 20-50 membres (ni trop petite ni trop grande pour le pilote)
- Région diversifiée : Lac Alaotra, Highlands, Côte Est
- Culture cible : riz, vanille, litchi (3 cultures phares export)
- Leader coopérative réceptif au digital
- Accessibilité logistique

→ Produis un tableau : nom coopérative hypothétique, région, culture, profil chef, statut approche

### Livrable 2 : Déroulé complet de la journée (agenda Markdown)

\`\`\`
08h00 — Arrivée équipe MIORA, installation matériel
08h30 — Réunion chef coopérative : objectifs, questions
09h00 — Session 1 : Présentation MIORA (20 min, slides bilingues)
09h30 — Session 2 : Démo live sur téléphone (inscription + Trust Score)
10h30 — Session 3 : Formation par petits groupes (4-5 agriculteurs)
12h00 — Déjeuner + discussions informelles
13h30 — Session 4 : Cas d'usage Marketplace (acheteur fictif)
15h00 — Formulaire feedback (papier + numérique)
15h30 — Réunion de clôture chef coopérative : signature accord de principe
16h00 — Départ équipe
\`\`\`

### Livrable 3 : Kit terrain complet (documents)

**a) Script de présentation (15-20 min)**
→ Texte complet du pitch MIORA pour agriculteurs, bilingue FR/MG

**b) Formulaire feedback (15 questions max)**
→ Questions sur facilité d'utilisation, utilité perçue, intention de payer
→ Format simple : échelle 1-5 + 3 questions ouvertes

**c) Accord de principe coopérative**
→ Document 1 page : "La coopérative X s'engage à participer au pilote MIORA..."
→ Termes : durée 3 mois, 20 agriculteurs minimum, partage données anonymisées

**d) Checklist logistique terrain**
→ Matériel à apporter, téléphones de démo chargés, fiches papier de backup

### Livrable 4 : Template rapport post-démo (Markdown)
- Résultats quantitatifs (nb testeurs, scores feedback)
- Frictions identifiées par catégorie
- Citations agriculteurs
- Recommandations pour améliorer l'app avant déploiement

## Critères de validation
- [ ] 3 coopératives identifiées avec contacts
- [ ] Déroulé réaliste et faisable en 1 journée
- [ ] Kit terrain utilisable sans briefing supplémentaire
- [ ] Accord de principe prêt à imprimer et signer
`,

  '[GTM] Rédiger contrat pilote coopérative — termes, KPIs, durée, compensation': `${CTX}

## Mission
Tu es Paige, Technical Writer & Legal Drafter de MADAGRO GROUP. Produis un **contrat pilote complet** entre MADAGRO TECH et une coopérative agricole malgache.

## Contexte juridique
- Droit applicable : droit commercial malgache
- Durée : 3 mois renouvelables
- Compensation : accès gratuit MIORA Pro pendant 6 mois post-pilote
- Langue : français (version malagasy à prévoir dans la vraie version finale)

## Ce que tu dois produire

### Contrat complet (document Markdown — à convertir en PDF)

Structure obligatoire :

**ENTRE :**
- MADAGRO TECH SAS, [adresse], représentée par [Fondateur], ci-après "MIORA"
- La Coopérative [Nom], [adresse], représentée par [Président], ci-après "LA COOPÉRATIVE"

**ARTICLE 1 — Objet du contrat**
Description du programme pilote MIORA, objectifs, périmètre.

**ARTICLE 2 — Durée**
Date de début, durée (3 mois), conditions de renouvellement.

**ARTICLE 3 — Obligations de MIORA**
- Accès gratuit MIORA Pro pour X agriculteurs
- Formation initiale (2h) + support technique WhatsApp
- Rapport mensuel sur les données de rendement de la coopérative
- Engagement de confidentialité des données

**ARTICLE 4 — Obligations de la coopérative**
- Inscrire minimum 20 agriculteurs membres
- Désigner un référent MIORA au sein de la coopérative
- Permettre la collecte de données agricoles (liste précise des données)
- Participer à 2 sessions de feedback (J+30 et J+90)

**ARTICLE 5 — KPIs du pilote**
Indicateurs contractuels :
| KPI | Objectif | Méthode de mesure |
|-----|----------|-------------------|
| Nb agriculteurs inscrits | ≥ 20 | Compteur app MIORA |
| Taux activation J+7 | ≥ 60% | Dashboard MIORA |
| Nb transactions Mobile Money | ≥ 5 | Relevé opérateur |
| Score satisfaction (enquête) | ≥ 7/10 | Formulaire post-pilote |

**ARTICLE 6 — Données personnelles et confidentialité**
Traitement conforme RGPD-MG, liste des données collectées, droits des agriculteurs.

**ARTICLE 7 — Propriété intellectuelle**
Les données restent propriété des agriculteurs. MIORA peut utiliser des données anonymisées.

**ARTICLE 8 — Compensation**
Détail de l'accès gratuit Pro 6 mois (valeur : X Ar), conditions d'attribution.

**ARTICLE 9 — Résiliation**
Conditions de résiliation anticipée par chaque partie.

**ARTICLE 10 — Litiges**
Juridiction compétente : Tribunal de Commerce d'Antananarivo.

**Signatures** (avec zones signature, date, cachet)

## Critères de validation
- [ ] Contrat juridiquement cohérent avec le droit malgache
- [ ] Tous les articles complétés (pas de [À COMPLÉTER])
- [ ] KPIs mesurables et réalistes
- [ ] Prêt à envoyer à un avocat malgache pour validation finale
`,

  // ═══════════════════════════════════════════════════════════
  // Marketplace B2B
  // ═══════════════════════════════════════════════════════════

  '[PRD] Spécifications techniques Marketplace B2B — modèles Django, API, flux': `${CTX}

## Mission
Tu es John, Product Manager de MIORA. Produis le **PRD technique complet** de la Marketplace B2B MIORA — le document qui permettra à un développeur de commencer à coder immédiatement.

## Contexte
La Marketplace B2B MIORA connecte :
- **Vendeurs** : coopératives agricoles malgaches (vanille, riz, litchi, poivre)
- **Acheteurs** : importateurs français, réunionnais, mauriciens + grandes surfaces locales
- **Volume cible** : 500 listings actifs, 50 transactions/mois à 6 mois

## Ce que tu dois produire

### Livrable 1 : Modèles de données Django (document Markdown)

\`\`\`python
# Chaque modèle avec TOUS ses champs, types, relations, indexes

class ProductCategory(models.Model):
    # Catégories : Riz, Vanille, Litchi, Poivre, Épices, etc.
    ...

class Listing(models.Model):
    # Annonce de vente d'une coopérative
    # Champs : titre, produit, quantité_kg, prix_unitaire_ariary,
    #          certification (bio/fair-trade/aucune), photos, description,
    #          disponibilité (date récolte), région, coopérative,
    #          statut (active/closed/draft), trust_score_min_requis, ...
    ...

class Offer(models.Model):
    # Offre d'un acheteur sur un listing
    # Champs : montant_proposé, quantité, conditions, statut, message, ...
    ...

class Contract(models.Model):
    # Contrat signé entre vendeur et acheteur
    # Champs : listing, offer, termes, prix_final, date_livraison, ...
    ...

class ShipmentTracking(models.Model):
    # Suivi logistique de la livraison
    ...
\`\`\`

### Livrable 2 : Endpoints API REST complets

Pour chaque endpoint : URL, méthode HTTP, auth requise, corps de requête, réponse 200/400/401/404.

\`\`\`
Listings:
POST   /api/v1/marketplace/listings/         — Créer une annonce
GET    /api/v1/marketplace/listings/         — Lister (filtres: catégorie, région, prix)
GET    /api/v1/marketplace/listings/{id}/    — Détail
PATCH  /api/v1/marketplace/listings/{id}/    — Modifier (vendeur seulement)
DELETE /api/v1/marketplace/listings/{id}/   — Clôturer

Offres:
POST   /api/v1/marketplace/listings/{id}/offers/  — Faire une offre
GET    /api/v1/marketplace/my-offers/             — Mes offres en cours
POST   /api/v1/marketplace/offers/{id}/accept/    — Accepter une offre
POST   /api/v1/marketplace/offers/{id}/reject/    — Refuser

Contrats:
GET    /api/v1/marketplace/contracts/        — Mes contrats
GET    /api/v1/marketplace/contracts/{id}/   — Détail contrat
\`\`\`

### Livrable 3 : Flux utilisateur complets (diagrammes textuels)

**Flux vendeur (coopérative) :**
\`\`\`
Inscription → Vérification Trust Score (min 3.0) →
Créer Listing → Recevoir Offres → Accepter/Refuser →
Signer Contrat → Confirmation livraison → Recevoir paiement
\`\`\`

**Flux acheteur :**
\`\`\`
Inscription + vérification entreprise → Explorer Listings →
Faire une Offre → Négociation → Contrat → Paiement escrow → Réception
\`\`\`

### Livrable 4 : Règles métier critiques
- Trust Score minimum vendeur pour lister : 3.0/5
- Commission MIORA : 2.5% sur chaque transaction confirmée
- Paiement escrow : 50% à la commande, 50% à la livraison
- Litiges : processus de médiation MIORA

### Livrable 5 : Estimation effort (story points)
Tableau par feature avec complexité estimée.

## Critères de validation
- [ ] Modèles sans ambiguïté (types précis, pas de "à définir")
- [ ] Tous les endpoints documentés avec exemples JSON
- [ ] Règles de commission et de paiement précises
- [ ] Un développeur peut commencer à coder sans poser de questions
`,

  '[IMPL] Marketplace MVP — Listings produits agricoles + système offres': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis le **code Django complet** pour le MVP Marketplace MIORA — les deux premières fonctionnalités : créer une annonce et faire une offre.

## Ce que tu dois produire

### Code complet (fichiers séparés)

\`\`\`python
# apps/marketplace/models.py
# ProductCategory, Listing, Offer — modèles complets avec migrations

# apps/marketplace/serializers.py
# ListingSerializer, OfferSerializer — validation complète

# apps/marketplace/views.py
# ListingViewSet (ModelViewSet)
# OfferViewSet
# Filtres : DjangoFilterBackend, SearchFilter, OrderingFilter

# apps/marketplace/filters.py
# ListingFilter : par catégorie, région, prix_min/max, disponibilité

# apps/marketplace/permissions.py
# IsSellerOrReadOnly, IsVerifiedBuyer

# apps/marketplace/urls.py
# router.register() pour les viewsets

# apps/marketplace/signals.py
# Signal: quand offre reçue → notifier vendeur via WhatsApp

# apps/marketplace/tests.py
# Tests: créer listing, soumettre offre, listing sans trust score minimum
\`\`\`

### Livrable 2 : Migration Django
\`\`\`python
# migrations/0001_initial.py — complète et applicable
\`\`\`

### Livrable 3 : Fixtures de test
\`\`\`json
// fixtures/marketplace_test_data.json
// 5 coopératives, 10 listings variés, 3 acheteurs, 5 offres exemples
\`\`\`

### Livrable 4 : Guide d'intégration (Markdown)
- Comment ajouter l'app au projet Django
- Variables d'environnement requises
- Commandes de setup

## Critères de validation
- [ ] Code Python 3.12+ syntaxiquement correct
- [ ] Tous les modèles ont leurs migrations
- [ ] Tests passent avec pytest
- [ ] Filtrage et recherche fonctionnels
`,

  // ═══════════════════════════════════════════════════════════
  // SPARKY IoT
  // ═══════════════════════════════════════════════════════════

  '[IMPL] Endpoint POST /api/iot/telemetry/ — validation payload + persistence + alertes': `${CTX}

## Mission
Tu es Sparky, IoT Strategy Lead de MADAGRO GROUP. Produis les **spécifications hardware + code backend** pour la réception des données capteurs terrain.

## Contexte hardware Sparky
Chaque capteur Sparky envoie toutes les 6 heures :
\`\`\`json
{
  "device_id": "SPARKY-MG-00147",
  "farmer_id": 2891,
  "timestamp_utc": "2026-03-25T14:30:00Z",
  "location": { "lat": -19.523, "lon": 47.112, "alt_m": 1245 },
  "sensors": {
    "soil_moisture_percent": 65.4,
    "soil_temp_celsius": 22.1,
    "air_temp_celsius": 28.3,
    "humidity_percent": 78.0,
    "rainfall_mm_24h": 12.5,
    "ndvi_proxy": 0.72
  },
  "battery_percent": 87,
  "signal_strength_rssi": -82,
  "firmware_version": "1.2.3"
}
\`\`\`

## Ce que tu dois produire

### Livrable 1 : Spécifications PCB Sparky v1 (document Markdown)

\`\`\`
Composants :
- MCU : ESP32-S3 (WiFi + BLE)
- Radio : SX1276 LoRa (868MHz pour portée 5km en zone rurale)
- Capteurs : SHT31 (temp+humidité), Capacitive soil moisture v2.0,
             EC-5 (humidité sol volumétrique), Pluviomètre basculeur
- GPS : NEO-6M pour géolocalisation (validation parcelle)
- Batterie : LiPo 3000mAh + panneau solaire 1W
- IP Rating : IP67 (résistant aux intempéries)

Dimensions : 120x80x60mm
Coût unitaire cible : 35-45 USD en production 500 unités
\`\`\`

### Livrable 2 : Endpoint Django complet

\`\`\`python
# apps/iot/models.py
class SparkyDevice(models.Model):
    device_id = ...  # unique, authentification
    farmer = models.ForeignKey(Farmer, ...)
    location = ...   # PointField (GeoDjango)
    is_active = ...
    last_seen = ...

class TelemetryReading(models.Model):
    device = models.ForeignKey(SparkyDevice, ...)
    timestamp = ...
    soil_moisture_percent = ...
    soil_temp_celsius = ...
    air_temp_celsius = ...
    humidity_percent = ...
    rainfall_mm_24h = ...
    ndvi_proxy = ...
    battery_percent = ...
    raw_payload = ...  # JSONField backup

class TelemetryAlert(models.Model):
    # Alertes générées automatiquement
    reading = ...
    alert_type = ...  # drought_risk, frost_risk, device_low_battery
    severity = ...    # info, warning, critical
    is_resolved = ...

# apps/iot/views.py
class TelemetryIngestView(APIView):
    """
    POST /api/v1/iot/telemetry/
    Auth: API Key device (header X-Device-Key)
    Rate limit: 1 req/5min par device
    Valide payload, persiste, déclenche alertes si seuils dépassés
    """
    authentication_classes = [DeviceApiKeyAuthentication]

    def post(self, request):
        ...

# apps/iot/alerts.py
ALERT_THRESHOLDS = {
    'drought_risk': {'soil_moisture_percent': {'lt': 30}},
    'frost_risk': {'air_temp_celsius': {'lt': 5}},
    'low_battery': {'battery_percent': {'lt': 20}},
    'excessive_rain': {'rainfall_mm_24h': {'gt': 80}},
}

def check_and_create_alerts(reading): ...

# apps/iot/authentication.py
class DeviceApiKeyAuthentication(BaseAuthentication):
    """Auth par header X-Device-Key pour les devices IoT"""
    ...

# apps/iot/tests.py
# Tests: payload valide, device inconnu, seuil alerte, rate limiting
\`\`\`

### Livrable 3 : Firmware ESP32 (pseudocode structuré)
\`\`\`c
// sparky_firmware.ino
// Structure du programme principal
// Cycle : réveil → lecture capteurs → GPS → envoi MQTT/HTTP → veille 6h
// Gestion batterie faible (mode ultra-économie si < 15%)
\`\`\`

## Critères de validation
- [ ] Authentification device par clé unique (pas de JWT classique)
- [ ] Alertes créées automatiquement pour seuils critiques
- [ ] Rate limiting pour éviter flood si bug firmware
- [ ] Données persistées même si analyse Trust Score échoue
`,

  '[IMPL] Pipeline données capteurs → Trust Score update automatique': `${CTX}

## Mission
Tu es Sparky, IoT Strategy Lead. Produis le **pipeline Celery** qui connecte les données capteurs terrain au moteur de Trust Score.

## Algorithme Trust Score MIORA (existant, à utiliser)
Le Trust Score (1-5) mesure la fiabilité d'un agriculteur basé sur :
1. **Cohérence des données** (40%) : données capteurs correspondent aux déclarations de récolte
2. **Historique paiements** (30%) : ponctualité paiements abonnement MIORA
3. **Régularité** (20%) : continuité d'utilisation, pas d'interruptions longues
4. **Qualité production** (10%) : feedback acheteurs marketplace

## Ce que tu dois produire

### Livrable 1 : Pipeline Celery complet

\`\`\`python
# apps/trust_score/tasks.py

@shared_task
def update_trust_score_from_telemetry(reading_id: int):
    """
    Déclenché après chaque nouvelle lecture télémétrie.
    1. Récupère la lecture et le farmer
    2. Calcule le signal IoT (cohérence données vs déclarations)
    3. Met à jour la composante IoT du Trust Score
    4. Recalcule le Trust Score global
    5. Notifie si score change de ±0.5
    """
    ...

@shared_task
def recalculate_trust_score_full(farmer_id: int):
    """
    Recalcul complet (toutes les composantes).
    Déclenché : mensuel, ou après événement majeur (paiement reçu/raté).
    """
    ...

# apps/trust_score/calculators.py

class IoTSignalCalculator:
    """
    Calcule la cohérence entre données capteurs et déclarations agriculteur.

    Exemple : si le capteur indique 0mm de pluie les 30 derniers jours
    mais l'agriculteur déclare une récolte de riz normale → incohérence détectée.
    """

    def calculate(self, farmer_id: int, period_days: int = 30) -> float:
        """Retourne score 0.0-1.0"""
        ...

    def _check_crop_moisture_consistency(self, readings, crop_declarations): ...
    def _check_harvest_timing_plausibility(self, readings, harvest_logs): ...
    def _detect_sensor_manipulation(self, readings): ...

class TrustScoreAggregator:
    WEIGHTS = {
        'iot_consistency': 0.40,
        'payment_history': 0.30,
        'regularity': 0.20,
        'buyer_feedback': 0.10,
    }

    def aggregate(self, farmer_id: int) -> float:
        """Retourne score 1.0-5.0"""
        ...

# apps/trust_score/signals.py
# Signal: quand score change → créer ActivityLog + notifier coopérative
\`\`\`

### Livrable 2 : Dashboard de monitoring capteurs (specs Markdown)
- Vue coopérative : carte des capteurs actifs, alertes, tendances
- Indicateurs : pourcentage devices actifs, dernière sync, anomalies détectées

## Critères de validation
- [ ] Trust Score se met à jour dans les 60s après données capteur
- [ ] Détection des tentatives de manipulation (données trop parfaites)
- [ ] Calcul idempotent (appeler 2 fois donne le même résultat)
`,

  // ═══════════════════════════════════════════════════════════
  // ERP MADAGRO
  // ═══════════════════════════════════════════════════════════

  '[IMPL] Module Inventaire ERP — modèles Django + API REST + interface web': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis le **code Django complet** du module Inventaire pour l'ERP MADAGRO.

## Contexte
MADAGRO gère des stocks agricoles complexes :
- Semences (achat fournisseur → distribution agriculteurs)
- Récoltes (collecte agriculteurs → stockage → transformation → vente)
- Produits transformés (farine de riz, huile d'arachide, vanille conditionnée)
- Intrants agricoles (engrais, produits phytosanitaires)

Chaque mouvement de stock doit être traçable pour les audits d'exportation et la conformité SYSCOHADA.

## Ce que tu dois produire

### Code Django complet :

\`\`\`python
# apps/inventory/models.py

class WarehouseLocation(models.Model):
    """Entrepôts et zones de stockage"""
    name = ...  # ex: "Entrepôt Lac Alaotra", "Silo Central Tana"
    location_type = ...  # warehouse, farm_storage, processing_unit
    gps_lat, gps_lon = ...
    capacity_kg = ...

class Product(models.Model):
    """Catalogue produits"""
    name = ...
    category = ...  # seed, harvest, processed, input
    unit = ...       # kg, litre, sac_50kg, tonne
    hs_code = ...    # Code douanier pour export
    shelf_life_days = ...

class StockLevel(models.Model):
    """Stock actuel par produit et entrepôt"""
    product = ForeignKey(Product)
    warehouse = ForeignKey(WarehouseLocation)
    quantity_available = ...
    quantity_reserved = ...  # réservé pour contrats marketplace
    last_updated = ...

    class Meta:
        unique_together = [['product', 'warehouse']]

    @property
    def quantity_total(self): ...

class StockMovement(models.Model):
    """Chaque mouvement = une ligne de traçabilité"""
    movement_type = ...  # purchase, sale, transfer, adjustment, loss
    product = ForeignKey(Product)
    from_warehouse = ForeignKey(WarehouseLocation, null=True)
    to_warehouse = ForeignKey(WarehouseLocation, null=True)
    quantity_kg = ...
    unit_cost_ariary = ...
    reference_doc = ...  # numéro facture, bon de livraison
    notes = ...
    created_by = ForeignKey(User)
    created_at = ...

class StockAlert(models.Model):
    """Alertes automatiques de stock"""
    product = ForeignKey(Product)
    warehouse = ForeignKey(WarehouseLocation)
    alert_type = ...  # low_stock, overstock, expiry_warning
    threshold_quantity = ...
    current_quantity = ...
    is_resolved = ...

# apps/inventory/views.py — ViewSets complets
# apps/inventory/serializers.py — Serializers avec validation
# apps/inventory/filters.py — Filtres avancés
# apps/inventory/signals.py — Alertes automatiques
# apps/inventory/reports.py — Export CSV/Excel
# apps/inventory/tests.py — Tests complets
\`\`\`

### Livrable 2 : Rapport d'inventaire exportable

\`\`\`python
# apps/inventory/exports.py
class InventoryExporter:
    def export_csv(self, warehouse_id=None, as_of_date=None): ...
    def export_excel_with_charts(self): ...
    def generate_stock_valuation_report(self): ...  # Valeur stock en Ar
\`\`\`

## Critères de validation
- [ ] Chaque mouvement est traçable (qui, quoi, quand, pourquoi)
- [ ] Alertes créées automatiquement quand stock < seuil
- [ ] Stock jamais négatif (validation dans le modèle)
- [ ] Export CSV et Excel fonctionnel
`,

  '[IMPL] Export PDF rapport financier mensuel — Weasyprint + template Board': `${CTX}

## Mission
Tu es Comptable de MADAGRO GROUP. Produis le **code Python complet + template HTML** pour la génération automatique du rapport financier mensuel au format PDF.

## Contenu du rapport mensuel Board

Le rapport est destiné au CEO, CFO et au Board. Format A4, 8-10 pages.

Pages requises :
1. **Couverture** : Logo MADAGRO, titre, mois, date de génération
2. **Résumé exécutif** : 5 indicateurs clés en grands chiffres (format carte)
3. **P&L du mois** : Revenus, Coûts, Résultat net — vs mois précédent et budget
4. **Flux de trésorerie** : Entrées, Sorties, Solde — par filiale
5. **Tableau de bord KPIs** : 12 KPIs visuels avec tendances
6. **Stock MADAGRO SUPPLY** : Valeur stock, rotations, alertes
7. **Performance MIORA SaaS** : ARR, MRR, churn, nouveaux abonnés
8. **Actions requises Board** : 3-5 points d'action du mois suivant

## Ce que tu dois produire

### Livrable 1 : Template HTML pour WeasyPrint

\`\`\`html
<!-- templates/reports/monthly_board_report.html -->
<!-- Utilise WeasyPrint pour PDF -->
<!-- Style professionnel : couleurs MADAGRO (#2D6A4F, #52B788) -->
<!-- Tableaux, graphiques en SVG ou ChartJS via base64 -->
<!-- En-tête/pied de page sur chaque page avec numéro -->
\`\`\`

Inclus le CSS complet pour :
- Tables financières (bordures, alternance lignes)
- Badges statut (vert/rouge/orange)
- Graphiques en bâtons SVG simples
- Page de couverture premium

### Livrable 2 : Code Python de génération

\`\`\`python
# apps/reports/generators/monthly_board.py

class MonthlyBoardReportGenerator:
    def __init__(self, year: int, month: int):
        self.year = year
        self.month = month

    def collect_data(self) -> dict:
        """Collecte toutes les données depuis la DB"""
        return {
            'pl_statement': self._get_pl_data(),
            'cash_flow': self._get_cash_flow(),
            'kpis': self._get_kpis(),
            'stock_summary': self._get_stock_summary(),
            'miora_metrics': self._get_saas_metrics(),
            'action_items': self._get_board_actions(),
        }

    def generate_pdf(self, output_path: str = None) -> bytes:
        """Génère le PDF et retourne les bytes"""
        data = self.collect_data()
        html = render_to_string('reports/monthly_board_report.html', data)
        return HTML(string=html).write_pdf()

    def _get_pl_data(self): ...
    def _get_cash_flow(self): ...
    def _get_kpis(self): ...

# apps/reports/tasks.py
@shared_task
def generate_and_send_monthly_report(year: int, month: int):
    """Déclenché le 1er de chaque mois à 7h UTC+3"""
    pdf_bytes = MonthlyBoardReportGenerator(year, month).generate_pdf()
    # Envoyer par email au CEO, CFO, Fondateur
    send_report_email(pdf_bytes, recipients=['ceo@madagro.mg', 'cfo@madagro.mg'])
    # Sauvegarder dans le stockage MADAGRO
    save_to_storage(pdf_bytes, f"reports/board/{year}-{month:02d}-board-report.pdf")

# apps/reports/views.py
class MonthlyReportDownloadView(APIView):
    """GET /api/v1/reports/monthly/?year=2026&month=3"""
    permission_classes = [IsAuthenticated, IsCFOorCEO]

    def get(self, request):
        ...
\`\`\`

### Livrable 3 : Exemple de données de test
\`\`\`python
# fixtures/board_report_test_data.py
# Données financières fictives mais réalistes pour tester le rendu
\`\`\`

## Critères de validation
- [ ] PDF généré en < 30 secondes
- [ ] Toutes les 8 pages présentes
- [ ] Chiffres cohérents entre les sections
- [ ] Envoi email automatique fonctionnel
`,

  // ═══════════════════════════════════════════════════════════
  // AGRO SUPPLY
  // ═══════════════════════════════════════════════════════════

  '[COO] Cartographier et qualifier 10 fournisseurs prioritaires (semences, engrais)': `${CTX}

## Mission
Tu es COO de MADAGRO GROUP. Produis un **référentiel fournisseurs complet** pour sécuriser les approvisionnements de MADAGRO SUPPLY.

## Besoins d'approvisionnement MADAGRO

Volumes estimés Saison 2026 :
- Semences riz certifiées : 50 tonnes
- Semences maïs hybride : 15 tonnes
- Engrais NPK 17-17-17 : 200 tonnes
- Urée 46% : 150 tonnes
- Produits phytosanitaires (fongicides, herbicides) : 20 000 litres
- Sachets et emballages post-récolte : 500 000 unités

## Ce que tu dois produire

### Livrable 1 : Tableau de qualification fournisseurs (document Markdown)

Pour chaque fournisseur (10 minimum), créer une fiche avec :

| Critère | Détail |
|---------|--------|
| Nom | ... |
| Localisation | Antananarivo / Tamatave / International |
| Produits | Liste précise |
| Capacité annuelle | En tonnes/litres |
| Certifications | Phytosanitaire, ISO, Bio |
| Prix indicatif | Ar/kg ou Ar/litre |
| Délai livraison | Jours depuis commande |
| Conditions paiement | 30j, 60j, comptant |
| Références | Clients actuels connus |
| Risques | Dépendance, saisonnalité |
| Score (1-10) | Note globale |

**Sources à utiliser pour identifier les fournisseurs :**
- FIFABE (Fédération des Intrants et Fertilisants Agricoles de Madagascar)
- COFEMAD (Coopérative des Fabricants de Matières Fertilisantes)
- Importateurs agrément DPV (Direction de la Protection des Végétaux)
- Réseau FOFIFA (recherche agronomique malgache)
- Chambres de Commerce Antananarivo et Tamatave

→ Produis des fiches réalistes avec des noms d'acteurs plausibles du marché malgache.

### Livrable 2 : Matrice de risque fournisseurs (tableau)

| Fournisseur | Risque rupture | Risque qualité | Risque prix | Stratégie |
|-------------|----------------|----------------|-------------|-----------|
| ... | Faible/Moyen/Élevé | ... | ... | Titulaire/Backup/Spot |

### Livrable 3 : Recommandations Top 3 fournisseurs stratégiques

Pour chaque produit prioritaire (semences riz, engrais NPK, phytosanitaires) :
- Fournisseur titulaire recommandé (60% des volumes)
- Fournisseur backup (30%)
- Stratégie spot achat (10% pour flexibilité)

### Livrable 4 : Plan d'action 90 jours (Markdown)

\`\`\`
Semaine 1-2 : Prise de contact et demande de devis (10 fournisseurs)
Semaine 3-4 : Visite ou appel de qualification (5 finalistes)
Mois 2 : Audit qualité sur 3 fournisseurs sélectionnés
Mois 3 : Signature contrats-cadres saison 2026
\`\`\`

## Critères de validation
- [ ] 10 fiches fournisseurs complètes et réalistes
- [ ] Matrix risque documentée
- [ ] Plan d'action avec responsables et délais
- [ ] Recommandation finale claire et justifiée
`,

  '[COO] Contrat-type fournisseur MADAGRO SUPPLY — prix, délais, pénalités, qualité': `${CTX}

## Mission
Tu es Paige, Technical Writer & Legal Drafter de MADAGRO. Produis un **contrat-type fournisseur complet** que le COO pourra utiliser avec les 10 fournisseurs qualifiés.

## Ce que tu dois produire

### Contrat-cadre d'approvisionnement complet (document Markdown)

**CONTRAT-CADRE D'APPROVISIONNEMENT EN INTRANTS AGRICOLES**
**Entre MADAGRO SUPPLY et [NOM FOURNISSEUR]**

Structure complète avec tous les articles :

**ARTICLE 1 — Objet et périmètre**
Nature des produits, volumes indicatifs annuels, territoires.

**ARTICLE 2 — Durée et renouvellement**
Durée : 1 an renouvelable tacitement, préavis résiliation 60 jours.

**ARTICLE 3 — Prix et révision tarifaire**
- Prix ferme sur 3 mois
- Clause de révision trimestrielle basée sur indice matières premières
- Formule de révision : P(t) = P(0) × (0.6 × I(t)/I(0) + 0.4)
- Notification préalable 30 jours avant toute hausse > 5%

**ARTICLE 4 — Commandes et livraison**
- Bon de commande signé + délai confirmation 48h
- Délai livraison standard : 7-15 jours selon produit
- Livraison franco entrepôt MADAGRO (localisation précise)
- Bon de livraison signé par les deux parties

**ARTICLE 5 — Contrôle qualité à réception**
- Analyse systématique : taux germination semences (≥95%), teneur NPK engrais (±2%)
- Procédure d'échantillonnage (norme ISTA pour semences)
- Délai de contestation : 48h après réception
- Procédure de remplacement ou avoir en cas de non-conformité

**ARTICLE 6 — Pénalités et bonus**
| Situation | Pénalité/Bonus |
|-----------|----------------|
| Retard livraison > 3 jours | 0.5% valeur commande/jour |
| Retard > 10 jours | Résiliation commande + 5% indemnité |
| Non-conformité qualité | Remplacement frais fournisseur + 2% |
| Livraison en avance (si acceptée) | -1% sur facture |
| Volume annuel > 110% prévu | Remise 3% sur tranche |

**ARTICLE 7 — Conditions de paiement**
- Paiement 30 jours fin de mois après réception et validation qualité
- Escompte 2% pour paiement comptant sous 8 jours
- Pénalités de retard : taux BCE + 10 points

**ARTICLE 8 — Propriété et transfert de risque**
Transfert propriété et risque à la livraison signée.

**ARTICLE 9 — Confidentialité et exclusivité**
Pas de clause d'exclusivité (MADAGRO conserve liberté d'approvisionnement multiple).

**ARTICLE 10 — Force majeure**
Cyclones, crises politiques malgaches, embargos internationaux — procédure de notification 48h.

**ARTICLE 11 — Résiliation**
Résiliation pour faute grave (3 non-conformités/an), préavis 30 jours sinon.

**ARTICLE 12 — Règlement des litiges**
Médiation CCIFM (Chambre de Commerce et d'Industrie Franco-Malgache) en premier recours.
Tribunal de Commerce Antananarivo en dernier recours.

**Annexes :**
- A : Catalogue produits et spécifications techniques
- B : Grille tarifaire en vigueur
- C : Fiche de non-conformité type

## Critères de validation
- [ ] Tous les articles complets (aucun [À REMPLIR])
- [ ] Pénalités précises et applicables
- [ ] Cohérent avec le droit commercial malgache
- [ ] Prêt à envoyer à un avocat pour validation finale avant signature
`,

  '[CMO] Modèle de distribution domestique Phase 1 — circuits courts + marchés locaux': `${CTX}

## Mission
Tu es CMO de MADAGRO GROUP. Produis le **plan de distribution domestique complet** pour les produits MADAGRO RETAIL & FOOD sur le marché malgache.

## Gamme produits Phase 1
- Riz blanc premium (sacs 5kg, 25kg) — Origine Lac Alaotra certifié MADAGRO
- Farine de manioc (paquets 1kg) — Transformation MADAGRO FOOD
- Huile de girofle et épices conditionnées (bocaux) — Gamme premium
- Légumes secs (haricots, maïs) — Coopératives partenaires

## Ce que tu dois produire

### Livrable 1 : Analyse canaux de distribution (document Markdown)

**Canal 1 — Marchés locaux (tantsaha bazary)**
- 20+ marchés hebdomadaires identifiés dans les zones de production
- Modèle : camion MADAGRO + stand permanent + revendeur local formé
- Avantages : prix plus élevé direct producteur, confiance locale
- Volume estimé Phase 1 : 40 tonnes/mois

**Canal 2 — Supermarchés et épiceries urbaines**
Liste des partenaires cibles à Antananarivo :
- Score, Leader Price (franchises locales), Jumbo Score
- Épiceries de quartier premium (Analakely, Isoraka)
- Conditions négociation : référencement, délai paiement 30j, tête de gondole

**Canal 3 — Hôtels et restaurants**
- Hôtels 3★+ à Antananarivo (30 cibles identifiées)
- Resorts côtiers (Nosy Be, Île Sainte-Marie) — produits premium
- Modèle : livraison hebdomadaire, contrat annuel, prix fixing

**Canal 4 — Vente en ligne / Click & Collect**
- Page Facebook/WhatsApp Business MADAGRO RETAIL
- Commandes groupées livraison vendredi
- Partenariat Moov Money/Orange Money pour paiement

### Livrable 2 : Modèle financier simplifié (tableaux Markdown)

| Canal | Volume cible T1 | Prix vente moyen | Marge brute % | CA mensuel estimé |
|-------|----------------|------------------|---------------|-------------------|
| Marchés locaux | 40t | ... | 35% | ... |
| Supermarchés | 20t | ... | 20% | ... |
| Hôtels/Restau | 5t | ... | 45% | ... |
| En ligne | 2t | ... | 40% | ... |

### Livrable 3 : Plan d'action 6 mois (Markdown)

\`\`\`
Mois 1 : Référencement 3 supermarchés + 5 marchés locaux
Mois 2 : Lancement gamme riz premium + campagne WhatsApp
Mois 3 : Audit rotation stock + ajustement pricing
Mois 4 : Ouverture canal hôtellerie (démarchage 10 hôtels)
Mois 5 : Lancement Click & Collect en ligne
Mois 6 : Bilan Phase 1 + décision Phase 2 (extension régionale)
\`\`\`

### Livrable 4 : Kit commercial (documents)
- Fiche produit riz premium MADAGRO (1 page, FR)
- Grille tarifaire B2B (confidentielle)
- Bon de commande type revendeur

## Critères de validation
- [ ] Modèle financier cohérent avec les capacités de production
- [ ] 3 canaux avec actions concrètes (pas juste des idées)
- [ ] Plan d'action avec jalons mesurables
`,

  // ═══════════════════════════════════════════════════════════
  // HOLDING — Actions concrètes
  // ═══════════════════════════════════════════════════════════

  '[HOLDING] Immatriculer MADAGRO HOLDING SASU — statuts + dépôt capital + INPI': `${CTX}

## Mission
Tu es Fiscaliste de MADAGRO GROUP. Produis le **dossier d'immatriculation complet** de MADAGRO HOLDING SASU en France.

## Contexte
Le fondateur est en transition professionnelle (fin de contrat salarié imminente) et doit créer la structure holding AVANT de bénéficier du régime mère-fille sur les dividendes remontés de MADAGRO GROUP Madagascar.

## Ce que tu dois produire

### Livrable 1 : Statuts SASU complets (document Markdown — format juridique)

\`\`\`
STATUTS DE LA SOCIÉTÉ
MADAGRO HOLDING
Société par Actions Simplifiée Unipersonnelle
Capital social : 1 000 euros

Entre les soussignés :
[Nom Fondateur], né(e) le [...], demeurant au [...],
détenant 100% des actions.

ARTICLE 1 — FORME
La société est une Société par Actions Simplifiée Unipersonnelle (SASU)...

ARTICLE 2 — OBJET SOCIAL
La société a pour objet :
- La prise, la gestion et la cession de participations dans toute société,
  notamment dans MADAGRO GROUP SAS et ses filiales à Madagascar
- L'animation active du groupe MADAGRO par la fourniture de services
  de direction stratégique, financière et administrative
- Toutes opérations financières, mobilières ou immobilières...
[COMPLET — tous les articles jusqu'à l'article 30 minimum]

ARTICLE 3 — DÉNOMINATION SOCIALE
MADAGRO HOLDING

ARTICLE 4 — SIÈGE SOCIAL
[Adresse complète]

ARTICLE 5 — DURÉE
99 ans à compter de l'immatriculation

ARTICLE 6 — CAPITAL SOCIAL
Capital : 1 000 euros divisé en 1 000 actions de 1 euro de valeur nominale

[... tous les articles sur : pouvoirs du président, assemblées générales,
comptes annuels, dissolution, ...]
\`\`\`

### Livrable 2 : Checklist dossier INPI (document Markdown)

Étapes dans l'ordre chronologique :

\`\`\`
SEMAINE 1 — Préparation
□ Rédiger et faire signer les statuts (modèle ci-dessus)
□ Rédiger la déclaration de bénéficiaires effectifs
□ Préparer l'attestation de domiciliation (justificatif < 3 mois)
□ Préparer copie CNI fondateur

SEMAINE 2 — Dépôt capital
□ Ouvrir compte séquestre : Qonto Business (en ligne, 48h) ou Notaire
□ Virer 1 000€ minimum sur le compte séquestre
□ Obtenir l'attestation de dépôt de capital (émise par la banque)

SEMAINE 2-3 — Immatriculation INPI
□ Aller sur guichet-entreprises.fr (portail unique INPI)
□ Créer dossier : SASU, activité holding animatrice (NAF 6420Z)
□ Uploader : statuts signés, pièce identité, justificatif domiciliation,
              attestation dépôt capital
□ Payer les frais : ~75€ (greffe) + ~150€ (annonce légale automatique)
□ Délai obtention KBIS : 3-5 jours ouvrés

SEMAINE 4
□ Recevoir le KBIS (email ou portail INPI)
□ Transmettre KBIS à la banque pour libérer le capital
□ Ouvrir compte bancaire pro définitif (Qonto, Shine, ou banque)
□ Enregistrer les bénéficiaires effectifs sur Infogreffe
□ Mettre à jour le registre des assemblées
\`\`\`

### Livrable 3 : Déclaration de bénéficiaires effectifs (template Markdown)
Document requis légalement (LCB-FT) — déclarant le(s) bénéficiaire(s) réel(s) au registre national.

### Livrable 4 : Note fiscale sur le régime mère-fille (Markdown)
- Conditions : ≥5% des titres + détention ≥2 ans
- Avantage : dividendes reçus exonérés IS à 95%
- Application dans le cas MADAGRO : schéma avec chiffres
- Timeline : quand les premiers dividendes peuvent être remontés

## Critères de validation
- [ ] Statuts complets (tous les articles, aucun blanc)
- [ ] Checklist actionnable dès demain
- [ ] Code NAF correct pour holding animatrice (6420Z)
- [ ] Régime mère-fille expliqué avec des chiffres concrets
`,

  '[HOLDING] Ouvrir compte bancaire professionnel HOLDING — Qonto ou BNP Pro': `${CTX}

## Mission
Tu es CFO de MADAGRO GROUP. Produis le **dossier de comparaison banques + guide d'ouverture** du compte professionnel pour MADAGRO HOLDING SASU.

## Ce que tu dois produire

### Livrable 1 : Comparatif détaillé des banques (tableau Markdown)

| Critère | Qonto | Shine | BNP Paribas Pro | Société Générale Pro | Crédit Professionnel |
|---------|-------|-------|-----------------|----------------------|----------------------|
| Frais mensuels | 9€ | 7.90€ | 24€ | 22€ | 18€ |
| Ouverture en ligne | Oui (48h) | Oui (48h) | Non (RDV) | Non (RDV) | Non |
| IBAN FR | Oui | Oui | Oui | Oui | Oui |
| Virements SEPA | Inclus | Inclus | 0.35€/virt | 0.40€/virt | Inclus |
| Carte Visa Pro | Oui | Oui | Oui | Oui | Oui |
| API bancaire | Oui (sandbox) | Oui | Bridge (payant) | Non natif | Non |
| Support holding | Limité | Limité | Complet | Complet | Complet |
| Cash pooling possible | Non | Non | Oui | Oui | Oui |
| Crédibilité partenaires | Moyen | Moyen | Haute | Haute | Haute |
| **Recommandation** | ✅ Phase 1 | Alt. | Phase 2 | Phase 2 | - |

**Recommandation principale :** Qonto pour le démarrage (rapidité, coût, API)
**Recommandation Phase 2 :** BNP Pro quand cash pooling nécessaire

### Livrable 2 : Guide d'ouverture Qonto (étapes détaillées)

\`\`\`
JOUR 1 — Inscription
1. Aller sur qonto.com → "Ouvrir un compte"
2. Sélectionner : Société (SASU) → Holding/Investissement
3. Documents à uploader :
   - KBIS (obligatoire — obtenu à l'étape précédente)
   - Statuts signés
   - CNI fondateur recto/verso
   - Justificatif domiciliation siège
4. Durée validation : 24-48h ouvrées

JOUR 2-3 — Validation Qonto
5. Appel vidéo de vérification identité (15 min)
6. Signature contrat en ligne
7. IBAN FR reçu par email

JOUR 4
8. Commander carte Visa Pro (standard ou Premium selon besoin)
9. Activer les notifications Slack/email
10. Configurer les utilisateurs (si collaborateurs)

JOUR 5-7 — Configuration ERP
11. Intégration API Qonto avec ERP MADAGRO (OAuth2)
12. Paramétrer catégories de dépenses (plan comptable)
13. Inviter comptable en accès lecture seule
\`\`\`

### Livrable 3 : Configuration API bancaire pour l'ERP (specs techniques)

\`\`\`python
# Intégration Qonto API v2 dans Django ERP

# Endpoints utiles :
# GET /v2/transactions — Récupérer les transactions
# GET /v2/bank_accounts — Solde et IBAN
# POST /v2/transfers — Initier un virement (si autorisé)

# apps/banking/qonto_client.py
class QontoAPIClient:
    BASE_URL = "https://thirdparty.qonto.com/v2"

    def get_transactions(self, from_date, to_date, iban=None): ...
    def get_balance(self): ...
    def sync_to_accounting(self, transactions): ...

# Celery task : sync automatique quotidienne
@shared_task
def sync_bank_transactions():
    """Récupère les transactions du jour et les catégorise automatiquement"""
    ...
\`\`\`

### Livrable 4 : Procédure de contrôle financier holding (Markdown)
- Signatures requises selon montant (< 1000€ : CFO seul, > 5000€ : CFO + Fondateur)
- Réconciliation bancaire mensuelle (checklist)
- Reporting mensuel vers Fiscaliste

## Critères de validation
- [ ] Comparatif factuel avec vrais tarifs actuels
- [ ] Guide d'ouverture Qonto actionnable étape par étape
- [ ] API Django fonctionnelle pour sync transactions
- [ ] Procédure contrôle interne claire
`,

  '[HOLDING] Convention de trésorerie Holding → Filiales (cash pooling)': `${CTX}

## Mission
Tu es CFO et Fiscaliste de MADAGRO GROUP. Produis la **convention de trésorerie complète** entre MADAGRO HOLDING SASU (France) et MADAGRO GROUP (Madagascar).

## Contexte juridique et fiscal
La convention de trésorerie permet à la holding de prêter des fonds aux filiales (et vice versa) à un taux d'intérêt conforme au marché. Sans ce document, les flux entre entités peuvent être requalifiés en distributions irrégulières.

**Taux de référence 2026 (à vérifier) :**
- Taux BCE : 4.25% (approximatif)
- Marge de marché : +1.5% à +3.5% selon profil emprunteur
- Taux applicable intragroupe : 5.75% à 7.75%

## Ce que tu dois produire

### Livrable 1 : Convention de trésorerie complète (document Markdown)

\`\`\`
CONVENTION DE TRÉSORERIE INTRAGROUPE

Entre :
MADAGRO HOLDING SASU
[Adresse France], SIREN : [À compléter]
Représentée par [Fondateur], Président
Ci-après "LA HOLDING"

Et :
MADAGRO GROUP SAS
[Adresse Madagascar], NIF : [À compléter]
Représentée par [CEO], Directeur Général
Ci-après "LA FILIALE"

PRÉAMBULE
La HOLDING détient X% du capital de LA FILIALE.
Les parties souhaitent optimiser la gestion de leur trésorerie commune.

ARTICLE 1 — OBJET
Mise en place d'une ligne de crédit revolving entre la HOLDING et LA FILIALE.

ARTICLE 2 — PLAFOND
Montant maximum : 50 000 EUR (ou équivalent en Ariary au cours BCE J-1)

ARTICLE 3 — TAUX D'INTÉRÊT
Taux annuel : Euribor 3 mois + 2.5%
Révision : trimestrielle
Calcul : intérêts sur capital utilisé uniquement (pas sur le plafond)

ARTICLE 4 — DURÉE ET REMBOURSEMENT
Durée : 3 ans renouvelable
Remboursement : à la demande de LA HOLDING avec préavis 30 jours
Remboursement automatique : si LA FILIALE génère un FCF > X€

ARTICLE 5 — CONDITIONS DE TIRAGE
Demande écrite (email accepté) avec montant et objet
Délai mise à disposition : 5 jours ouvrés
Objet autorisé : BFR, investissement, acquisition — pas de dividendes

ARTICLE 6 — COMPTABILISATION
France (HOLDING) : compte 274 "Créances rattachées à des participations"
Madagascar (FILIALE) : compte 164 "Emprunts auprès des associés"
Intérêts : comptabilisés trimestriellement

ARTICLE 7 — PRIX DE TRANSFERT
Documentation conformément aux articles 57 et 238 A du CGI (France)
Rapport TP annuel joint aux comptes consolidés
Méthode retenue : comparable uncontrolled price (CUP)

ARTICLE 8 — DEVISES ET CHANGE
Monnaie de référence : Euro
Conversion Ariary : cours BCE J-1 du tirage
Risque de change : supporté par LA FILIALE

ARTICLE 9 — RÉSILIATION
[Conditions de résiliation, remboursement anticipé, événements déclencheurs]

Fait en double exemplaire, à [Ville], le [Date]

Signatures :
Pour MADAGRO HOLDING :        Pour MADAGRO GROUP :
[Fondateur] — Président        [CEO] — Directeur Général
\`\`\`

### Livrable 2 : Note de documentation prix de transfert (Markdown)
Obligatoire fiscalement — décrit pourquoi le taux retenu est conforme au marché.

### Livrable 3 : Tableau de suivi des flux (template Excel/CSV)

\`\`\`
Date | Sens | Montant EUR | Montant Ar | Taux change | Objet | Solde cumulé | Intérêts courus
\`\`\`

## Critères de validation
- [ ] Tous les articles complétés, aucune zone vide
- [ ] Taux d'intérêt documenté et justifié
- [ ] Conformité OCDE prix de transfert mentionnée
- [ ] Prêt pour signature après validation avocat
`,

  '[HOLDING] Apport en nature des parts MADAGRO GROUP dans la HOLDING': `${CTX}

## Mission
Tu es Fiscaliste de MADAGRO GROUP. Produis le **dossier complet d'apport en nature** pour transférer les participations du fondateur dans la holding.

## Contexte fiscal critique
L'apport de parts à une holding peut bénéficier du **régime de report d'imposition** (article 150-0 B ter CGI) si :
- La holding est soumise à l'IS
- Elle contrôle la société apportée (>50%)
- Les titres reçus sont conservés 3 ans minimum

## Ce que tu dois produire

### Livrable 1 : Note d'analyse fiscale (document Markdown)

**Schéma actuel vs schéma cible :**
\`\`\`
AVANT :
Fondateur (100%) → MADAGRO GROUP SAS

APRÈS :
Fondateur (100%) → MADAGRO HOLDING SASU → MADAGRO GROUP SAS

Avantages :
1. Régime mère-fille : dividendes exonérés IS à 95%
2. Plus-values de cession : régime de report si conditions remplies
3. Intégration fiscale possible (si HOLDING > 95% filiale)
4. Transmission facilitée (cession holding vs cession filiale)
\`\`\`

**Calcul de la plus-value latente :**
\`\`\`
Valeur des parts MADAGRO GROUP :
- Méthode DCF : à calculer selon business plan
- Méthode patrimoniale : actif net + goodwill
- Prix d'apport retenu : [Valeur X€]

Plus-value théorique = Valeur apport - Prix revient initial
Impôt reporté (article 150-0 B ter) = Plus-value × 30% (flat tax)
→ Non payé immédiatement si conditions report remplies
\`\`\`

### Livrable 2 : Acte d'apport en nature (draft Markdown)

\`\`\`
TRAITÉ D'APPORT EN NATURE

Par [Fondateur] (l'APPORTEUR) à MADAGRO HOLDING SASU (la SOCIÉTÉ BÉNÉFICIAIRE)

OBJET DE L'APPORT :
[Nombre] actions de MADAGRO GROUP SAS
Représentant [X]% du capital social
Valeur d'apport retenu : [Montant] euros

CONTREPARTIE :
Émission de [Nombre] actions nouvelles MADAGRO HOLDING
De valeur nominale 1€ chacune
Plus prime d'apport de [Montant]€

RAPPORT DU COMMISSAIRE AUX APPORTS :
[Obligatoire si valeur > 30 000€ — à faire évaluer par CAC]

DÉCLARATIONS DE L'APPORTEUR :
- Propriétaire légitime des titres
- Aucun nantissement sur les titres
- Aucun litige en cours

RÉGIME FISCAL :
Report d'imposition appliqué en vertu de l'article 150-0 B ter CGI
\`\`\`

### Livrable 3 : Checklist opérationnelle (Markdown)

\`\`\`
□ ÉTAPE 1 : Évaluation des parts (si > 30k€ : commissaire aux apports obligatoire)
□ ÉTAPE 2 : Décision du Président de MADAGRO HOLDING d'accepter l'apport
□ ÉTAPE 3 : Rédiger le traité d'apport (modèle ci-dessus)
□ ÉTAPE 4 : Assemblée Générale Extraordinaire MADAGRO HOLDING
□ ÉTAPE 5 : Enregistrement fiscal (formulaire 2759 — déclaration apport)
□ ÉTAPE 6 : Mise à jour registre des associés MADAGRO GROUP
□ ÉTAPE 7 : Dépôt modification KBIS MADAGRO GROUP (changement actionnaire)
□ ÉTAPE 8 : Déclaration 2074-I (report imposition à la déclaration IR)
□ ÉTAPE 9 : Mise à jour comptabilité des deux sociétés
\`\`\`

## Critères de validation
- [ ] Régime fiscal analysé avec les articles de loi corrects
- [ ] Acte d'apport template complet
- [ ] Checklist avec toutes les formalités légales
- [ ] Risques identifiés (perte du report si cession dans les 3 ans)
`,

  '[HOLDING] Pacte actionnaires MADAGRO GROUP — fondateur vs futurs investisseurs': `${CTX}

## Mission
Tu es Fiscaliste et Paige (Legal Drafter) de MADAGRO GROUP. Produis un **pacte d'actionnaires complet** pour protéger le fondateur lors de futures levées de fonds.

## Contexte
MADAGRO GROUP envisage une levée de fonds Série A (500k-1M€) dans 12-18 mois auprès de family offices spécialisés Afrique. Ce pacte protège le fondateur et encadre la gouvernance.

## Ce que tu dois produire

### Pacte d'actionnaires complet (document Markdown)

**PACTE D'ACTIONNAIRES DE MADAGRO GROUP SAS**

Structure :

**CHAPITRE 1 — GOUVERNANCE**
- Conseil stratégique : composition, réunions, pouvoirs
- Décisions nécessitant approbation investisseurs (liste limitative)
- Reporting obligations : fréquence, contenu des rapports

**CHAPITRE 2 — PROTECTION DU FONDATEUR**

*Clause de vesting fondateur :*
\`\`\`
100% acquis sur 4 ans avec cliff 1 an
Si départ involontaire (licenciement holding) : acquisition accélérée 100%
Si départ volontaire < 2 ans : rachat good leaver à 50% valeur de marché
\`\`\`

*Clause anti-dilution :*
\`\`\`
En cas de levée de fonds à une valorisation < [X]€ (ratchet down round),
le fondateur reçoit des actions gratuites compensant la dilution
Méthode : full ratchet ou broad-based weighted average (à choisir)
\`\`\`

**CHAPITRE 3 — TRANSFERT D'ACTIONS**

*Droit de préemption :*
\`\`\`
Tout actionnaire souhaitant céder doit d'abord proposer aux autres actionnaires
Délai d'exercice : 30 jours
Prix : égal au prix offert par le tiers
\`\`\`

*Clause d'agrément :*
\`\`\`
Tout transfert à un tiers nécessite approbation du fondateur
Refus possible sans justification pour les 3 premières années
\`\`\`

*Drag-along (entraînement) :*
\`\`\`
Si le fondateur reçoit une offre d'acquisition > 3x valorisation initiale
et décide d'accepter, les autres actionnaires sont obligés de céder également
aux mêmes conditions
\`\`\`

*Tag-along (sortie conjointe) :*
\`\`\`
Si un actionnaire majoritaire cède > 30% du capital,
les minoritaires peuvent vendre proportionnellement aux mêmes conditions
\`\`\`

**CHAPITRE 4 — INFORMATION ET REPORTING**
- Comptes annuels dans les 6 mois
- Reporting trimestriel KPIs (template annexe)
- Accès aux données comptables sur demande (sous 10 jours)

**CHAPITRE 5 — DISPOSITIONS DIVERSES**
- Durée du pacte : 5 ans renouvelables
- Loi applicable : droit français
- Litiges : arbitrage CCI Paris

**ANNEXES :**
- A : Tableau de capitalisation actuel
- B : Budget annuel approuvé
- C : Template reporting trimestriel

## Critères de validation
- [ ] Toutes les clauses de protection standard présentes
- [ ] Formules de calcul anti-dilution précises
- [ ] Drag/Tag-along avec seuils numériques
- [ ] Prêt pour review par avocat M&A
`,

  '[ÎLE MAURICE] Créer entité GBC1 — dossier FSC + avocat local + compte bancaire': `${CTX}

## Mission
Tu es Fiscaliste de MADAGRO GROUP. Produis le **dossier complet de création** d'une entité Global Business Company (GBC) à l'Île Maurice pour servir de hub financier régional.

## Pourquoi l'Île Maurice ?
- Convention fiscale France-Maurice + Maurice-Madagascar
- IS effectif : 3% (partial exemption sur 80% des revenus)
- Accès au réseau de 46 conventions fiscales
- Hub idéal : dividendes Madagascar → Maurice (5% retenue source) → France (0% avec convention)
- Crédibilité internationale pour les acheteurs export

## Ce que tu dois produire

### Livrable 1 : Analyse de structure optimale (document Markdown)

**Schéma de flux recommandé :**
\`\`\`
[Fondateur France]
       ↓
[MADAGRO HOLDING SASU - France]
       ↓ (100%)
[MADAGRO INTERNATIONAL - GBC - Île Maurice]
  ↙                    ↘
[MADAGRO GROUP SAS    [MADAGRO TRADE INT.]
  Madagascar]           [Réunion/France]

Flux dividendes :
Madagascar → Maurice : 5% retenue à la source
Maurice → France : 0% (convention franco-mauricienne)
Total : 5% vs 30% sans convention = économie significative
\`\`\`

### Livrable 2 : Dossier FSC (Financial Services Commission) Île Maurice

**Documents requis pour constitution GBC :**

\`\`\`
A. Par le Management Company (prestataire agréé) :
□ Certificate of Incorporation demande
□ Memorandum & Articles of Association (statuts mauriciens)
□ Business plan de la GBC (objet : holding animatrice, facturation services)
□ Formulaire FSC Application Form (ML-4B)

B. Par le fondateur/bénéficiaire effectif :
□ Passeport certifié conforme
□ Justificatif de domicile < 3 mois (2 documents)
□ CV / biographie professionnelle
□ Preuve de source des fonds (origine du capital)
□ Lettre de référence bancaire
□ Extrait casier judiciaire récent

C. Documents société mère (MADAGRO HOLDING) :
□ KBIS < 3 mois
□ Statuts à jour
□ Registre des bénéficiaires effectifs
\`\`\`

**Management Companies recommandées (prix indicatifs 2026) :**
| Prestataire | Frais setup | Frais annuels | Note |
|-------------|-------------|---------------|------|
| Vistra Mauritius | 2 500€ | 3 500€ | Premium, excellente réputation |
| Trident Trust | 2 000€ | 3 000€ | Bon rapport qualité/prix |
| Intercontinental Trust | 1 800€ | 2 800€ | Budget |

**Délai total : 3-4 semaines** après dossier complet

### Livrable 3 : Ouverture compte bancaire MCB (Mauritius Commercial Bank)

\`\`\`
Documents requis :
- Certificate of Incorporation GBC
- Certificate of Good Standing (émis par FSC)
- Board resolution autorisant l'ouverture du compte
- KYC dirigeants (passeport + domicile)
- Business plan et projections financières
- Lettre de référence de la banque actuelle

Process :
1. Envoyer dossier au Relationship Manager MCB
2. Comité de crédit : 2-3 semaines
3. Visite en personne ou appel visio obligatoire
4. Compte ouvert : SWIFT MCB MU + IBAN MU

Compte alternatif : SBM (State Bank of Mauritius) — procédure plus rapide
\`\`\`

### Livrable 4 : Checklist et planning (Markdown)

\`\`\`
MOIS 1 :
□ Sélectionner Management Company (demander 3 devis)
□ Préparer tous les documents KYC
□ Rédiger Memorandum & Articles (avec Management Co.)
□ Déposer dossier FSC

MOIS 2 :
□ Suivi FSC + réponses aux questions
□ Certificate of Incorporation reçu
□ Déposer dossier MCB

MOIS 3 :
□ Compte bancaire MCB opérationnel
□ Première facturation intragroupes Maurice
□ Déclaration fiscale initiale Maurice
\`\`\`

## Critères de validation
- [ ] Schéma fiscal avec flux et taux de retenue précis
- [ ] Liste documents FSC exhaustive et vérifiable
- [ ] Budget total réaliste (setup + annuel)
- [ ] Planning avec jalons clairs
`,

  // ═══════════════════════════════════════════════════════════
  // BOARD
  // ═══════════════════════════════════════════════════════════

  '[BOARD ⚠️] Décision ARCE (capital) vs Maintien ARE mensuel — deadline 7 Avril': `${CTX}

## Mission
Tu es Sterling, Business Strategist de MADAGRO GROUP. Produis une **note de décision complète** pour aider le fondateur à choisir entre l'ARCE et le maintien de l'ARE.

## Contexte fondateur
Le fondateur est en fin de contrat salarié en France. Il va s'inscrire à France Travail et doit choisir entre deux régimes pour financer la création de MADAGRO HOLDING.

## Ce que tu dois produire

### Livrable 1 : Note de décision structurée (document Markdown)

**ANALYSE : ARCE vs MAINTIEN ARE**

**Définitions :**
\`\`\`
ARE (Allocation Retour à l'Emploi) :
- Versement mensuel pendant toute la durée des droits
- Montant réduit si revenus entreprise > 0 (dégressif)
- Sécurité financière personnelle maintenue

ARCE (Aide à la Reprise et à la Création d'Entreprise) :
- Versement en 2 fois : 60% à la création + 40% à 6 mois
- Fin du versement mensuel
- Capital disponible immédiatement pour l'entreprise
- Condition : bénéficier de l'ACRE (exonération charges)
\`\`\`

**Tableau de simulation (avec X€ de droits ARE) :**

| Scénario | ARCE | Maintien ARE |
|----------|------|--------------|
| Capital immédiat | 60% × reliquat ARE | 0 |
| Revenus mensuels personnels | 0 | ARE mensuel (réduit si CA) |
| Durée protection | 1 an max | Durée droits restants |
| Risque | Perd capital si échec | Revenus maintenus |
| Idéal si... | Projet confirmé, besoin capital | Projet incertain, charges personnelles lourdes |

**Règle de décision :**
\`\`\`
Choisir ARCE si :
✓ Charges personnelles mensuelles < 60% du ARE mensuel (vous pouvez vivre sans)
✓ Le projet a besoin de trésorerie immédiate (dépôt capital holding, premiers investissements)
✓ Vous avez 6+ mois de réserve personnelle par ailleurs
✓ Vous êtes confiant dans les premiers revenus (délai < 6 mois)

Choisir Maintien ARE si :
✓ Charges personnelles importantes (loyer, crédit, enfants)
✓ Projet encore en phase de validation
✓ Pas de réserve personnelle
✓ Incertitude sur les premiers revenus
\`\`\`

### Livrable 2 : Simulateur financier (tableau Markdown)

\`\`\`
Données à renseigner par le fondateur :
- Reliquat ARE total estimé : [X] €
- Durée restante estimée : [Y] mois
- ARE mensuel brut : [Z] €
- Charges personnelles mensuelles : [W] €

Résultat ARCE :
- 1ère tranche (à la création) : X × 60% = ?
- 2ème tranche (6 mois) : X × 40% = ?
- Total capital disponible : X € × 100% = ?

Résultat Maintien ARE :
- Revenus mensuels pendant Y mois : Z × Y = ?
- Si revenus MADAGRO de 2000€/mois dès M+3 :
  ARE réduit = Z - 70% × revenus nets = ?
  Total perçu sur Y mois = ?

Comparaison : ARCE donne [+/-X€] vs Maintien
\`\`\`

### Livrable 3 : Démarches pratiques selon la décision (Markdown)

**Si ARCE choisi :**
\`\`\`
1. S'inscrire France Travail dans les 12 mois après fin de contrat
2. Déposer dossier de création d'entreprise + demande ACRE (Urssaf, formulaire)
3. Une fois ACRE accordée → demander l'ARCE sur espace France Travail
4. Délai versement 1ère tranche : 3-4 semaines
\`\`\`

**Si Maintien choisi :**
\`\`\`
1. S'inscrire France Travail
2. Déclarer la création d'entreprise (dans les 72h de l'immatriculation !)
3. Déclarer les revenus d'activité chaque mois
4. ARE réduit automatiquement selon revenus déclarés
\`\`\`

## Critères de validation
- [ ] Note lisible par le fondateur en 5 minutes
- [ ] Simulateur avec formules correctes
- [ ] Démarches pratiques précises et actionnables
- [ ] Recommandation claire selon le profil
`,

  '[BOARD] Valider architecture technique MIORA Phase 4 — stack mobile + infra + budget': `${CTX}

## Mission
Tu es CTO de MADAGRO TECH. Produis un **document d'Architecture Decision Record (ADR)** pour les choix techniques Phase 4 de MIORA, soumis à validation Board.

## Décisions à prendre

### Ce que tu dois produire

**ADR-001 : Stack Mobile MIORA**

\`\`\`
Contexte : MIORA nécessite une app mobile pour les agriculteurs
(Android basique, offline-first, < 10MB)

Options analysées :
A) React Native
   + Équipe JS existante peut contribuer
   + Expo pour déploiement rapide
   - Performance moindre sur Android bas de gamme
   - Taille app : 15-20MB

B) Flutter (Dart)
   + Performance native sur Android basique
   + Taille app : 8-12MB
   + Excellent support offline
   - Nouvelle technologie à apprendre

C) PWA (Progressive Web App)
   + Pas d'app store nécessaire
   + Partage URL (viral growth)
   - Offline limité, pas de Push Notifications natives
   - Moins performant

D) USSD + SMS (offline complet)
   + Fonctionne sur tout téléphone (même sans smartphone)
   + Réseau 2G suffisant
   - UX très limitée
   - Idéal pour zones rurales reculées

Recommandation : Flutter (Android) + USSD/SMS pour zones sans smartphone
Justification : [détaillée]

Conséquences : budget formations, délais, coûts
\`\`\`

**ADR-002 : Infrastructure Cloud**

\`\`\`
Options analysées :
A) Hetzner (Allemagne) : VPS CX32 — 11€/mois
B) OVH (France/Strasbourg) : VPS Confort — 14€/mois
C) AWS Mumbai (Asie) : t3.small — 25€/mois
D) Scaleway (Paris) : DEV1-M — 9€/mois

Critères de choix :
- Latence depuis Madagascar (mesurée)
- Prix pour 12 mois
- Support RGPD
- Scalabilité (upgrade facile)

Recommandation : [avec latences réelles mesurées via traceroute]
\`\`\`

**ADR-003 : Architecture Backend**

\`\`\`
Options :
A) Monolith Django (actuel) — continuer
B) Django + DRF séparé (API-first)
C) Microservices (trop tôt)

Recommandation : B (API-first Django)
Migration plan : [étapes]
\`\`\`

**ADR-004 : Base de données IoT**

\`\`\`
Options pour les données capteurs (1M readings/an) :
A) PostgreSQL seul (TimescaleDB extension)
B) InfluxDB séparé
C) TimescaleDB (extension PostgreSQL)

Recommandation : TimescaleDB
Avantages : même stack, compression 90%, fonctions time-series natives
\`\`\`

**Budget infrastructure mensuel (tableau) :**

| Composant | Phase 4 (0-6 mois) | Phase 5 (6-18 mois) | Phase 6 (18m+) |
|-----------|-------------------|--------------------|--------------:|
| VPS Production | 11€ | 22€ (scale-up) | 44€ |
| BDD backup | 5€ | 10€ | 20€ |
| CDN images | 3€ | 8€ | 15€ |
| Monitoring | 0€ (gratuit) | 0€ | 30€ |
| **Total** | **19€** | **40€** | **109€** |

## Critères de validation
- [ ] 4 ADRs complets avec décision finale
- [ ] Budget par phase justifié
- [ ] Risques techniques identifiés pour chaque choix
- [ ] Prêt pour présentation Board en 15 minutes
`,

  '[BOARD] Brief hebdo automatique fondateur — synthèse KPIs + actions requises lundi 8h': `${CTX}

## Mission
Tu es CEO de MADAGRO GROUP. Produis le **premier brief hebdomadaire** pour le fondateur, couvrant la semaine du 25 au 31 Mars 2026, puis définis la **routine automatique** pour les semaines suivantes.

## Ce que tu dois produire

### Livrable 1 : Brief hebdo Semaine 25-31 Mars 2026 (document Markdown)

\`\`\`markdown
# 📋 Brief Fondateur — Semaine 25-31 Mars 2026
*Généré par CEO Agent — Lundi 25 Mars 2026, 08h00*

---

## 🚨 URGENCES (décisions requises cette semaine)

| # | Sujet | Deadline | Action requise |
|---|-------|----------|----------------|
| 1 | Décision ARCE vs Maintien ARE | 7 Avril | Voir issue Board #X — simuler et décider |
| 2 | Prorogation TVA DGI Madagascar | 26-Mar (aujourd'hui) | Signer MEMO prorogation → voir issue GOUV |
| 3 | Serveur production MIORA | ASAP | Décision hébergeur → voir issue INFRA |

---

## 📊 KPIs de la Semaine

| Métrique | Valeur | Tendance | Cible |
|----------|--------|----------|-------|
| Issues terminées (7j) | 12 | ↑ | 10+ |
| Issues bloquées | 6 | ↑ | < 3 |
| Agents actifs | 13/18 | = | 18/18 |
| Budget IA consommé | X€ | - | < Y€ |
| Issues créées cette semaine | 27 (nouvelles) | ↑ | - |

---

## ✅ Avancées majeures cette semaine

- ✅ Constitution juridique MADAGRO GROUP avancée (statuts en review)
- ✅ Trust Score & Commission Engine : algorithme complet et testé
- ✅ Design System MIORA Phase 1-2 : terminé (tokens, composants)
- ✅ Architecture C4 MIORA documentée
- ✅ Plan GTM 100 fermes défini
- ✅ 27 nouvelles issues créées et agents lancés

---

## 🔴 Blocages à résoudre

| Blocage | Qui est bloqué | Raison | Ce que tu dois faire |
|---------|---------------|--------|---------------------|
| Serveur production inexistant | Pilote 100 fermes | Aucun VPS commandé | Approuver budget 40€/mois |
| Données FY2025 manquantes | Comptable, CFO | Non fournies | Envoyer fichiers comptables |
| Mobile Money : credentials sandbox | CTO | Non demandés | Contacter Orange Money Madagascar |
| Coopératives pilotes | Gia, COO | Contacts non identifiés | Activer réseau malgache |

---

## 📅 Agenda Fondateur cette semaine

- **Lundi** : Signer mémo prorogation TVA DGI
- **Mardi** : Ouvrir compte Qonto (48h pour KBIS reçu)
- **Mercredi** : Appel Orange Money Madagascar (sandbox credentials)
- **Jeudi** : Commander VPS Hetzner (30 min)
- **Vendredi** : Décision ARCE vs ARE (simuler, décider, informer CFO)

---

## 💡 Recommandation CEO

**Priorité absolue cette semaine : infrastructure de production.**
Sans serveur VPS opérationnel, le pilote 100 fermes prévu Avril-Juin ne peut pas démarrer.
Le CTO peut déployer en 48h une fois le VPS commandé.
Coût : 11€/mois (Hetzner CX32). ROI immédiat sur chaque ferme pilote activée.

---
*Prochaine mise à jour : Lundi 1 Avril 2026 — 08h00*
\`\`\`

### Livrable 2 : Template de routine Paperclip (Markdown)

Spécifications pour configurer la routine automatique :

\`\`\`
Nom de la routine : "Brief Fondateur Hebdo"
Déclencheur : Chaque lundi à 08h00 (UTC+3, heure Madagascar)
Agent exécuteur : CEO
Prompt système :

"Tu es le CEO de MADAGRO GROUP. Chaque lundi matin, génère le brief hebdo du fondateur.

Consulte :
1. Les issues des 7 derniers jours (créées, terminées, bloquées)
2. Les KPIs de la semaine écoulée
3. Les deadlines de la semaine suivante
4. Les agents en cours d'exécution

Format : utilise le template BRIEF_HEBDO_TEMPLATE.md
Sauvegarde le résultat comme work product de l'issue 'Brief hebdo'.
Tag toutes les issues nécessitant action fondateur avec label 'BOARD_ACTION'."
\`\`\`

### Livrable 3 : Tableau de bord KPIs permanent (Markdown)

Liste des 15 KPIs à suivre chaque semaine avec sources de données :

| KPI | Source | Fréquence | Alerte si |
|-----|--------|-----------|-----------|
| Issues terminées / semaine | DB Paperclip | Hebdo | < 5 |
| Issues bloquées | DB Paperclip | Hebdo | > 5 |
| Budget IA hebdo | Table costs | Hebdo | > X€ |
| MRR MIORA | DB abonnements | Mensuel | Baisse > 5% |
| Uptime serveur | Uptime Robot | Temps réel | < 99% |
| ... | ... | ... | ... |

## Critères de validation
- [ ] Brief complet et lisible en 5 minutes
- [ ] Toutes les urgences du moment identifiées
- [ ] Template routine utilisable par l'agent CEO
- [ ] Actions fondateur concrètes et datées
`,
};

// ─── SCRIPT DE MISE À JOUR ───────────────────────────────────────────────────

async function updateDescriptions(client) {
  let updated = 0;
  let notFound = 0;

  for (const [title, description] of Object.entries(descriptions)) {
    const result = await client.query(
      `UPDATE issues SET description = $1, updated_at = NOW()
       WHERE company_id = $2 AND title = $3
       RETURNING id`,
      [description.trim(), COMPANY_ID, title]
    );

    if (result.rowCount > 0) {
      console.log(`✅ UPDATED : ${title.substring(0, 75)}`);
      updated++;
    } else {
      console.log(`❌ NOT FOUND : ${title.substring(0, 75)}`);
      notFound++;
    }
  }

  console.log(`\n📊 Résultat : ${updated} mises à jour, ${notFound} non trouvées`);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://paperclip:paperclip@localhost:54329/paperclip'
  });

  await client.connect();
  console.log('✅ DB connectée — mise à jour des descriptions...\n');
  await updateDescriptions(client);
  await client.end();
  console.log('\n✅ Terminé. Les agents recevront le contexte complet à leur prochain wake.');
}

main().catch(e => { console.error('ERREUR:', e.message); process.exit(1); });
