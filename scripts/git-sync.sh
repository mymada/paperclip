#!/usr/bin/env bash
# =============================================================================
# git-sync.sh — Synchronise votre fork avec le dépôt officiel Paperclip
#
# Structure des remotes :
#   upstream → https://github.com/paperclipai/paperclip  (officiel, lecture seule)
#   origin   → https://github.com/mymada/paperclip       (votre fork)
#
# Structure des branches :
#   paper_origin → miroir exact de upstream/master (ne jamais committer dessus)
#   master       → votre branche de travail principale (vos modifications)
#
# Usage :
#   ./scripts/git-sync.sh            # Sync et merge dans votre branche courante
#   ./scripts/git-sync.sh --dry-run  # Affiche ce qui serait fait, sans modifier
#   ./scripts/git-sync.sh --no-push  # Sync local uniquement, sans push
# =============================================================================

set -euo pipefail

# --- Couleurs ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
section() { echo -e "\n${BOLD}=== $* ===${NC}"; }

# --- Configuration ---
UPSTREAM_URL="https://github.com/paperclipai/paperclip.git"
ORIGIN_URL="https://github.com/mymada/paperclip.git"
UPSTREAM_REMOTE="upstream"
ORIGIN_REMOTE="origin"
UPSTREAM_BRANCH="master"          # branche principale du dépôt officiel
TRACKING_BRANCH="paper_origin"    # miroir local de upstream
YOUR_BRANCH="master"              # votre branche de travail

# --- Options ---
DRY_RUN=false
NO_PUSH=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --no-push)  NO_PUSH=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--no-push]"
      echo ""
      echo "  --dry-run   Affiche les actions sans les exécuter"
      echo "  --no-push   Sync local uniquement (pas de push vers origin)"
      exit 0 ;;
    *)
      error "Option inconnue : $arg"
      exit 1 ;;
  esac
done

# Wrapper pour les commandes git (respecte --dry-run)
run() {
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} git $*"
  else
    git "$@"
  fi
}

# =============================================================================
section "Vérifications préliminaires"
# =============================================================================

# S'assurer qu'on est dans un dépôt git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  error "Ce répertoire n'est pas un dépôt git."
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
info "Dépôt : $REPO_ROOT"

# Vérifier qu'il n'y a pas de modifications non commitées
DIRTY=$(git status --porcelain)
if [[ -n "$DIRTY" ]] && ! $DRY_RUN; then
  warn "Des modifications non commitées existent dans le working tree."
  warn "Elles ne seront pas perdues, mais il est recommandé de les stasher d'abord."
  echo ""
  git status --short | head -10
  echo ""
  # Demander confirmation seulement si on est dans un terminal interactif
  if [[ -t 0 ]]; then
    read -r -p "Continuer quand même ? [y/N] " confirm
    if [[ "${confirm,,}" != "y" ]]; then
      info "Abandon. Lancez 'git stash' puis relancez ce script."
      exit 0
    fi
  else
    warn "Mode non-interactif : poursuite automatique."
  fi
fi

CURRENT_BRANCH=$(git branch --show-current)
info "Branche courante : $CURRENT_BRANCH"

# =============================================================================
section "Configuration des remotes"
# =============================================================================

configure_remote() {
  local name="$1"
  local url="$2"

  if git remote get-url "$name" > /dev/null 2>&1; then
    local current_url
    current_url=$(git remote get-url "$name")
    if [[ "$current_url" != "$url" ]]; then
      info "Mise à jour du remote '$name' : $url"
      run remote set-url "$name" "$url"
    else
      ok "Remote '$name' déjà configuré correctement."
    fi
  else
    info "Ajout du remote '$name' : $url"
    run remote add "$name" "$url"
  fi
}

configure_remote "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
configure_remote "$ORIGIN_REMOTE"   "$ORIGIN_URL"

echo ""
git remote -v

# =============================================================================
section "Récupération des mises à jour"
# =============================================================================

info "Fetch upstream ($UPSTREAM_REMOTE)..."
run fetch "$UPSTREAM_REMOTE" --prune

