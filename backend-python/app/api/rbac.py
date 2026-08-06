"""RBAC 정본 조회 + 상신 접수.

⚠ 역할 변경을 즉시 반영하는 API 는 일부러 없다 — 권한 변경은 결재를 거친다는
화면 원칙과 같고, 결재 엔진은 미확정이라 **접수 사실만** 정직하게 남긴다.
접수함(submissions)은 결재가 확정되면 그 입구로 흘려 보낸다.
"""

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from app import db
from app.api.me import current_user

router = APIRouter()


@router.get("/roles")
def roles() -> list[dict[str, Any]]:
    return db.kv_get("roles") or []


@router.post("/submissions")
def submit(body: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """변경 상신 접수 — kind: role-change | member-exception | ...

    자기 잠금 방지는 서버가 최종으로 막는다(화면 검사는 한 브라우저 안의 약속).
    """
    kind = str(body.get("kind") or "").strip()
    if not kind:
        raise HTTPException(status_code=400, detail="상신 종류(kind)가 없습니다.")

    if kind == "role-change":
        payload = body.get("payload") or {}
        draft_matrix = payload.get("matrix") or {}
        role_key = payload.get("roleKey")
        all_roles = db.kv_get("roles") or []
        # [권한 관리 · 수정] 보유자가 0명이 되는 변경은 접수조차 하지 않는다
        others_manage = any(
            r["key"] != role_key and r["assigned"] > 0 and "수정" in r["matrix"].get("권한 관리", [])
            for r in all_roles
        )
        if not others_manage and "수정" not in draft_matrix.get("권한 관리", []):
            raise HTTPException(
                status_code=409,
                detail="[권한 관리·수정] 보유자가 0명이 됩니다 — 먼저 다른 역할에 부여하세요.",
            )

    with db.connect() as conn:
        cursor = conn.execute(
            "INSERT INTO submissions(kind, json, created_at) VALUES(?,?,?)",
            (
                kind,
                json.dumps({"by": current_user(authorization)["name"], **body}, ensure_ascii=False),
                datetime.now(UTC).isoformat(),
            ),
        )
        seq = cursor.lastrowid
    return {"status": "접수", "seq": seq}


@router.get("/submissions")
def submissions() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT seq, kind, json, created_at FROM submissions ORDER BY seq DESC"
        ).fetchall()
    return [
        {"seq": r["seq"], "kind": r["kind"], "createdAt": r["created_at"],
         **json.loads(r["json"])}
        for r in rows
    ]
