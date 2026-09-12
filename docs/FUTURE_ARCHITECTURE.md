# Future architecture (not implemented)

This document describes a **possible evolution** of Slyvr toward multi-device ingestion and larger libraries.  
**Nothing here is present in the current runtime** unless also listed in [STATUS.md](./STATUS.md).

---

## Target shape

```text
Multiple Devices (desktops, phones, ingest agents)
        ↓
Ingestion Layer (authenticated device identity)
        ↓
Upload Queue (resumable / chunked)
        ↓
Media Processing Workers
        ↓
Metadata Extraction (ExifTool / ffprobe / future analyzers)
        ↓
Normalization + Deduplication
        ↓
Object Storage (blobs) + Primary DB
        ↓
Search Index (optional dedicated engine)
        ↓
Slyvr API + Clients
```

---

## Themes

### Asynchronous processing

Today, upload → metadata → thumbnail runs **inline** on the HTTP request.  
Future: accept upload, enqueue jobs, return `202` / job id, update clip status (`processing` → `ready` / `failed`).

### Job queues

Candidates: Redis + RQ/Celery, cloud queues, or a minimal DB-backed job table.  
Workers would own FFmpeg/ExifTool so the API stays responsive under parallel uploads.

### Resumable / concurrent uploads

Chunked uploads (e.g. tus or Azure block blobs) with per-device concurrency limits.  
Current multipart single-shot upload is a starting point, not a multi-device protocol.

### Deduplication

Content-hash (perceptual or cryptographic) before storing blobs; soft-link duplicate clips to one blob.  
Not implemented today — every upload creates a new blob.

### Device identity

API keys or OAuth device grants; each ingest agent identified and rate-limited.  
Current API has **no** auth.

### Storage abstraction

Interface over Azure (and later S3/local). Current code talks to Azure directly via `azure_service.py`.

### Metadata normalization

Keep raw EXIF/ffprobe JSON; map into stable columns + searchable facets.  
Current `metadata_json` + denormalized columns already sketch this pattern.

### Search indexing

Move from SQLite `ILIKE` + in-process RapidFuzz to FTS5, Meilisearch, Typesense, or OpenSearch when libraries exceed personal scale.  
Preserve server-side ranking semantics documented in ARCHITECTURE.md.

### Privacy

Keep extraction **local to the operator’s infrastructure**. Avoid sending media/GPS to third-party AI/geocoders by default. Optional reverse geocoding should be opt-in and cached.

### Authentication

Required before multi-user or internet-exposed API. Session/JWT + per-library ACLs.

---

## Migration posture

Prefer additive evolution:

1. Keep current sync path as “small library / local” mode  
2. Introduce job table + worker without changing client UX  
3. Add auth in front of existing routes  
4. Swap search backend behind the same `/clips/search` contract  

Do **not** pretend the current checkpoint already supports multi-device ingestion.