info "Fetch origin ($ORIGIN_REMOTE)..."
run fetch "$ORIGIN_REMOTE" --prune

# =============================================================================
section "Mise à jour de la branche miroir ($TRACKING_BRANCH)"
# =============================================================================
# paper_origin = copie exacte de upstream/master, jamais de commits perso dessus

if $DRY_RUN; then
  info "[DRY-RUN] Mise à jour de $TRACKING_BRANCH → upstream/$UPSTREAM_BRANCH"
else
  if git rev-parse --verify "refs/heads/$TRACKING_BRANCH" > /dev/null 2>&1; then
    info "Mise à jour de '$TRACKING_BRANCH'..."
    SAVED_BRANCH=$(git branch --show-current)

    git checkout "$TRACKING_BRANCH" --quiet

    # Reset hard = miroir parfait, sans risque de divergence
    git reset --hard "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"

    git checkout "$SAVED_BRANCH" --quiet
    ok "'$TRACKING_BRANCH' est à jour avec upstream/$UPSTREAM_BRANCH"
  else
    info "Création de la branche '$TRACKING_BRANCH' depuis upstream/$UPSTREAM_BRANCH..."
    git checkout -b "$TRACKING_BRANCH" "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH" --quiet
    git checkout "$CURRENT_BRANCH" --quiet
    ok "'$TRACKING_BRANCH' créée."
  fi
fi

# =============================================================================
section "Merge upstream dans votre branche ($YOUR_BRANCH)"
# =============================================================================

TARGET_BRANCH="${CURRENT_BRANCH}"

if $DRY_RUN; then
  info "[DRY-RUN] Merge de '$TRACKING_BRANCH' dans '$TARGET_BRANCH'"
else
  # S'assurer qu'on est sur la bonne branche
  if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
    git checkout "$TARGET_BRANCH" --quiet
  fi

  # Vérifier s'il y a des nouvelles commits à merger
  UPSTREAM_HEAD=$(git rev-parse "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH")
  MERGE_BASE=$(git merge-base HEAD "$UPSTREAM_HEAD")

  if [[ "$MERGE_BASE" == "$UPSTREAM_HEAD" ]]; then
    ok "Votre branche est déjà à jour avec upstream. Rien à merger."
  else
    COMMIT_COUNT=$(git rev-list --count "$MERGE_BASE".."$UPSTREAM_HEAD")
    info "Merge de $COMMIT_COUNT nouveau(x) commit(s) depuis upstream..."

    if git merge "$TRACKING_BRANCH" --no-edit --no-ff 2>&1; then
      ok "Merge réussi."
    else
      error "Des conflits ont été détectés. Résolvez-les puis lancez 'git merge --continue'."
      git status --short
      exit 1
    fi
  fi
fi

# =============================================================================
section "Push vers votre fork (origin)"
# =============================================================================

if $NO_PUSH; then
  warn "--no-push activé : pas de push vers origin."
elif $DRY_RUN; then
  info "[DRY-RUN] Push de '$YOUR_BRANCH' et '$TRACKING_BRANCH' vers origin"
else
  info "Push de votre branche '$YOUR_BRANCH'..."
  run push "$ORIGIN_REMOTE" "$YOUR_BRANCH"

  info "Push de '$TRACKING_BRANCH' (miroir upstream)..."
  run push "$ORIGIN_REMOTE" "$TRACKING_BRANCH" --force-with-lease

  ok "Push terminé."
fi

# =============================================================================
section "Résumé"
# =============================================================================

echo ""
echo -e "${BOLD}Remotes :${NC}"
git remote -v

echo ""
echo -e "${BOLD}Branches locales :${NC}"
git branch -v

echo ""
echo -e "${BOLD}État du working tree :${NC}"
git status --short | head -10 || echo "  (propre)"

echo ""
ok "Synchronisation terminée !"
echo ""
echo -e "  ${BLUE}upstream/${UPSTREAM_BRANCH}${NC}  →  branche '${TRACKING_BRANCH}' (miroir officiel)"
echo -e "  Vos modifications  →  branche '${YOUR_BRANCH}'"
echo ""
