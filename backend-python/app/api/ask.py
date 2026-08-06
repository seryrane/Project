"""표준 질의 챗봇 라우터 — 로그인 사용자·권한·시드 재료를 모아 app/ask.py(순수 함수)에 건넨다.

정본: docs/챗봇_표준질의_설계.md. 숫자를 세거나 문장을 짓는 로직은 전부 app/ask.py 에 있다 —
여기서는 그 함수가 필요로 하는 재료(권한 매트릭스·시드·로케일)를 모으기만 한다.

⚠ 권한 없는 질의도 403 이 아니라 200 으로 돌려준다 — 에러로 내보내면 사람은 고장으로 읽는다
  (설계 문서 1절). has_permission() 이 막으면 ask.decline() 이 답의 칸에 그 사실을 적어 준다.
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header

from app import ask, db
from app.api.me import current_user, role_of

router = APIRouter()


def _locale(body_locale: str | None, user: dict[str, Any]) -> str:
    """locale 파라미터 → 없으면 사용자 설정(/me 의 locale) → 그것도 없으면 ko(설계 문서 1절 계약)."""
    if body_locale in ("ko", "en"):
        return body_locale
    return user.get("locale") or "ko"


@router.get("/ask/catalog")
def get_catalog(locale: str | None = None, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    matrix = role_of(user)["matrix"]
    return ask.catalog(matrix, _locale(locale, user))


@router.post("/ask")
def post_ask(body: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    matrix = role_of(user)["matrix"]
    loc = _locale(body.get("locale"), user)
    question = str(body.get("question") or "")

    now = datetime.now(UTC)
    parsed = ask.parse(question, (now.year, now.month))

    if not ask.has_permission(matrix, parsed["metric"]):
        return ask.decline(parsed, loc)

    # 챗봇이 셀 재료 — 사양서·검증엔진 CRUD 가 아직 없어 시드를 센다.
    # 본개발에서 실제 API 로 교체(설계 문서 6절 "다음에 할 것").
    data = {
        "specs": db.kv_get("chatbot_spec_summary") or [],
        "approvals": db.kv_get("chatbot_approval_queue") or [],
        "monthly": db.kv_get("chatbot_validation_monthly") or [],
        "kpi": db.kv_get("chatbot_kpi_metrics") or [],
        "todo": db.kv_get("chatbot_my_todo") or [],
        "nav": db.kv_get("nav") or [],
    }
    return ask.answer(parsed, data, loc)
