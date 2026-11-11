#!/usr/bin/env bash
# Deploy SmartShop NZ to Cloudflare Pages.
#
# Usage:
#   ./deploy.sh [--token <api-token>] [--branch <branch>] [--skip-build]
#
# Environment variables (alternative to flags):
#   CF_API_TOKEN — Cloudflare API token (Pages:Edit permission)
#
# Requirements: curl, node/npm (wrangler is invoked via npx if not installed)

set -euo pipefail

PROJECT_NAME="wandering-dream-7fbc"
BRANCH="${DEPLOY_BRANCH:-main}"
API_TOKEN="${CF_API_TOKEN:-}"
DIST_DIR="$(cd "$(dirname "$0")" && pwd)/dist"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token)       API_TOKEN="$2"; shift 2 ;;
    --branch)      BRANCH="$2";    shift 2 ;;
    --skip-build)  SKIP_BUILD=1;   shift   ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$API_TOKEN" ]]; then
  echo "Error: CF_API_TOKEN is not set. Pass --token or export CF_API_TOKEN."
  exit 1
fi

# ── Build ────────────────────────────────────────────────────────────────────

if [[ -z "${SKIP_BUILD:-}" ]]; then
  echo "→ Building..."
  npm run build
  echo "  Build complete."
else
  echo "→ Skipping build (--skip-build)."
fi

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Error: dist/ not found at $DIST_DIR"
  exit 1
fi

# ── Deploy ───────────────────────────────────────────────────────────────────

echo "→ Deploying to Cloudflare Pages project '${PROJECT_NAME}'..."

if command -v wrangler &>/dev/null; then
  WRANGLER="wrangler"
else
  WRANGLER="npx wrangler@latest"
fi

CLOUDFLARE_API_TOKEN="$API_TOKEN" \
$WRANGLER pages deploy "$DIST_DIR" \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-dirty=true

echo ""
echo "✓ Deployed: https://wandering-dream-7fbc.pages.dev"
