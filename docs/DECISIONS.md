# Architecture decisions

Decisions evidenced by the **current** Slyvr codebase. Inferred items are labeled.

---

### React + Vite SPA

**Decision:** Frontend is a Vite-bundled React 19 + TypeScript SPA.  
**Why:** Fast local DX, simple static deploy story, fits a library UI without SSR requirements.  
**Consequence:** Client owns routing; API is a separate origin/proxy.

---

### FastAPI backend

**Decision:** Python FastAPI for HTTP API and upload.  
**Why:** Fits existing Python media tooling (ExifTool/FFmpeg wrappers) and rapid endpoint definition.  
**Consequence:** Sync request handlers; long media work can block workers until async jobs exist.

---

### TanStack Query (React Query)

**Decision:** Server state via React Query; no global client store for clips.  
**Why:** Caching, invalidation after mutations, query enable/disable for API gate.  
**Consequence:** Connection gating is natural via `enabled`; search keys include facet params.

---

### Framer Motion

**Decision:** Framer Motion (`m` + LazyMotion) for UI motion.  
**Why:** Shared variants, reduced-motion hooks, SVG pathLength for API icon.  
**Consequence:** Bundle cost mitigated by LazyMotion; animation quality depends on transform/opacity discipline.

---

### Local metadata extraction (ExifTool + ffprobe)

**Decision:** Extract metadata on the server from the uploaded file; do not trust the browser as authority.  
**Why:** Privacy and consistency; GPS/camera fields live with the operator.  
**Consequence:** Tools must be installed on the host; failures are non-fatal for upload.

---

### Preserve original media

**Decision:** Upload original bytes to blob storage; thumbnails are separate objects.  
**Why:** Avoid destructive transcoding during ingest.  
**Consequence:** Storage cost equals originals + thumbs; playback depends on browser-compatible codecs.

---

### Structured nullable metadata

**Decision:** Denormalized columns for search + `metadata_json` for full structure; all optional.  
**Why:** Existing clips without EXIF must keep working; search needs indexed-ish columns.  
**Consequence:** Dual representation must stay in sync at write time.

---

### Server-side ranked search

**Decision:** `/clips/search` performs candidate SQL + RapidFuzz scoring and returns facets.  
**Why:** Avoid shipping entire libraries to the browser for fuzzy match.  
**Consequence:** Scoring thresholds are code-owned; scale limited by SQLite + in-memory scoring.

---

### SQLite + ad-hoc migrations

**Decision:** SQLite file DB with `ensure_schema()` ALTER ADD COLUMN.  
**Why:** Zero-ops local development.  
**Consequence:** Not ideal for concurrent writers or production multi-instance; no Alembic history.

---

### Azure Blob Storage

**Decision:** Media and thumbnails stored in Azure Blob (`AZURE_CONNECTION_STRING`).  
**Why:** Offloads binary storage from the API host.  
**Consequence:** Local demos require Azure (or a future storage abstraction).

---

### API connection gating (client)

**Decision:** Top-bar Active/Off gates React Query against `/health`.  
**Why:** Operator control when backend is offline without spamming errors.  
**Consequence:** Not a security boundary — only UX/network gating.

---

### No authentication *(inferred)*

**Decision:** Open API within the deployment network.  
**Why:** Current product stage is single-operator library.  
**Consequence:** Must not expose the API publicly without adding auth.
