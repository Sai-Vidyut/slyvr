#!/usr/bin/env bash
# Post-login Cloudflare Tunnel setup on the API host (Ubuntu VM).
# Does NOT modify DNS. Does NOT commit credentials to git.
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/production/install-cloudflared-tunnel.sh" >&2
  exit 1
fi

TUNNEL_NAME="${TUNNEL_NAME:-slyvr-api}"
CF_DIR="/etc/cloudflared"
CERT="/root/.cloudflared/cert.pem"

if [[ ! -f "${CERT}" ]]; then
  echo "Missing ${CERT}. Run first: sudo cloudflared tunnel login" >&2
  exit 1
fi

command -v cloudflared >/dev/null || { echo "Install cloudflared first." >&2; exit 1; }

install -d -m 0700 "${CF_DIR}"

EXISTING_ID="$(cloudflared tunnel list --output json 2>/dev/null | python3 -c "
import json,sys
name='${TUNNEL_NAME}'
try:
    data=json.load(sys.stdin)
except Exception:
    sys.exit(0)
for t in data:
    if t.get('name')==name:
        print(t.get('id',''))
        break
" 2>/dev/null || true)"

if [[ -n "${EXISTING_ID}" ]]; then
  TUNNEL_ID="${EXISTING_ID}"
  echo "Reusing tunnel ${TUNNEL_NAME} (${TUNNEL_ID})"
else
  cloudflared tunnel create "${TUNNEL_NAME}"
  TUNNEL_ID="$(cloudflared tunnel list --output json | python3 -c "
import json,sys
name='${TUNNEL_NAME}'
for t in json.load(sys.stdin):
    if t.get('name')==name:
        print(t['id'])
        break
")"
fi

CRED_SRC="${HOME}/.cloudflared/${TUNNEL_ID}.json"
if [[ ! -f "${CRED_SRC}" ]]; then
  CRED_SRC="/root/.cloudflared/${TUNNEL_ID}.json"
fi
if [[ ! -f "${CRED_SRC}" ]]; then
  echo "Tunnel credentials JSON not found for ${TUNNEL_ID}" >&2
  exit 1
fi

install -m 0600 "${CRED_SRC}" "${CF_DIR}/${TUNNEL_ID}.json"

cat > "${CF_DIR}/config.yml" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CF_DIR}/${TUNNEL_ID}.json

ingress:
  - hostname: api.buildwsai.online
    service: http://127.0.0.1:8000
  - service: http_status:404
EOF
chmod 0644 "${CF_DIR}/config.yml"

if systemctl is-enabled cloudflared >/dev/null 2>&1; then
  systemctl restart cloudflared
else
  cloudflared service install
  systemctl enable --now cloudflared
fi

echo "Tunnel ${TUNNEL_NAME} UUID: ${TUNNEL_ID}"
echo "Verify: systemctl status cloudflared --no-pager"
echo "After DNS CNAME is set: curl -sS https://api.buildwsai.online/health"
