# Slyvr production API (Ubuntu + Caddy + systemd)

Target: `https://api.buildwsai.online` → Caddy → `127.0.0.1:8000` (uvicorn, one worker, SQLite).

## DNS (Spaceship / buildwsai.online)

Add an **A** record:

| Name | Type | Value |
|------|------|--------|
| `api` | A | Public IPv4 of this host (e.g. VM `curl -4 ifconfig.me`) |

Wait for propagation (`host api.buildwsai.online` should resolve to that IP, not GitHub Pages).

## One-time host setup (requires sudo)

From the Slyvr repo root on the API host:

```bash
sudo bash deploy/production/install-backend.sh
```

Then edit `/home/slyvr/slyvr/Backend/.env` using `deploy/production/env.production.example` as a checklist.

Reload after env changes:

```bash
sudo systemctl restart slyvr-api caddy
```

## Verify

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://api.buildwsai.online/health
curl -sS -o /dev/null -w '%{http_code}\n' https://api.buildwsai.online/me
```

Expect `200` and `401` respectively.
