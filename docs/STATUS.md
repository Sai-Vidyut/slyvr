# Slyvr status

Checkpoint of what the repository implements **today**.

---

## Working

- Landing page at `/` (hero, product story, scroll sections)
- Auth UI at `/login` and `/signup` (Supabase email/password)
- Protected workspace at `/app` (requires session) + public demo via `/app?demo=1`
- Personal libraries + shared workspaces with join codes
- Library switcher (desktop + mobile)
- Clip CRUD scoped to the active authorized library
- Categories and people scoped per library (`UNIQUE(library_id, name)`)
- Upload with server-side `uploaded_by_user_id` from JWT (not client-spoofable)
- Thumbnail generation (FFmpeg for video; image copy for stills)
- Metadata extraction (ExifTool + ffprobe) into columns + `metadata_json`
- Server-side ranked search with library scoping
- API Active/Off control with health check and query gating
- Static production demo mode (frontend-only, read-only, no private API)
- React Query caching keyed by `libraryId`
- SQLite schema ensure + additive migrations (including auth tables + legacy backfill)
- Vite `/api` proxy for local development
- GitHub Pages deploy under `/slyvr/`

---

## Known limitations

- Supabase is identity-only; media DB remains local SQLite
- Legacy/development library access is env-gated (`SLYVR_LEGACY_LIBRARY_ACCESS`) and hidden from production switchers
- CORS must be allowlisted (no `*`) when auth is enabled
- Search/scoring is in-process over SQLite candidates
- Metadata/thumbnail work is synchronous on the upload request
- Azure Blob required for uploads
- Google OAuth not in MVP
- No conversational AI search yet

---

## Not yet implemented

- Conversational AI / Gemini / Groq search intents
- Google OAuth
- Async job queue / background workers
- Resumable chunked uploads
- Deduplication
- Dedicated search index
- Formal Alembic migration history
- Clip ownership transfer
