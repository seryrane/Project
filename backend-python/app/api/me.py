"""내 정보 파생 API — 메뉴·기능·권한은 전부 역할 정본에서 파생된다.

로그인(약식 토큰)이 있으면 그 사용자, 없으면 김현대(u-01) — 소프트 게이트:
SSO·게이트 정책이 미확정이라 시연이 로그인 없이도 돌아야 한다.
프런트가 권한을 다시 판단하지 않도록 서버가 걸러서 준다 — docs/RBAC_설계노트.md 2절.
"""

from typing import Any

from fastapi import APIRouter, Header

from app import db
from app.api.auth import member_from_token, public_user

router = APIRouter()

# 로그인 전 기본 사용자 (SSO 확정 전 시연용)
ME = {"id": "u-01", "name": "김현대", "email": "hyundae.kim@hmg.com",
      "title": "시스템 관리자", "gradeKey": "super"}


def current_user(authorization: str | None) -> dict[str, Any]:
    member = member_from_token(authorization)
    if member is not None:
        user = public_user(member)
    else:
        roles = db.kv_get("roles") or []
        role = next(r for r in roles if r["key"] == ME["gradeKey"])
        user = {**ME, "gradeName": role["name"]}
    # 언어·포인트 색상은 사람마다 고른다 (규약 §4-1) — 사용자 설정 정본
    user["locale"] = db.kv_get(f"locale:{user['id']}") or "ko"
    user["accent"] = db.kv_get(f"accent:{user['id']}") or "violet"
    return user


def role_of(user: dict[str, Any]) -> dict[str, Any]:
    roles = db.kv_get("roles") or []
    return next(r for r in roles if r["key"] == user["gradeKey"])


@router.get("/me")
def me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return current_user(authorization)


@router.get("/me/menu")
def my_menu(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    """LNB — 권한 없는 항목은 아예 안 내려간다(눌러서 '권한 없음'은 나쁜 화면).
    requires 가 없는 항목은 최소 메뉴 — 모든 역할에 보인다. 빈 섹션은 안 내려간다."""
    nav = db.kv_get("nav") or []
    requires = db.kv_get("nav_requires") or {}
    matrix = role_of(current_user(authorization))["matrix"]

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
def my_features(authorization: str | None = Header(default=None)) -> list[str]:
    """대시보드 위젯 프리셋 파생용 — 역할에 기능이 붙고 떨어지면 프리셋도 따라간다."""
    return role_of(current_user(authorization))["features"]


@router.get("/me/abilities")
def my_abilities(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """내가 할 수 있는 것 — 권한은 말없이 붙으므로 받은 본인이 확인할 자리."""
    role = role_of(current_user(authorization))
    return {
        "roles": [role["name"]],
        "menus": [
            {"menu": menu, "actions": actions, "scope": role.get("scope", {}).get(menu, "all")}
            for menu, actions in role["matrix"].items()
            if actions
        ],
    }


@router.put("/me/locale")
def put_locale(body: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, str]:
    """언어 설정 — 사람마다(조직 단위로 묶으면 그 사람만 못 바꾼다, 규약 §4-1)."""
    locale = body.get("locale")
    if locale not in ("ko", "en"):
        locale = "ko"
    user = current_user(authorization)
    db.kv_put(f"locale:{user['id']}", locale)
    return {"status": "ok"}


@router.put("/me/accent")
def put_accent(body: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, str]:
    """포인트 색상 — 개인 설정. 선택지 정본은 프런트 lib/accent.ts 와 1:1."""
    accent = body.get("accent")
    if accent not in ("violet", "blue", "teal", "green", "amber", "rose"):
        accent = "violet"
    user = current_user(authorization)
    db.kv_put(f"accent:{user['id']}", accent)
    return {"status": "ok"}


@router.get("/me/dashboard-layout")
def get_layout(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """위젯 배치 — 계정 단위 저장(브라우저 저장의 '다른 PC 에서 초기화' 문제를 푼다)."""
    user = current_user(authorization)
    return {"layout": db.kv_get(f"layout:{user['id']}")}


@router.put("/me/dashboard-layout")
def put_layout(body: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, str]:
    user = current_user(authorization)
    db.kv_put(f"layout:{user['id']}", body.get("layout") or [])
    return {"status": "ok"}
