#!/usr/bin/env bash
# =============================================================================
# git-sync.sh — Récupère les mises à jour upstream sans conflits
#
# Stratégie :
#   master  = miroir pur de upstream/master  → jamais de commits perso ici
#   dev     = vos modifications              → tous vos commits ici
#
# Usage :
#   ./scripts/git-sync.sh            # sync upstream → master → merge dans dev
#   ./scripts/git-sync.sh --dry-run  # aperçu sans modifier
#   ./scripts/git-sync.sh --no-push  # sync local uniquement
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
section() { echo -e "\n${BOLD}=== $* ===${NC}"; }

UPSTREAM_REMOTE="upstream"
ORIGIN_REMOTE="origin"
MIRROR_BRANCH="master"   # miroir upstream — ne jamais committer ici
DEV_BRANCH="dev"         # vos modifications

DRY_RUN=false
NO_PUSH=false

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true ;;
    --no-push)  NO_PUSH=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--no-push]"
      exit 0 ;;
    *) error "Option inconnue : $arg"; exit 1 ;;
  esac
done

run() {
  if $DRY_RUN; then echo -e "  ${YELLOW}[dry-run]${NC} git $*"
  else git "$@"; fi
}

# =============================================================================
section "Fetch upstream"
# =============================================================================

run fetch "$UPSTREAM_REMOTE" --prune
info "upstream fetchée."

# =============================================================================
section "Mise à jour master (miroir pur de upstream)"
# =============================================================================
# Reset hard = zéro conflit, master est toujours identique à upstream

CURRENT=$(git branch --show-current)

if $DRY_RUN; then
  info "[dry-run] reset --hard upstream/master sur '$MIRROR_BRANCH'"
else
  git checkout "$MIRROR_BRANCH" --quiet
  git reset --hard "$UPSTREAM_REMOTE/$MIRROR_BRANCH"
  git checkout "$CURRENT" --quiet
  ok "'$MIRROR_BRANCH' = upstream/master"
fi

# =============================================================================
section "Merge master dans dev"
# =============================================================================
# C'est ici que les conflits peuvent arriver, mais seulement sur les fichiers
# que vous avez modifiés ET que upstream a aussi modifiés.

if $DRY_RUN; then
  info "[dry-run] merge '$MIRROR_BRANCH' → '$DEV_BRANCH'"
else
  git checkout "$DEV_BRANCH" --quiet

  UPSTREAM_HEAD=$(git rev-parse "$MIRROR_BRANCH")
  MERGE_BASE=$(git merge-base HEAD "$UPSTREAM_HEAD")

  if [[ "$MERGE_BASE" == "$UPSTREAM_HEAD" ]]; then
    ok "'$DEV_BRANCH' est déjà à jour."
  else
    COUNT=$(git rev-list --count "$MERGE_BASE".."$UPSTREAM_HEAD")
    info "Merge de $COUNT nouveau(x) commit(s) upstream dans '$DEV_BRANCH'..."

    if git merge "$MIRROR_BRANCH" --no-edit; then
      ok "Merge réussi, pas de conflits."
    else
      error "Conflits détectés dans ces fichiers :"
      git diff --name-only --diff-filter=U
      echo ""
      echo "  Résolvez les conflits, puis :"
      echo "  git add <fichiers>  &&  git merge --continue"
      exit 1
    fi
  fi
fi

# =============================================================================
section "Push vers votre fork"
# =============================================================================

if $NO_PUSH; then
  warn "--no-push : rien envoyé vers origin."
elif $DRY_RUN; then
  info "[dry-run] push '$MIRROR_BRANCH' et '$DEV_BRANCH' → origin"
else
  run push "$ORIGIN_REMOTE" "$MIRROR_BRANCH"
  run push "$ORIGIN_REMOTE" "$DEV_BRANCH"
  ok "Push terminé."
fi

# =============================================================================
section "État final"
# =============================================================================

echo ""
git log --oneline "$DEV_BRANCH" ^"$MIRROR_BRANCH" | head -10 \
  | sed "s/^/  [dev] /"
echo ""
ok "Sync terminé. Branche active : $(git branch --show-current)"
echo ""
echo -e "  ${BLUE}master${NC} = upstream (miroir pur)"
echo -e "  ${GREEN}dev${NC}    = vos modifications"
