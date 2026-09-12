import re
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from models import Category, Clip, Person

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover
    from difflib import SequenceMatcher

    class fuzz:  # type: ignore
        @staticmethod
        def partial_ratio(a: str, b: str) -> float:
            if not a or not b:
                return 0.0
            return SequenceMatcher(None, a, b).ratio() * 100

        @staticmethod
        def token_set_ratio(a: str, b: str) -> float:
            if not a or not b:
                return 0.0
            ta = set(a.lower().split())
            tb = set(b.lower().split())
            if not ta or not tb:
                return SequenceMatcher(None, a, b).ratio() * 100
            inter = " ".join(sorted(ta & tb))
            union_a = " ".join(sorted(ta | tb))
            return SequenceMatcher(None, inter, union_a).ratio() * 100


TOKEN_RE = re.compile(r"[a-z0-9]+", re.I)


def _tokens(query: str) -> List[str]:
    return [t.lower() for t in TOKEN_RE.findall(query) if len(t) >= 2]


def _score_clip(clip: Clip, query: str, tokens: List[str]) -> float:
    title = (clip.title or "").lower()
    description = (clip.description or "").lower()
    filename = (clip.original_filename or "").lower()
    category = (clip.category_rel.name.lower() if clip.category_rel else "")
    people = [p.name.lower() for p in clip.people]
    location = (clip.location_label or "").lower()
    device = " ".join(
        p for p in [(clip.camera_make or "").lower(), (clip.camera_model or "").lower()] if p
    )
    q = query.lower().strip()

    if not q:
        return 0.0

    score = 0.0
    hard_hit = False

    if title == q:
        score += 240
        hard_hit = True
    elif title.startswith(q):
        score += 160
        hard_hit = True
    elif q in title:
        score += 130
        hard_hit = True

    title_partial = fuzz.partial_ratio(q, title)
    title_token = fuzz.token_set_ratio(q, title)
    if title_partial >= 78:
        score += title_partial * 1.1
        hard_hit = True
    if title_token >= 72:
        score += title_token * 0.85
        hard_hit = True

    matched_tokens = 0
    for token in tokens:
        title_words = title.split()
        if token in title_words or any(w.startswith(token) for w in title_words):
            score += 48
            matched_tokens += 1
            hard_hit = True
        elif token in title:
            score += 30
            matched_tokens += 1
            hard_hit = True

        if category and (token in category.split() or category.startswith(token) or token in category):
            score += 38
            matched_tokens += 1
            hard_hit = True

        for person in people:
            person_words = person.split()
            if token in person_words or person.startswith(token) or token in person:
                score += 44
                matched_tokens += 1
                hard_hit = True
                break

        if token in description:
            score += 16
            matched_tokens += 1
            hard_hit = True
        if token in filename:
            score += 18
            matched_tokens += 1
            hard_hit = True
        if location and token in location:
            score += 24
            matched_tokens += 1
            hard_hit = True
        if device and token in device:
            score += 20
            matched_tokens += 1
            hard_hit = True

        # Minor typo tolerance against title words only
        for word in title_words:
            if len(token) >= 4 and len(word) >= 4 and fuzz.partial_ratio(token, word) >= 82:
                score += 26
                matched_tokens += 1
                hard_hit = True
                break

    if tokens and matched_tokens == len(tokens):
        score += 40

    if not hard_hit:
        return 0.0

    return score


def _candidate_clips(db: Session, tokens: List[str], query: str) -> List[Clip]:
    if not tokens:
        return []

    clauses = []
    for token in tokens:
        pattern = f"%{token}%"
        clauses.append(
            or_(
                Clip.title.ilike(pattern),
                Clip.description.ilike(pattern),
                Clip.original_filename.ilike(pattern),
                Clip.camera_model.ilike(pattern),
                Clip.camera_make.ilike(pattern),
                Clip.location_label.ilike(pattern),
                Clip.metadata_json.ilike(pattern),
                Clip.mime_type.ilike(pattern),
                Category.name.ilike(pattern),
            )
        )

    token_clips = (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .outerjoin(Category, Clip.category_id == Category.id)
        .filter(or_(*clauses))
        .all()
    )

    people_clips = (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .join(Clip.people)
        .filter(or_(*[Person.name.ilike(f"%{token}%") for token in tokens]))
        .all()
    )

    by_id = {clip.id: clip for clip in token_clips}
    for clip in people_clips:
        by_id[clip.id] = clip
    return list(by_id.values())


def _typo_fallback_candidates(db: Session, query: str, tokens: List[str]) -> List[Clip]:
    """When SQL ILIKE misses (typos), scan recent titles with fuzzy matching only."""
    recent = (
        db.query(Clip)
        .options(joinedload(Clip.category_rel), joinedload(Clip.people))
        .order_by(Clip.uploaded_at.desc())
        .limit(800)
        .all()
    )
    hits = []
    for clip in recent:
        title = (clip.title or "").lower()
        if fuzz.partial_ratio(query.lower(), title) >= 78:
            hits.append(clip)
            continue
        for token in tokens:
            if len(token) < 4:
                continue
            if any(fuzz.partial_ratio(token, w) >= 84 for w in title.split() if len(w) >= 4):
                hits.append(clip)
                break
    return hits


