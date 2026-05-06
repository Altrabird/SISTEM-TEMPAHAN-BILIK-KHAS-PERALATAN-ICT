#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# deploy.sh — pull latest code, build, and atomically swap into /var/www/tempah
#
# SAFETY:
# - This script ONLY touches paths that contain "/tempah/" by design.
# - It NEVER restarts nginx (could affect other sites). Only reloads.
# - It NEVER deletes anything outside /var/www/tempah/releases/.
# - It NEVER overwrites /etc/nginx/sites-* — Certbot's HTTPS setup is
#   appended to the live config, so overwriting from the repo would
#   wipe HTTPS. If you need to change nginx behaviour, edit the live
#   file in place or copy + re-run `certbot --nginx -d <domain>`.
# - Other apps on this VPS are not touched.
#
# Run on the VPS after the initial setup:
#   cd /opt/tempah && ./deploy.sh
#
# Requires:
#   - Node 20+ and npm on the VPS
#   - .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
#   - sudo nginx, /var/www/tempah owned by the deploy user (or use sudo)
# -----------------------------------------------------------------------------
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/tempah}"
WEB_ROOT="${WEB_ROOT:-/var/www/tempah}"
RELEASE="$(date +%Y%m%d-%H%M%S)"

# Safety guards: refuse to run if paths look wrong
if [[ "$REPO_DIR" != *"/tempah"* ]]; then
  echo "ERROR: REPO_DIR must contain 'tempah'. Got: $REPO_DIR" >&2
  exit 1
fi
if [[ "$WEB_ROOT" != *"/tempah"* ]]; then
  echo "ERROR: WEB_ROOT must contain 'tempah'. Got: $WEB_ROOT" >&2
  exit 1
fi

cd "$REPO_DIR"

echo "==> Pulling latest from origin/main"
git pull --rebase origin main

echo "==> Installing dependencies (clean)"
npm ci --no-audit --no-fund

echo "==> Building (Vite bakes VITE_SUPABASE_* env vars into the bundle)"
if [ ! -f .env.local ]; then
  echo "ERROR: .env.local missing. Cannot build without VITE_SUPABASE_URL/_ANON_KEY." >&2
  exit 1
fi
npm run build

echo "==> Publishing release ${RELEASE}"
sudo mkdir -p "${WEB_ROOT}/releases/${RELEASE}"
sudo cp -r dist/* "${WEB_ROOT}/releases/${RELEASE}/"

# Atomic swap — point /var/www/tempah/dist at the new release
sudo ln -sfn "${WEB_ROOT}/releases/${RELEASE}" "${WEB_ROOT}/dist"

# Keep last 5 releases, drop the rest. Hard-coded path prefix as a
# defence-in-depth check so a misconfigured WEB_ROOT can't wipe other apps.
echo "==> Pruning old releases (only inside ${WEB_ROOT}/releases/)"
if [[ "${WEB_ROOT}" == *"/tempah"* && -d "${WEB_ROOT}/releases" ]]; then
  sudo bash -c "ls -1dt ${WEB_ROOT}/releases/* | tail -n +6 | xargs -r rm -rf"
else
  echo "  (skipped — refusing to prune outside /tempah/)"
fi

echo "==> Reloading nginx (graceful — does NOT affect other sites)"
sudo nginx -t && sudo systemctl reload nginx

echo
echo "Done. Live at https://tempah.altrabird.click"
