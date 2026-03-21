# Clip Management System

A full-stack web application for uploading, organizing, searching, and managing video clips with cloud storage, metadata extraction, and thumbnail generation.

**Originally built:** March 2026  
**Published to GitHub:** September 2026

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, shadcn/ui |
| **Backend** | FastAPI, SQLAlchemy, SQLite |
| **Storage** | Azure Blob Storage |
| **Media** | FFmpeg (thumbnails), ExifTool (metadata) |

---

## Features

- Upload, search, edit, and delete video clips
- Category and people tagging with sidebar filtering
- Automatic thumbnail generation and metadata extraction
- Azure Blob Storage integration

---

## Project Structure

```text
Clip-Management-System/
├── Backend/       # FastAPI API, services, and routes
├── frontend/      # React UI
└── README.md
```

---

## Backend Setup

```bash
cd Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Development Timeline

| Period | Milestone |
|--------|-----------|
| March 2026 | Full-stack development completed |
| September 2026 | Published to GitHub |

---

## License

This project is provided as-is. See Backend/README.md for API details.


## Notes

Built March 2026.
