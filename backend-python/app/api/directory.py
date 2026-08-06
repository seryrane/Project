"""회원·감사 로그 — 목록성 데이터.

회원의 잠금/해제는 되돌릴 수 있으므로 즉시 반영한다(규약: 되돌릴 수 있는 것은
묻지 않는다). 권한 변경류는 결재가 미확정이라 상신 접수만 기록한다.
"""

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from app import db
from app.api.me import current_user

router = APIRouter()


@router.get("/members")
def members() -> list[dict[str, Any]]:
    return db.kv_get("members") or []


@router.post("/members/{mid}/lock-toggle")
def toggle_lock(mid: str, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    items = db.kv_get("members") or []
    target = next((m for m in items if m["id"] == mid), None)
    if target is None:
        raise HTTPException(status_code=404, detail="회원이 없습니다.")
    new_status = "활성" if target["status"] == "잠금" else "잠금"
    updated = [({**m, "status": new_status} if m["id"] == mid else m) for m in items]
    db.kv_put("members", updated)
    # 계정 잠금은 감사 대상 — 화면이 아니라 서버가 남긴다 (화면만 남기면 빠뜨린다)
    add_audit({"action": "열람" if new_status == "활성" else "마스킹 해제",
               "target": f"{target['name']} 계정 {new_status}",
               "reason": "회원 관리 화면에서 처리"},
              current_user(authorization)["name"])
    return next(m for m in updated if m["id"] == mid)


# ── 감사 로그 ────────────────────────────────────────────────────────
def add_audit(entry: dict[str, Any], user_name: str) -> None:
    record = {
        "at": datetime.now(UTC).strftime("%Y.%m.%d %H:%M"),
        "user": user_name,
        **entry,
    }
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO audit_log(json) VALUES(?)",
            (json.dumps(record, ensure_ascii=False),),
        )


@router.get("/audit")
def audit() -> list[dict[str, Any]]:
    with db.connect() as conn:
        rows = conn.execute("SELECT json FROM audit_log ORDER BY seq DESC").fetchall()
    return [json.loads(r["json"]) for r in rows]


@router.post("/audit")
def record_audit(body: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, str]:
    """다운로드 등 반출 행위를 화면이 알린다 — 사유는 필수(처리방침 제4조)."""
    if not str(body.get("reason") or "").strip():
        raise HTTPException(status_code=400, detail="사유를 입력해 주세요.")
    add_audit({
        "action": body.get("action") or "다운로드",
        "target": str(body.get("target") or ""),
        "reason": str(body.get("reason")),
    }, current_user(authorization)["name"])
    return {"status": "ok"}
