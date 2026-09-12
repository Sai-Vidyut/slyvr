# Slyvr status

Checkpoint of what the repository implements **today**.

---

## Working

- Landing page at `/` (hero, product story, scroll sections)
- Workspace at `/app` (sidebar, topbar, grid, drawer, upload modal)
- Clip CRUD (list, detail, update title/description/category, delete)
- Categories and people create/list/delete + sidebar filters
- Upload of video and image files with Azure persistence
- Thumbnail generation (FFmpeg for video; image copy for stills)
- Metadata extraction (ExifTool + ffprobe) into columns + `metadata_json`
- Clip inspector metadata sections (file / capture / location / video)
- Server-side ranked search (`GET /clips/search`) with typo/token tolerance
- Person- and category-aware search
- Contextual search facets (people, categories, devices, years, locations, types)
- Debounced search UX + BorderBeam on focus/active query
- API Active/Off control with health check and query gating
- ApiStatusIcon path animation (respects reduced motion)
- 3D media card hover tilt
- Shared motion language (drawers, modals, buttons, toasts)
- React Query caching and mutation toasts
- Dialog focus management
- SQLite schema ensure + nullable column migration helper
- Vite `/api` proxy for local development

---

## Known limitations

- No user accounts or API authentication
- CORS allows all origins
- Search/scoring is in-process over SQLite candidates (not a dedicated search engine)
- Metadata/thumbnail work is synchronous on the upload request
- No reverse geocoding service (raw GPS + optional OSM link only)
- Azure Blob required for uploads; no local disk storage backend
- No Docker/CI/production deploy configs in-repo
- Large synthetic libraries stress grid layout animations
- Upload form field still named `video` for historical reasons
- Legacy `exif_service.py` remains alongside `metadata_service.py`

---

## Not yet implemented

(See also [FUTURE_ARCHITECTURE.md](./FUTURE_ARCHITECTURE.md).)

- Multi-device / phone ingest agents
- API keys / OAuth
- Async job queue / background workers
- Resumable chunked uploads
- Deduplication
- Dedicated search index
- Multi-user libraries / sharing
- Automatic reverse geocoding
- Formal Alembic migration history
- End-to-end automated test suite for search/upload
