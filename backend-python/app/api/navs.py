"""메뉴 라벨 API — 영문명은 관리자가 메뉴 관리 화면에서 넣는다.

nav 구조 자체는 코드 정본(시드가 기동 때마다 덮음)이라, 여기서 고친 labelEn 도
재기동 전까지만 산다 — 프로토타입 한정. 본개발에서 nav 가 DB 정본이 되면
이 제약은 사라진다.
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from app import db

router = APIRouter()


@router.put("/nav/label")
def put_label(body: dict[str, Any]) -> dict[str, str]:
    key = body.get("key")
    label_en = (body.get("labelEn") or "").strip()
    nav = db.kv_get("nav") or []
    found = False
    for section in nav:
        for item in section["items"]:
            if item["key"] == key:
                # 비우면 지운다 — EN 화면은 기본 번역(사전)으로 돌아간다
                if label_en:
                    item["labelEn"] = label_en
                else:
                    item.pop("labelEn", None)
                found = True
    if not found:
        raise HTTPException(status_code=404, detail="unknown menu key")
    db.kv_put("nav", nav)
    return {"status": "ok"}
