# Paperclip Engineering Standards & Lessons Learned

Ce document consigne les règles de gestion critiques pour éviter les régressions et les erreurs de routage/données. **À LIRE IMPÉRATIVEMENT PAR TOUT AGENT.**

## 1. Routage Backend (Express)
- **Enregistrement Obligatoire :** Toute nouvelle route ajoutée dans `server/src/routes/` (ex: `routines.ts`, `company-skills.ts`) **DOIT** être importée et enregistrée via `api.use()` dans `server/src/app.ts`.
- **Vérification :** Lors de l'ajout d'une fonctionnalité API, vérifier systématiquement que le point de terminaison est accessible (pas de 404 "API route not found").

## 2. Routage Frontend (React/React Router)
- **Collision de Préfixes :** Les routes statiques de haut niveau (ex: `/instance/*`, `/auth`, `/onboarding`) doivent être déclarées avant les routes dynamiques basées sur des préfixes de compagnie (ex: `/:companyPrefix`).
- **Validation du Préfixe dans Layout :** Le composant `Layout.tsx` doit être mis à jour pour ignorer la validation du préfixe de compagnie (`hasUnknownCompanyPrefix`) pour les routes réservées comme `/instance/*`. Cela évite l'affichage erroné de "Company not found" pour des pages d'administration.

## 3. Résilience des Données (Services & Dashboard)
- **Gestion des Entités Orphelines :** Les services de synthèse (ex: `dashboardService`, `budgetService.overview`) ne doivent **JAMAIS** lever d'erreur `notFound` (404) si une entité liée (agent, projet) est manquante dans la base de données.
- **Fallbacks :** Utiliser des valeurs de repli (ex: `Unknown Agent (ID)`, `Unknown Project`) au lieu d'interrompre le flux. Cela garantit que le Dashboard reste fonctionnel même si des enregistrements historiques pointent vers des entités supprimées.

## 4. Maintenance des Tests
- **Vérification tsc :** Après toute modification structurelle (routes, types), lancer `pnpm tsc --noEmit` dans `server` et `ui` pour détecter les erreurs de typage ou les importations manquantes.
