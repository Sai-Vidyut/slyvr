#!/usr/bin/env python3
"""E2E API verification against running Backend (no secrets printed)."""
from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
import requests
from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND / ".env")

BASE = os.environ.get("SLYVR_TEST_API", "http://127.0.0.1:8000")
SECRET = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("SLYVR_JWT_SECRET") or ""
AUD = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
LEGACY_FLAG = os.getenv("SLYVR_LEGACY_LIBRARY_ACCESS", "0")

results = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def token(user_id: str, email: str, *, expired: bool = False, aud: str | None = AUD) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=-1 if expired else 2)).timestamp()),
    }
    if aud is not None:
        payload["aud"] = aud
    return jwt.encode(payload, SECRET, algorithm="HS256")


def headers(uid: str, email: str, library_id: int | None = None, **kw):
    h = {"Authorization": f"Bearer {token(uid, email, **kw)}"}
    if library_id is not None:
        h["X-Library-Id"] = str(library_id)
    return h


def main() -> int:
    if not SECRET:
        print("FAIL: SUPABASE_JWT_SECRET missing in Backend/.env")
        return 2

    # Health
    r = requests.get(f"{BASE}/health", timeout=5)
    record("health open", r.status_code == 200, str(r.status_code))

    # Unauthenticated protected
    for path in ["/me", "/clips", "/categories/all", "/people", "/clips/search?q=test"]:
        code = requests.get(f"{BASE}{path}", timeout=5).status_code
        record(f"unauth {path}", code == 401, str(code))

    # Bad JWTs
    bad = requests.get(
        f"{BASE}/me",
        headers={"Authorization": "Bearer not-a-jwt"},
        timeout=5,
    ).status_code
    record("malformed JWT", bad == 401, str(bad))

    exp = requests.get(
        f"{BASE}/me",
        headers={"Authorization": f"Bearer {token('x', 'x@test.com', expired=True)}"},
        timeout=5,
    ).status_code
    record("expired JWT", exp == 401, str(exp))

    # Users
    uid_a = f"verify-a-{uuid.uuid4()}"
    uid_b = f"verify-b-{uuid.uuid4()}"
    email_a = f"a_{uuid.uuid4().hex[:8]}@verify.slyvr.test"
    email_b = f"b_{uuid.uuid4().hex[:8]}@verify.slyvr.test"

    me1 = requests.get(f"{BASE}/me", headers=headers(uid_a, email_a), timeout=10)
    record("User A /me JWT accepted", me1.status_code == 200, str(me1.status_code))
    if me1.status_code != 200:
        print(me1.text[:300])
        return 1
    data1 = me1.json()
    personal_a = next(l for l in data1["libraries"] if l["type"] == "personal")
    libs1 = [l for l in data1["libraries"] if l["type"] == "personal"]
    record("User A exactly one personal library", len(libs1) == 1, str(len(libs1)))
    record(
        "Default active is personal",
        data1["active_library"]["id"] == personal_a["id"],
        str(data1["active_library"]),
    )

    me2 = requests.get(f"{BASE}/me", headers=headers(uid_a, email_a), timeout=10)
    libs2 = [l for l in me2.json()["libraries"] if l["type"] == "personal"]
    record(
        "Re-login does not duplicate personal library",
        len(libs2) == 1 and libs2[0]["id"] == personal_a["id"],
        str(libs2),
    )

    me_b = requests.get(f"{BASE}/me", headers=headers(uid_b, email_b), timeout=10)
    record("User B /me", me_b.status_code == 200, str(me_b.status_code))
    personal_b = next(l for l in me_b.json()["libraries"] if l["type"] == "personal")

    # DB mirror check
    sys.path.insert(0, str(BACKEND))
    from database import SessionLocal
    from models import Category, Clip, Library, Person, User

    db = SessionLocal()
    try:
        ua = db.query(User).filter(User.id == uid_a).first()
        ub = db.query(User).filter(User.id == uid_b).first()
        record("User A mirrored in users", ua is not None and ua.email == email_a)
        record("User B mirrored in users", ub is not None and ub.email == email_b)
        pers_count_a = (
            db.query(Library)
            .filter(Library.type == "personal", Library.owner_user_id == uid_a)
            .count()
        )
        record("DB personal library count for A is 1", pers_count_a == 1, str(pers_count_a))
    finally:
        db.close()

    # Isolation
    code = requests.get(
        f"{BASE}/clips",
        headers=headers(uid_a, email_a, personal_b["id"]),
        timeout=10,
    ).status_code
    record("A cannot use B personal X-Library-Id", code == 403, str(code))

    code = requests.get(
        f"{BASE}/clips",
        headers=headers(uid_b, email_b, personal_a["id"]),
        timeout=10,
    ).status_code
    record("B cannot use A personal X-Library-Id", code == 403, str(code))

    # Seed clips via DB (avoid Azure upload dependency)
    db = SessionLocal()
    try:
        clip_a = Clip(
            library_id=personal_a["id"],
            uploaded_by_user_id=uid_a,
            title="verify-clip-a-unique",
            description="",
            blob_url="https://example.test/a.mp4",
            file_size=1,
        )
        clip_b = Clip(
            library_id=personal_b["id"],
            uploaded_by_user_id=uid_b,
            title="verify-clip-b-unique",
            description="",
            blob_url="https://example.test/b.mp4",
            file_size=1,
        )
        db.add_all([clip_a, clip_b])
        db.commit()
        db.refresh(clip_a)
        db.refresh(clip_b)
        id_a, id_b = clip_a.id, clip_b.id
    finally:
        db.close()

    ra = requests.get(f"{BASE}/clips", headers=headers(uid_a, email_a, personal_a["id"]), timeout=10)
    ids = {c["id"] for c in ra.json()["clips"]}
    record("A lists own clip", id_a in ids and id_b not in ids, str(ids))

    rb = requests.get(f"{BASE}/clips", headers=headers(uid_b, email_b, personal_b["id"]), timeout=10)
    ids_b = {c["id"] for c in rb.json()["clips"]}
    record("B lists own clip", id_b in ids_b and id_a not in ids_b, str(ids_b))

    code = requests.get(
        f"{BASE}/clips/{id_b}",
        headers=headers(uid_a, email_a, personal_a["id"]),
        timeout=10,
    ).status_code
    record("A cannot get B clip by ID", code == 404, str(code))

    code = requests.put(
        f"{BASE}/clips/{id_b}",
        headers=headers(uid_a, email_a, personal_a["id"]),
        json={"title": "hacked", "description": "", "category": "", "uploaded_by_user_id": uid_a},
        timeout=10,
    ).status_code
    record("A cannot update B clip", code == 404, str(code))

    code = requests.delete(
        f"{BASE}/clips/{id_b}",
        headers=headers(uid_a, email_a, personal_a["id"]),
        timeout=10,
    ).status_code
    record("A cannot delete B clip", code == 404, str(code))

    # Categories uniqueness across libraries
    ca = requests.post(
        f"{BASE}/categories",
        headers=headers(uid_a, email_a, personal_a["id"]),
        json={"name": "Travel"},
        timeout=10,
    )
    cb = requests.post(
        f"{BASE}/categories",
        headers=headers(uid_b, email_b, personal_b["id"]),
        json={"name": "Travel"},
        timeout=10,
    )
    record(
        "Same category name allowed in different libraries",
        ca.status_code == 200 and cb.status_code == 200 and ca.json()["id"] != cb.json()["id"],
        f"{ca.status_code}/{cb.status_code}",
    )

    # Search isolation
    sa = requests.get(
        f"{BASE}/clips/search",
        params={"q": "verify-clip-b-unique"},
        headers=headers(uid_a, email_a, personal_a["id"]),
        timeout=10,
    )
    record(
        "Search does not leak B clip into A",
        sa.status_code == 200 and all(c["id"] != id_b for c in sa.json()["clips"]),
        str([c["id"] for c in sa.json().get("clips", [])]),
    )

    # Uploader immutable on update
    detail = requests.get(
        f"{BASE}/clips/{id_a}",
        headers=headers(uid_a, email_a, personal_a["id"]),
        timeout=10,
    ).json()
    record(
        "Clip A uploaded_by is A",
        detail.get("uploaded_by", {}).get("id") == uid_a,
        str(detail.get("uploaded_by")),
    )
    requests.put(
        f"{BASE}/clips/{id_a}",
        headers=headers(uid_a, email_a, personal_a["id"]),
        json={"title": "verify-clip-a-unique", "description": "edited", "category": "", "uploaded_by_user_id": uid_b},
        timeout=10,
    )
    detail2 = requests.get(
        f"{BASE}/clips/{id_a}",
        headers=headers(uid_a, email_a, personal_a["id"]),
        timeout=10,
    ).json()
    record(
        "Uploader immutable after edit spoof",
        detail2.get("uploaded_by", {}).get("id") == uid_a,
        str(detail2.get("uploaded_by")),
    )

    # Workspace A creates, B joins
    ws = requests.post(
        f"{BASE}/workspaces",
        headers=headers(uid_a, email_a),
        json={"name": f"Verify Studio {uuid.uuid4().hex[:6]}"},
        timeout=10,
    )
    record("Create workspace", ws.status_code == 200, str(ws.status_code))
    wsj = ws.json()
    join_code = wsj.get("join_code")
    lib_ws = wsj["library_id"]
    ws_id = wsj["id"]
    record("Creator is owner", wsj.get("role") == "owner", str(wsj.get("role")))
    record("Join code returned once", bool(join_code), "present" if join_code else "missing")
    record("Workspace library created", isinstance(lib_ws, int))

    # Unauth cannot access workspace lib
    code = requests.get(
        f"{BASE}/clips",
        headers={"X-Library-Id": str(lib_ws)},
        timeout=10,
    ).status_code
    record("Unauth cannot access workspace library", code == 401, str(code))

    # Join code is not ongoing auth by itself
    join = requests.post(
        f"{BASE}/workspaces/join",
        headers=headers(uid_b, email_b),
        json={"code": join_code},
        timeout=10,
    )
    record("B joins with code", join.status_code == 200, str(join.status_code))

    # After join, B can access with JWT + X-Library-Id (not code)
    code = requests.get(
        f"{BASE}/clips",
        headers=headers(uid_b, email_b, lib_ws),
        timeout=10,
    ).status_code
    record("B accesses workspace via membership JWT", code == 200, str(code))

    # Seed workspace clip by A
    db = SessionLocal()
    try:
        wclip = Clip(
            library_id=lib_ws,
            uploaded_by_user_id=uid_a,
            title="workspace-shared-clip",
            description="",
            blob_url="https://example.test/w.mp4",
            file_size=1,
        )
        db.add(wclip)
        db.commit()
        db.refresh(wclip)
        wid = wclip.id
    finally:
        db.close()

    for uid, email, label in [(uid_a, email_a, "A"), (uid_b, email_b, "B")]:
        r = requests.get(f"{BASE}/clips", headers=headers(uid, email, lib_ws), timeout=10)
        ok = r.status_code == 200 and any(c["id"] == wid for c in r.json()["clips"])
        record(f"{label} sees workspace clip", ok, str(r.status_code))

    # Second workspace owned by B only
    ws2 = requests.post(
        f"{BASE}/workspaces",
        headers=headers(uid_b, email_b),
        json={"name": f"Private B Space {uuid.uuid4().hex[:6]}"},
        timeout=10,
    )
    lib_ws2 = ws2.json()["library_id"]
    code = requests.get(
        f"{BASE}/clips",
        headers=headers(uid_a, email_a, lib_ws2),
        timeout=10,
    ).status_code
    record("A cannot access Workspace B library", code == 403, str(code))

    db = SessionLocal()
    try:
        secret = Clip(
            library_id=lib_ws2,
            uploaded_by_user_id=uid_b,
            title="secret-ws-b-only",
            description="",
            blob_url="https://example.test/s.mp4",
            file_size=1,
        )
        db.add(secret)
        db.commit()
        db.refresh(secret)
        secret_id = secret.id
    finally:
        db.close()

    leak = requests.get(
        f"{BASE}/clips/search",
        params={"q": "secret-ws-b-only"},
        headers=headers(uid_a, email_a, lib_ws),
        timeout=10,
    )
    record(
        "Search cannot leak Workspace B clip",
        leak.status_code == 200 and all(c["id"] != secret_id for c in leak.json()["clips"]),
        str([c["id"] for c in leak.json().get("clips", [])]),
    )

    code = requests.put(
        f"{BASE}/clips/{secret_id}",
        headers=headers(uid_a, email_a, lib_ws),
        json={"title": "x", "description": "", "category": ""},
        timeout=10,
    ).status_code
    record("Update cannot mutate other library clip", code == 404, str(code))

    # Legacy
    db = SessionLocal()
    try:
        legacy = db.query(Library).filter(Library.type == "legacy").first()
        record("Legacy library exists", legacy is not None)
        if legacy:
            legacy_id = legacy.id
            clip_count = db.query(Clip).filter(Clip.library_id == legacy_id).count()
            null_uploaders = (
                db.query(Clip)
                .filter(Clip.library_id == legacy_id, Clip.uploaded_by_user_id.is_(None))
                .count()
            )
            record("Legacy has ~150 clips", clip_count >= 150, str(clip_count))
            record(
                "Legacy clips have null uploaded_by",
                null_uploaders == clip_count,
                f"{null_uploaders}/{clip_count}",
            )
            claimed = (
                db.query(Clip)
                .filter(Clip.library_id == personal_a["id"], Clip.id.in_(
                    [c.id for c in db.query(Clip.id).filter(Clip.library_id == legacy_id).limit(5)]
                ))
                .count()
            )
            # simpler: personal shouldn't contain legacy ids
            personal_ids = {c.id for c in db.query(Clip).filter(Clip.library_id == personal_a["id"])}
            legacy_ids = {c.id for c in db.query(Clip).filter(Clip.library_id == legacy_id).limit(20)}
            record(
                "Legacy clips not in personal library",
                personal_ids.isdisjoint(legacy_ids),
            )

            libs_a = requests.get(f"{BASE}/me", headers=headers(uid_a, email_a), timeout=10).json()[
                "libraries"
            ]
            has_legacy = any(l["type"] == "legacy" for l in libs_a)
            if str(LEGACY_FLAG).lower() in {"1", "true", "yes", "on"}:
                record("Legacy appears in switcher when flag=1", has_legacy)
                code = requests.get(
                    f"{BASE}/clips",
                    headers=headers(uid_a, email_a, legacy_id),
                    timeout=10,
                ).status_code
                record("Legacy accessible when flag=1", code == 200, str(code))
            else:
                record("Legacy hidden when flag=0", not has_legacy)
                code = requests.get(
                    f"{BASE}/clips",
                    headers=headers(uid_a, email_a, legacy_id),
                    timeout=10,
                ).status_code
                record("Legacy inaccessible when flag=0", code == 403, str(code))
    finally:
        db.close()

    # Role: member cannot regen join code
    code = requests.post(
        f"{BASE}/workspaces/{ws_id}/join-code/regenerate",
        headers=headers(uid_b, email_b, lib_ws),
        timeout=10,
    ).status_code
    record("Member cannot regenerate join code", code == 403, str(code))

    # Invalid library id
    code = requests.get(
        f"{BASE}/clips",
        headers=headers(uid_a, email_a, 99999999),
        timeout=10,
    ).status_code
    record("Nonexistent X-Library-Id → 403", code == 403, str(code))

    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    print(f"\nAPI verification: {passed} passed, {failed} failed, {len(results)} total")
    print(f"LEGACY_FLAG_ENV={LEGACY_FLAG!r} (value not a secret)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
