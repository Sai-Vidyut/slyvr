# Clip Management System

## Project Overview

A web-based Clip Management System built using:

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend

* FastAPI
* SQLAlchemy
* SQLite

### Cloud Storage

* Azure Blob Storage

---

# Features

### Clip Management

* Upload video clips
* View clip library
* Search clips
* Edit clip details
* Delete clips
* Thumbnail generation
* Metadata extraction

### Categories

* Create categories
* Assign categories to clips
* Filter clips by category
* Delete categories

### People

* Create people
* Associate people with clips
* Filter clips by person
* Delete people

### Storage

* Azure Blob Storage integration
* Video storage in cloud
* Thumbnail storage in cloud

---

# Project Structure

```text
Clip-Management-System/
│
├── Backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── routes/
│   ├── services/
│   ├── schemas/
│   └── requirements.txt
│
├── Frontend/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
```

---

# Backend Setup

Navigate to Backend:

```bash
cd Backend
```

Create virtual environment:

```bash
python -m venv venv
```

Activate:

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file inside Backend and configure:

```env
AZURE_CONNECTION_STRING=
AZURE_CONTAINER_NAME=
```

Additional configuration may be required depending on deployment environment.

---

# Run Backend

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger Documentation:

```text
http://localhost:8000/docs
```

---

# Frontend Setup

Navigate to Frontend:

```bash
cd Frontend
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production version:

```bash
npm run build
```

---

# Current Functionality

### Completed

* Video Upload
* Azure Blob Integration
* Metadata Extraction
* Thumbnail Generation
* Category Management
* People Management
* Clip Search
* Clip Editing
* Clip Deletion
* Sidebar Filtering

### Future Enhancements

* Upload Progress Improvements
* Resumable Uploads
* Direct Azure Upload via SAS Tokens
* Mobile Upload Optimization
* Advanced Search & Tagging

---

# Notes

Current uploads are processed through FastAPI before being stored in Azure Blob Storage.

Large mobile uploads may be interrupted if:

* Browser is closed
* Device enters sleep mode
* Browser is suspended by the operating system

For production-scale deployments, direct Azure Blob uploads and resumable uploads are recommended.

---

# Contact

For any questions regarding implementation, architecture, or deployment, please contact the project author.





