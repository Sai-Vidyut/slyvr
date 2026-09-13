"""Authorization and library isolation tests for Slyvr auth."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure Backend is on path
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

TEST_JWT_SECRET = "test-slyvr-jwt-secret-do-not-use-in-prod"
os.environ["SUPABASE_JWT_SECRET"] = TEST_JWT_SECRET
os.environ["SLYVR_JWT_SECRET"] = TEST_JWT_SECRET
os.environ["SLYVR_JOIN_CODE_PEPPER"] = "test-pepper"
os.environ["SLYVR_AUTH_TEST_MODE"] = "1"
os.environ["SLYVR_LEGACY_LIBRARY_ACCESS"] = "0"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from auth.config import get_settings  # noqa: E402

get_settings.cache_clear()

import database as database_module  # noqa: E402
from database import Base  # noqa: E402

# Isolated in-memory DB shared across threads
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

database_module.engine = engine
database_module.SessionLocal = TestingSessionLocal

import models  # noqa: E402, F401
from models import Category, Clip, Library, Person, User, Workspace, WorkspaceMember  # noqa: E402

Base.metadata.create_all(bind=engine)

# Minimal legacy library for isolation tests (no clips shared with users)
with TestingSessionLocal() as db:
    if not db.query(Library).filter(Library.type == "legacy").first():
        db.add(
            Library(
                type="legacy",
                owner_user_id=None,
                workspace_id=None,
                name="Legacy Development",
            )
        )
        db.commit()

from auth.deps import get_db  # noqa: E402
from main import app  # noqa: E402


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
# Also override get_db used via auth.deps in routes that import get_db from auth.deps
import auth.deps as auth_deps  # noqa: E402

app.dependency_overrides[auth_deps.get_db] = override_get_db

client = TestClient(app)


def make_token(user_id: str, email: str, *, expired: bool = False) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=-1 if expired else 2)).timestamp()),
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


def auth_headers(user_id: str, email: str, library_id: int | None = None) -> dict:
    headers = {"Authorization": f"Bearer {make_token(user_id, email)}"}
    if library_id is not None:
        headers["X-Library-Id"] = str(library_id)
    return headers


def seed_user(user_id: str, email: str) -> tuple[User, Library]:
    """Provision via API (idempotent)."""
    r = client.get("/me", headers=auth_headers(user_id, email))
    assert r.status_code == 200, r.text
    data = r.json()
    personal = next(lib for lib in data["libraries"] if lib["type"] == "personal")
    db = TestingSessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        library = db.query(Library).filter(Library.id == personal["id"]).first()
        return user, library
    finally:
        db.close()


def add_clip(library_id: int, title: str, uploaded_by: str | None) -> int:
    db = TestingSessionLocal()
    try:
        clip = Clip(
            library_id=library_id,
            uploaded_by_user_id=uploaded_by,
            title=title,
            description="",
            blob_url=f"https://example.test/{title}.mp4",
            thumbnail_url=None,
            file_size=100,
        )
        db.add(clip)
        db.commit()
        db.refresh(clip)
        return clip.id
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_user_data():
    """Keep schema; clear user-owned rows between tests."""
    yield
    db = TestingSessionLocal()
    try:
        db.query(Clip).delete()
        db.query(Category).delete()
        db.query(Person).delete()
        db.query(WorkspaceMember).delete()
        # Delete workspace libraries then workspaces
        for lib in db.query(Library).filter(Library.type == "workspace").all():
            db.delete(lib)
        db.query(Workspace).delete()
        for lib in db.query(Library).filter(Library.type == "personal").all():
            db.delete(lib)
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


def test_unauthenticated_rejected():
    assert client.get("/clips").status_code == 401
    assert client.get("/me").status_code == 401


def test_expired_jwt_rejected():
    token = make_token("user-a", "a@example.com", expired=True)
    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_invalid_jwt_rejected():
    r = client.get(
        "/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401


def test_unsupported_jwt_algorithm_rejected():
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "user-a",
        "email": "a@example.com",
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=2)).timestamp()),
    }
    token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS384")
    r = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_personal_library_access_and_isolation():
    _, lib_a = seed_user("user-a", "a@example.com")
    _, lib_b = seed_user("user-b", "b@example.com")
    clip_a = add_clip(lib_a.id, "A personal", "user-a")
    clip_b = add_clip(lib_b.id, "B personal", "user-b")

    # A sees only own clips
    r = client.get("/clips", headers=auth_headers("user-a", "a@example.com", lib_a.id))
    assert r.status_code == 200
    ids = {c["id"] for c in r.json()["clips"]}
    assert clip_a in ids
    assert clip_b not in ids

    # A cannot use B's library id
    r = client.get("/clips", headers=auth_headers("user-a", "a@example.com", lib_b.id))
    assert r.status_code == 403

    # A cannot fetch B's clip by id even with A's library header
    r = client.get(
        f"/clips/{clip_b}",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
    )
    assert r.status_code == 404

    # A cannot update/delete B's clip
    r = client.put(
        f"/clips/{clip_b}",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
        json={"title": "hacked", "description": "", "category": ""},
    )
    assert r.status_code == 404
    r = client.delete(
        f"/clips/{clip_b}",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
    )
    assert r.status_code == 404


def test_workspace_membership_and_isolation():
    _, lib_a = seed_user("user-a", "a@example.com")
    seed_user("user-b", "b@example.com")

    create = client.post(
        "/workspaces",
        headers=auth_headers("user-a", "a@example.com"),
        json={"name": "Workspace A"},
    )
    assert create.status_code == 200, create.text
    ws_a = create.json()
    join_code = ws_a["join_code"]
    lib_ws_a = ws_a["library_id"]

    create_b = client.post(
        "/workspaces",
        headers=auth_headers("user-b", "b@example.com"),
        json={"name": "Workspace B"},
    )
    assert create_b.status_code == 200
    lib_ws_b = create_b.json()["library_id"]

    # A cannot access Workspace B
    r = client.get(
        "/clips",
        headers=auth_headers("user-a", "a@example.com", lib_ws_b),
    )
    assert r.status_code == 403

    # B joins A
    join = client.post(
        "/workspaces/join",
        headers=auth_headers("user-b", "b@example.com"),
        json={"code": join_code},
    )
    assert join.status_code == 200, join.text

    clip_ws = add_clip(lib_ws_a, "Shared drone", "user-a")

    # Both can list workspace A
    for uid, email in [("user-a", "a@example.com"), ("user-b", "b@example.com")]:
        r = client.get("/clips", headers=auth_headers(uid, email, lib_ws_a))
        assert r.status_code == 200
        assert any(c["id"] == clip_ws for c in r.json()["clips"])

    # Search scoped to workspace
    r = client.get(
        "/clips/search",
        params={"q": "drone"},
        headers=auth_headers("user-b", "b@example.com", lib_ws_a),
    )
    assert r.status_code == 200
    assert any(c["id"] == clip_ws for c in r.json()["clips"])

    # Personal still isolated
    personal_clip = add_clip(lib_a.id, "secret", "user-a")
    r = client.get(
        "/clips/search",
        params={"q": "secret"},
        headers=auth_headers("user-b", "b@example.com", lib_ws_a),
    )
    assert all(c["id"] != personal_clip for c in r.json()["clips"])


def test_uploader_from_jwt_not_spoofable():
    _, lib_a = seed_user("user-a", "a@example.com")
    # Direct DB insert simulates upload attribution from server
    clip_id = add_clip(lib_a.id, "upload-attr", "user-a")
    r = client.get(
        f"/clips/{clip_id}",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
    )
    assert r.status_code == 200
    assert r.json()["uploaded_by"]["id"] == "user-a"

    # Update body cannot change uploader (field not accepted)
    r = client.put(
        f"/clips/{clip_id}",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
        json={
            "title": "upload-attr",
            "description": "x",
            "category": "",
            "uploaded_by_user_id": "user-b",
        },
    )
    assert r.status_code == 200
    r = client.get(
        f"/clips/{clip_id}",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
    )
    assert r.json()["uploaded_by"]["id"] == "user-a"


def test_join_code_invalid_and_revoked():
    seed_user("user-a", "a@example.com")
    seed_user("user-b", "b@example.com")
    create = client.post(
        "/workspaces",
        headers=auth_headers("user-a", "a@example.com"),
        json={"name": "Join Lab"},
    )
    ws = create.json()
    code = ws["join_code"]
    workspace_id = ws["id"]
    lib_id = ws["library_id"]

    bad = client.post(
        "/workspaces/join",
        headers=auth_headers("user-b", "b@example.com"),
        json={"code": "totally-wrong-code"},
    )
    assert bad.status_code == 400

    revoke = client.post(
        f"/workspaces/{workspace_id}/join-code/revoke",
        headers=auth_headers("user-a", "a@example.com", lib_id),
    )
    assert revoke.status_code == 200

    revoked_join = client.post(
        "/workspaces/join",
        headers=auth_headers("user-b", "b@example.com"),
        json={"code": code},
    )
    assert revoked_join.status_code == 400


def test_member_cannot_regen_join_code():
    seed_user("user-a", "a@example.com")
    seed_user("user-b", "b@example.com")
    create = client.post(
        "/workspaces",
        headers=auth_headers("user-a", "a@example.com"),
        json={"name": "Roles Lab"},
    )
    ws = create.json()
    client.post(
        "/workspaces/join",
        headers=auth_headers("user-b", "b@example.com"),
        json={"code": ws["join_code"]},
    )
    r = client.post(
        f"/workspaces/{ws['id']}/join-code/regenerate",
        headers=auth_headers("user-b", "b@example.com", ws["library_id"]),
    )
    assert r.status_code == 403


def test_legacy_hidden_without_flag():
    seed_user("user-a", "a@example.com")
    r = client.get("/me", headers=auth_headers("user-a", "a@example.com"))
    types = {lib["type"] for lib in r.json()["libraries"]}
    assert "legacy" not in types

    db = TestingSessionLocal()
    try:
        legacy = db.query(Library).filter(Library.type == "legacy").first()
        assert legacy is not None
        legacy_id = legacy.id
    finally:
        db.close()

    r = client.get(
        "/clips",
        headers=auth_headers("user-a", "a@example.com", legacy_id),
    )
    assert r.status_code == 403


def test_personal_library_provisioning_idempotent():
    h = auth_headers("user-c", "c@example.com")
    first = client.get("/me", headers=h).json()
    second = client.get("/me", headers=h).json()
    personal_ids_1 = [l["id"] for l in first["libraries"] if l["type"] == "personal"]
    personal_ids_2 = [l["id"] for l in second["libraries"] if l["type"] == "personal"]
    assert len(personal_ids_1) == 1
    assert personal_ids_1 == personal_ids_2


def test_categories_scoped_per_library():
    _, lib_a = seed_user("user-a", "a@example.com")
    _, lib_b = seed_user("user-b", "b@example.com")
    r = client.post(
        "/categories",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
        json={"name": "Travel"},
    )
    assert r.status_code == 200
    r = client.post(
        "/categories",
        headers=auth_headers("user-b", "b@example.com", lib_b.id),
        json={"name": "Travel"},
    )
    assert r.status_code == 200
    a_cats = client.get(
        "/categories/all",
        headers=auth_headers("user-a", "a@example.com", lib_a.id),
    ).json()
    b_cats = client.get(
        "/categories/all",
        headers=auth_headers("user-b", "b@example.com", lib_b.id),
    ).json()
    assert len(a_cats) == 1 and len(b_cats) == 1
    assert a_cats[0]["id"] != b_cats[0]["id"]


def test_clip_read_url_authorized_external_passthrough():
    _, lib_a = seed_user("user-read-a", "read-a@example.com")
    clip_id = add_clip(lib_a.id, "read-test", "user-read-a")
    r = client.get(
        f"/clips/{clip_id}/read-url",
        params={"purpose": "media"},
        headers=auth_headers("user-read-a", "read-a@example.com", lib_a.id),
    )
    assert r.status_code == 200
    assert r.json()["url"].startswith("https://example.test/")


def test_clip_read_url_cross_library_404():
    _, lib_a = seed_user("user-read-b", "read-b@example.com")
    _, lib_b = seed_user("user-read-c", "read-c@example.com")
    clip_b = add_clip(lib_b.id, "secret", "user-read-c")
    r = client.get(
        f"/clips/{clip_b}/read-url",
        params={"purpose": "media"},
        headers=auth_headers("user-read-b", "read-b@example.com", lib_a.id),
    )
    assert r.status_code == 404


def test_clip_read_url_unauthenticated():
    r = client.get("/clips/1/read-url", params={"purpose": "media"})
    assert r.status_code == 401


def test_clip_read_url_invalid_purpose():
    _, lib_a = seed_user("user-read-d", "read-d@example.com")
    clip_id = add_clip(lib_a.id, "purpose-test", "user-read-d")
    r = client.get(
        f"/clips/{clip_id}/read-url",
        params={"purpose": "invalid"},
        headers=auth_headers("user-read-d", "read-d@example.com", lib_a.id),
    )
    assert r.status_code == 422
