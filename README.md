# Slyvr

Slyvr is a private video and photo library: upload media, organize with categories and people, search with relevance ranking, and inspect capture/device/location metadata.

This repository is a reproducible checkpoint of the current working application (React + FastAPI).

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, Framer Motion, React Router |
| Backend | FastAPI, SQLAlchemy, SQLite |
| Storage | Azure Blob Storage |
| Media tools | FFmpeg / ffprobe (thumbnails + video probe), ExifTool (EXIF / GPS) |

---

## Capabilities (current)

- Landing page (`/`) and workspace library (`/app`)
- Upload videos and images with thumbnail generation
- Server-side fuzzy / ranked search with contextual facets
- Categories and people filters
- Clip inspector with structured metadata sections
- API Active / Off connection gate (health-backed)
- Motion system (cards, drawers, modals, BorderBeam search, API status icon)

---

## Project structure

```text
.
├── Backend/           # FastAPI app, models, routes, services
├── frontend/          # Vite React SPA
├── docs/              # Architecture and status documentation
└── README.md
```

---

## Local development

### One-command launcher

From the repository root (any working directory is fine if you invoke the script by path):

```bash
./scripts/dev.sh
```

Stop with **Ctrl+C** (the script shuts down both servers and avoids leaving orphaned processes).

This starts:

- **FastAPI** on http://127.0.0.1:8000 (existing `Backend/venv`, with reload)
- **Vite** on http://127.0.0.1:5173 (existing dev server and `/api` proxy to the backend)

Prerequisites: `Backend/venv`, `frontend/node_modules`, and Node/npm (the launcher prepends the user-local Node 22 install when present).

### Backend

```bash
cd Backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # set AZURE_CONNECTION_STRING if using Azure
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- API: http://127.0.0.1:8000  
- OpenAPI: http://127.0.0.1:8000/docs  

Requires **ExifTool** and **FFmpeg/ffprobe** on `PATH` for full metadata/thumbnail behavior. Upload continues if metadata extraction fails.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env       # optional; empty VITE_API_URL uses Vite proxy
npm run dev
```

- App: http://localhost:5173  
- Dev proxy: `/api` → `http://127.0.0.1:8000`

### Build

```bash
cd frontend && npm run build
```

---

## Environment variables

**Backend** (`Backend/.env` — never commit):

| Variable | Purpose |
|----------|---------|
| `AZURE_CONNECTION_STRING` | Azure Blob Storage connection |
| `AZURE_CONTAINER_NAME` | Optional container name (see azure service) |

**Frontend** (`frontend/.env` — optional):

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base URL; leave empty in local dev to use `/api` proxy |

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Current system architecture |
| [docs/FUTURE_ARCHITECTURE.md](docs/FUTURE_ARCHITECTURE.md) | Multi-device direction (not implemented) |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decision records |
| [docs/STATUS.md](docs/STATUS.md) | Working features and limitations |

---

## Current limitations

- SQLite + in-process search (fine for personal libraries; not a distributed index)
- Auth / multi-user accounts are not implemented
- Reverse geocoding is not automatic (raw GPS only)
- Azure Blob required for production-style uploads
- No formal CI/CD or container deployment in-repo

---

## License

Provided as-is for development and archival of the current Slyvr checkpoint.
