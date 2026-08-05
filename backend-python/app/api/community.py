"""커뮤니티 — 공지·Q&A·FAQ. 최소 메뉴(모든 역할)라 조회에 권한을 걸지 않는다.

쓰기 권한(커뮤니티 생성)은 본개발에서 인증이 붙을 때 함께 건다 — 지금 사용자는
Super Admin 고정이라 검사할 대상이 없다(검사 자리만 주석으로 남긴다).
"""

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from app import db
from app.api.me import ME

router = APIRouter()


def today() -> str:
    return datetime.now().strftime("%Y.%m.%d")


# ── 공지 ────────────────────────────────────────────────────────────
@router.get("/notices")
def notices() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute("SELECT json FROM notices ORDER BY id DESC").fetchall()
    return [json.loads(r["json"]) for r in rows]


@router.post("/notices")
def create_notice(body: dict[str, Any]) -> dict[str, Any]:
    # TODO(인증 확정 시): 커뮤니티 '생성' 권한 검사
    with db.connect() as conn:
        count = conn.execute("SELECT COUNT(*) c FROM notices").fetchone()["c"]
        notice = {
            "id": f"N-{count + 100:03d}",
            "title": str(body.get("title") or "").strip(),
            "category": body.get("category") or "시스템",
            "author": ME["name"],
            "date": today(),
            "views": 0,
            "pinned": bool(body.get("pinned")),
            "body": [p for p in (body.get("body") or "").split("\n") if p.strip()],
        }
        if not notice["title"]:
            raise HTTPException(status_code=400, detail="제목을 입력해 주세요.")
        conn.execute(
            "INSERT INTO notices(id, json, created_at) VALUES(?,?,?)",
            (notice["id"], json.dumps(notice, ensure_ascii=False), datetime.now().isoformat()),
        )
    return notice


# ── Q&A ─────────────────────────────────────────────────────────────
@router.get("/questions")
def questions() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute("SELECT json FROM questions ORDER BY id DESC").fetchall()
    return [json.loads(r["json"]) for r in rows]


@router.post("/questions")
def create_question(body: dict[str, Any]) -> dict[str, Any]:
    with db.connect() as conn:
        count = conn.execute("SELECT COUNT(*) c FROM questions").fetchone()["c"]
        question = {
            "id": f"Q-{count + 100:03d}",
            "title": str(body.get("title") or "").strip(),
            "category": body.get("category") or "기타",
            "author": ME["name"],
            "date": today(),
            "body": str(body.get("body") or "").strip(),
            "answers": [],
        }
        if not question["title"]:
            raise HTTPException(status_code=400, detail="제목을 입력해 주세요.")
        conn.execute(
            "INSERT INTO questions(id, json, created_at) VALUES(?,?,?)",
            (question["id"], json.dumps(question, ensure_ascii=False), datetime.now().isoformat()),
        )
    return question


@router.post("/questions/{qid}/answers")
def add_answer(qid: str, body: dict[str, Any]) -> dict[str, Any]:
    text = str(body.get("body") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="답변 내용을 입력해 주세요.")
    with db.connect() as conn:
        row = conn.execute("SELECT json FROM questions WHERE id = ?", (qid,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="질문이 없습니다.")
        question = json.loads(row["json"])
        question["answers"].append(
            {"author": ME["name"], "role": "Super Admin", "date": today(), "body": text}
        )
        conn.execute(
            "UPDATE questions SET json = ? WHERE id = ?",
            (json.dumps(question, ensure_ascii=False), qid),
        )
    return question


# ── FAQ ─────────────────────────────────────────────────────────────
@router.get("/faqs")
def faqs() -> list[dict[str, Any]]:
    return db.kv_get("faqs") or []


@router.post("/faqs")
def create_faq(body: dict[str, Any]) -> dict[str, Any]:
    items = db.kv_get("faqs") or []
    faq = {
        "id": f"F-{len(items) + 1:02d}",
        "category": body.get("category") or "계정·권한",
        "q": str(body.get("q") or "").strip(),
        "a": str(body.get("a") or "").strip(),
        "helpful": 0,
    }
    if not faq["q"] or not faq["a"]:
        raise HTTPException(status_code=400, detail="질문과 답변을 모두 입력해 주세요.")
    db.kv_put("faqs", [*items, faq])
    return faq


@router.post("/faqs/{fid}/helpful")
def mark_helpful(fid: str) -> dict[str, Any]:
    items = db.kv_get("faqs") or []
    updated = [({**f, "helpful": f["helpful"] + 1} if f["id"] == fid else f) for f in items]
    if updated == items:
        raise HTTPException(status_code=404, detail="FAQ 가 없습니다.")
    db.kv_put("faqs", updated)
    return next(f for f in updated if f["id"] == fid)


# ── 새 기능 (whatsnew — 규약 19절 정본) ──────────────────────────────
@router.get("/whatsnew")
def whatsnew() -> list[dict[str, Any]]:
    return db.kv_get("whatsnew") or []
