"""내 정보 파생 API — 메뉴·기능·권한은 전부 역할 정본에서 파생된다.

⚠ 인증(HMG-SSO)은 미확정이라 사용자를 김현대(u-01, Super Admin)로 고정한다.
   판단 구조(파생)는 그대로 두고, SSO 확정 시 사용자 식별만 갈아끼운다.
프런트가 권한을 다시 판단하지 않도록 서버가 걸러서 준다 — docs/RBAC_설계노트.md 2절.
"""

from typing import Any

from fastapi import APIRouter

from app import db

router = APIRouter()

ME = {"id": "u-01", "name": "김현대", "email": "hyundae.kim@hmg.com",
      "title": "시스템 관리자", "gradeKey": "super"}


def my_role() -> dict[str, Any]:
    roles = db.kv_get("roles") or []
    return next(r for r in roles if r["key"] == ME["gradeKey"])


@router.get("/me")
def me() -> dict[str, Any]:
    role = my_role()
    return {**ME, "gradeName": role["name"]}


@router.get("/me/menu")
def my_menu() -> list[dict[str, Any]]:
    """LNB — 권한 없는 항목은 아예 안 내려간다(눌러서 '권한 없음'은 나쁜 화면).
    requires 가 없는 항목은 최소 메뉴 — 모든 역할에 보인다. 빈 섹션은 안 내려간다."""
    nav = db.kv_get("nav") or []
    requires = db.kv_get("nav_requires") or {}
    matrix = my_role()["matrix"]

    sections = []
    for section in nav:
        items = [
            item for item in section["items"]
            if item["key"] not in requires or "조회" in matrix.get(requires[item["key"]], [])
        ]
        if items:
            sections.append({**section, "items": items})
    return sections


@router.get("/me/features")
def my_features() -> list[str]:
    """대시보드 위젯 프리셋 파생용 — 역할에 기능이 붙고 떨어지면 프리셋도 따라간다."""
    return my_role()["features"]


@router.get("/me/abilities")
def my_abilities() -> dict[str, Any]:
    """내가 할 수 있는 것 — 권한은 말없이 붙으므로 받은 본인이 확인할 자리."""
    role = my_role()
    return {
        "roles": [role["name"]],
        "menus": [
            {"menu": menu, "actions": actions, "scope": role["scope"].get(menu, "all")}
            for menu, actions in role["matrix"].items()
            if actions
        ],
    }


@router.get("/me/dashboard-layout")
def get_layout() -> dict[str, Any]:
    """위젯 배치 — 계정 단위 저장(브라우저 저장의 '다른 PC 에서 초기화' 문제를 푼다)."""
    layout = db.kv_get(f"layout:{ME['id']}")
    return {"layout": layout}


@router.put("/me/dashboard-layout")
def put_layout(body: dict[str, Any]) -> dict[str, str]:
    db.kv_put(f"layout:{ME['id']}", body.get("layout") or [])
    return {"status": "ok"}