def _apply_facet_filters(
    clips: List[Clip],
    *,
    person: Optional[str] = None,
    category: Optional[str] = None,
    device: Optional[str] = None,
    year: Optional[str] = None,
    location: Optional[str] = None,
    file_type: Optional[str] = None,
) -> List[Clip]:
    filtered = clips

    if person:
        p = person.lower()
        filtered = [
            c for c in filtered if any(p == person_obj.name.lower() for person_obj in c.people)
        ]

    if category:
        cat = category.lower()
        filtered = [
            c
            for c in filtered
            if c.category_rel and c.category_rel.name.lower() == cat
        ]

    if device:
        d = device.lower()
        filtered = [
            c
            for c in filtered
            if (c.camera_model and d in c.camera_model.lower())
            or (c.camera_make and d in c.camera_make.lower())
            or ((c.camera_model or c.camera_make or "").lower() == d)
        ]

    if year:
        filtered = [
            c
            for c in filtered
            if (c.recorded_at and str(c.recorded_at.year) == year)
            or (c.uploaded_at and str(c.uploaded_at.year) == year)
        ]

    if location:
        loc = location.lower()
        filtered = [
            c
            for c in filtered
            if (c.location_label and loc in c.location_label.lower())
            or (
                c.latitude is not None
                and c.longitude is not None
                and loc in f"{c.latitude:.4f}, {c.longitude:.4f}"
            )
        ]

    if file_type:
        ft = file_type.lower().lstrip(".")
        filtered = [
            c
            for c in filtered
            if (c.mime_type and ft in c.mime_type.lower())
            or (
                c.original_filename
                and "." in c.original_filename
                and c.original_filename.rsplit(".", 1)[-1].lower() == ft
            )
        ]

    return filtered


def _build_facets(clips: List[Clip]) -> Dict[str, List[str]]:
    people: Counter[str] = Counter()
    categories: Counter[str] = Counter()
    devices: Counter[str] = Counter()
    years: Counter[str] = Counter()
    locations: Counter[str] = Counter()
    file_types: Counter[str] = Counter()

    for clip in clips:
        for person in clip.people:
            people[person.name] += 1
        if clip.category_rel:
            categories[clip.category_rel.name] += 1

        device = clip.camera_model or clip.camera_make
        if device:
            devices[str(device)] += 1

        when = clip.recorded_at or clip.uploaded_at
        if when:
            years[str(when.year)] += 1

        if clip.location_label:
            locations[clip.location_label] += 1
        elif clip.latitude is not None and clip.longitude is not None:
            locations[f"{clip.latitude:.4f}, {clip.longitude:.4f}"] += 1

        if clip.mime_type and "/" in clip.mime_type:
            file_types[clip.mime_type.split("/")[-1]] += 1
        elif clip.original_filename and "." in clip.original_filename:
            file_types[clip.original_filename.rsplit(".", 1)[-1].lower()] += 1

    def top(counter: Counter[str], limit: int = 12) -> List[str]:
        return [name for name, _ in counter.most_common(limit)]

    facets = {
        "people": top(people),
        "categories": top(categories),
        "devices": top(devices),
        "years": sorted(top(years), reverse=True),
        "locations": top(locations),
        "file_types": top(file_types),
    }
    return {k: v for k, v in facets.items() if v}


def search_clips_ranked(
    db: Session,
    query: str,
    *,
    person: Optional[str] = None,
    category: Optional[str] = None,
    device: Optional[str] = None,
    year: Optional[str] = None,
    location: Optional[str] = None,
    file_type: Optional[str] = None,
    limit: int = 200,
) -> Tuple[List[Clip], Dict[str, Any]]:
    q = (query or "").strip()
    empty_facets: Dict[str, Any] = {}

    if not q and not any([person, category, device, year, location, file_type]):
        return [], empty_facets

    tokens = _tokens(q) if q else []
    if q and not tokens:
        tokens = [q.lower()]

    if q:
        candidates = _candidate_clips(db, tokens, q)
        if not candidates:
            candidates = _typo_fallback_candidates(db, q, tokens)
        scored = [(clip, _score_clip(clip, q, tokens)) for clip in candidates]
        scored = [(clip, score) for clip, score in scored if score >= 40]
        scored.sort(key=lambda item: item[1], reverse=True)
        ranked = [clip for clip, _ in scored[:limit]]
    else:
        ranked = (
            db.query(Clip)
            .options(joinedload(Clip.category_rel), joinedload(Clip.people))
            .order_by(Clip.uploaded_at.desc())
            .limit(limit)
            .all()
        )

    ranked = _apply_facet_filters(
        ranked,
        person=person,
        category=category,
        device=device,
        year=year,
        location=location,
        file_type=file_type,
    )

    # Facets from query-matched set before facet filters, then re-filter display
    # Recompute facets from final result so empty options disappear
    facets = _build_facets(ranked)
    return ranked, facets
