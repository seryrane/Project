"""Tableau 임베딩 워크북 정본 — 1차 오픈 전략(임베딩 선행)의 등록부.

회의록: "태블로 대시보드는 임베드 링크 따서 아이프레임으로 임베딩만 하면 된다"
→ 관리자가 URL 을 등록하면 화면이 그 워크북을 표출한다(코드 배포 없이 편입 —
메뉴 요구의 "동적 URL 등록"과 같은 원칙).
⚠ SSO(Connected App/Trusted Ticket) 확정 전이라 공개 링크·티켓 링크만 유효하다.
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter()


@router.get("/embeds")
def embeds() -> list[dict[str, Any]]:
    return db.kv_get("embeds") or []


@router.put("/embeds")
def put_embeds(body: dict[str, Any]) -> dict[str, str]:
    """통째로 저장 — 부분 갱신이 실패하면 반쯤 바뀐 등록부가 남는다."""
    items = body.get("items")
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items 목록이 필요합니다.")
    for item in items:
        url = str(item.get("url") or "")
        if not url.startswith("https://"):
            raise HTTPException(status_code=400, detail="워크북 주소는 https 로 시작해야 합니다.")
    db.kv_put("embeds", items)
    return {"status": "ok"}
