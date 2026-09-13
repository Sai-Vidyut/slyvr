#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/production/install-backend.sh" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="${REPO_ROOT}/Backend"
SVC_USER="${SVC_USER:-slyvr}"

command -v apt-get >/dev/null || { echo "Debian/Ubuntu required" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  python3 python3-venv python3-pip \
  ffmpeg libimage-exiftool-perl \
  debian-keyring debian-archive-keyring apt-transport-https curl

if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

if [[ ! -d "${BACKEND}/venv" ]]; then
  sudo -u "${SVC_USER}" python3 -m venv "${BACKEND}/venv"
fi

sudo -u "${SVC_USER}" "${BACKEND}/venv/bin/pip" install --upgrade pip
sudo -u "${SVC_USER}" "${BACKEND}/venv/bin/pip" install -r "${BACKEND}/requirements.txt"

install -d -o "${SVC_USER}" -g "${SVC_USER}" "${BACKEND}/temp_uploads"
touch "${BACKEND}/clips.db"
chown "${SVC_USER}:${SVC_USER}" "${BACKEND}/clips.db" 2>/dev/null || true

install -m 0644 "${REPO_ROOT}/deploy/production/Caddyfile" /etc/caddy/Caddyfile
install -m 0644 "${REPO_ROOT}/deploy/production/slyvr-api.service" /etc/systemd/system/slyvr-api.service

systemctl daemon-reload
systemctl enable caddy slyvr-api
systemctl restart caddy

if [[ ! -f "${BACKEND}/.env" ]]; then
  echo "Create ${BACKEND}/.env from deploy/production/env.production.example before starting slyvr-api." >&2
else
  systemctl enable slyvr-api
  systemctl restart slyvr-api
fi

echo "Installed. Ensure DNS for api.buildwsai.online points here, then:"
echo "  curl -sS https://api.buildwsai.online/health"
