"""챗봇 표준 질의 스모크 — 정본: docs/챗봇_표준질의_설계.md.

파싱은 결정적이어야 하므로 app.ask 의 순수 함수를 직접 부르는 테스트와, 권한·엔드포인트
계약은 실제 HTTP 요청으로 확인하는 테스트를 섞는다(app/api/ask.py 는 재료만 모아 넘길 뿐이라
직접 테스트할 로직이 거의 없다).
"""

from fastapi.testclient import TestClient

from app import ask, seeds
from app.main import app

client = TestClient(app)


# ── ① 기간 파싱 5종 (설계 문서 3절) ───────────────────────────────────────
def test_period_parsing_five_kinds() -> None:
    now = (2026, 8)

    assert ask.parse_period("상반기 실적 보여줘", now) == {"found": True, "start": "2026-01", "end": "2026-06"}
    assert ask.parse_period("2분기 검증 처리량", now) == {"found": True, "start": "2026-04", "end": "2026-06"}
    assert ask.parse_period("최근 6개월 검증 처리량", now) == {"found": True, "start": "2026-03", "end": "2026-08"}
    assert ask.parse_period("2025년 검증 처리량", now) == {"found": True, "start": "2025-01", "end": "2025-12"}
    assert ask.parse_period("다음 달 검증 처리량", now) == {"found": True, "start": "2026-09", "end": "2026-09"}


# ── ② 지표 낱말 우선순위 — 기능 찾기를 먼저 본다 ───────────────────────────
def test_howto_beats_spec_keyword() -> None:
    parsed = ask.parse("사양서 어디서 등록하나요", (2026, 8))
    assert parsed["metric"] == "howto"
    assert parsed["metric_found"] is True  # 문자열이 아니라 구조(불리언)로 나른다


def test_period_word_is_not_a_metric_word() -> None:
    """'이번 주 검증'이 기간 낱말('이번 주') 때문에 엉뚱한 지표(내 할 일)로 잡히면 안 된다."""
    parsed = ask.parse("이번 주 검증 오류 몇 건이야", (2026, 8))
    assert parsed["metric"] == "validation.error"


# ── ③ 못 알아들으면 notes 가 찬다 ──────────────────────────────────────────
def test_unparseable_question_defaults_and_notes() -> None:
    parsed = ask.parse("오늘 날씨 어때?", (2026, 8))
    assert parsed["metric"] == "my.todo"
    assert parsed["metric_found"] is False

    data = {"specs": [], "approvals": [], "monthly": [], "kpi": [], "todo": [], "nav": []}
    res = ask.answer(parsed, data, "ko")
    assert res["notes"], "못 알아들었으면 notes 가 비어 있으면 안 된다"


# ── ④ 카탈로그가 권한으로 걸러진다 ──────────────────────────────────────────
def _viewer_headers() -> dict[str, str]:
    """한동현(u-05, Viewer, FIDO 등록) — daeun.jung 처럼 다른 테스트가 잠그는 계정이 아니다."""
    first = client.post("/api/auth/login", json={"id": "donghyun.han", "password": "hmg1234!"}).json()
    assert first["step"] == "fido"
    done = client.post("/api/auth/fido", json={"ticket": first["ticket"]}).json()
    return {"Authorization": f"Bearer {done['token']}"}


def test_catalog_filtered_by_role() -> None:
    headers = _viewer_headers()
    keys = [c["key"] for c in client.get("/api/ask/catalog?locale=ko", headers=headers).json()["categories"]]
    assert "mine" in keys and "howto" in keys
    # Viewer 는 검증엔진 조회 권한이 없다 — validation 카테고리가 아예 안 내려간다
    assert "validation" not in keys

    # 기본 사용자(토큰 없음) = Super Admin — 전 카테고리가 보인다
    admin_keys = [c["key"] for c in client.get("/api/ask/catalog?locale=ko").json()["categories"]]
    assert "validation" in admin_keys and "kpi" in admin_keys


# ── ⑤ 권한 없는 질의는 200 이면서 headline 이 그 사실을 말한다 ──────────────
def test_no_permission_question_declines_without_error() -> None:
    headers = _viewer_headers()
    res = client.post("/api/ask", json={"question": "검증 처리량", "locale": "ko"}, headers=headers)
    assert res.status_code == 200  # 403 이 아니다 — 사람은 에러를 고장으로 읽는다
    body = res.json()
    assert body["points"] == [] and body["items"] == []
    assert body["nextMenuKey"] is None
    assert "검증엔진" in body["headline"] and "권한" in body["headline"]


# ── ⑥ 값이 0 일 때 "자료가 없다"고 말한다 ──────────────────────────────────
def test_zero_value_is_not_read_as_calm() -> None:
    """실제 시계에 기대지 않도록 ask.answer 를 직접 부른다 — 시드 범위 밖(2099-01)을 묻는다."""
    parsed = {
        "metric": "validation.volume", "metric_found": True, "question": "먼 미래 검증 처리량",
        "period": {"found": True, "start": "2099-01", "end": "2099-01"},
    }
    data = {"specs": [], "approvals": [], "monthly": seeds.CHATBOT_VALIDATION_MONTHLY,
            "kpi": [], "todo": [], "nav": []}
    res = ask.answer(parsed, data, "ko")
    assert res["total"] == 0
    assert "없습니다" in res["headline"]  # "0건" 으로 조용히 답하지 않는다


# ── ⑦ 응답에 계약의 키가 전부 있다 ─────────────────────────────────────────
def test_answer_has_every_contract_key() -> None:
    res = client.post("/api/ask", json={"question": "사양서 현황", "locale": "ko"})
    body = res.json()
    for key in ["understood", "notes", "unit", "total", "points", "items",
                "headline", "evidence", "anomalies", "nextStep", "nextMenuKey", "followUps"]:
        assert key in body


# ── 그 밖의 회귀 — 시드가 설계 문서 예시와 맞는지 ───────────────────────────
def test_spec_status_counts_the_four_states() -> None:
    res = client.post("/api/ask", json={"question": "사양서 현황", "locale": "ko"}).json()
    assert res["total"] == 4
    assert {p["label"]: p["value"] for p in res["points"]} == {
        "초안": 1, "검토 중": 1, "승인 대기": 1, "배포 완료": 1,
    }
    assert res["nextMenuKey"] == "specs"


def test_approval_pending_lists_four_items() -> None:
    res = client.post("/api/ask", json={"question": "승인 대기 목록", "locale": "ko"}).json()
    assert len(res["items"]) == 4
    assert res["nextMenuKey"] == "approvals"


def test_validation_volume_recent_six_months_matches_design_doc_example() -> None:
    """설계 문서 4절 예시(합계 3.8M건 · 월 평균 634K건 · 최다월 2026-05 · 2026-04 이상치)와 맞춘 시드.

    실제 서버 시계가 아니라 고정 now 로 ask.parse/ask.answer 를 직접 불러 — 테스트가
    실행되는 실제 날짜(월)에 따라 결과가 흔들리면 안 된다(POST /api/ask 라우터 자체는
    실제 datetime.now() 를 쓰는 게 맞다 — 운영에서는 "오늘"이 계속 바뀌어야 하니까).
    """
    parsed = ask.parse("최근 6개월 검증 처리량", (2026, 8))
    data = {"specs": [], "approvals": [], "monthly": seeds.CHATBOT_VALIDATION_MONTHLY,
            "kpi": [], "todo": [], "nav": []}
    res = ask.answer(parsed, data, "ko")
    assert res["total"] == 3_804_000
    assert "3.8M" in res["headline"] and "634K" in res["headline"]
    assert any("2026-05" in e for e in res["evidence"])
    assert any("2026-04" in a for a in res["anomalies"])
    assert res["notes"] == []  # "최근 6개월"은 찾은 기간이라 못 찾음 notes 가 없어야 한다


def test_english_locale_keeps_data_values_untranslated() -> None:
    """상태값·이름은 데이터라 en 로케일에서도 번역하지 않는다(설계 문서 5절)."""
    res = client.post("/api/ask", json={"question": "spec status", "locale": "en"}).json()
    labels = {p["label"] for p in res["points"]}
    assert labels == {"초안", "검토 중", "승인 대기", "배포 완료"}
    assert "승인 대기" in res["headline"]  # 헤드라인 문장은 en 이어도 상태값 토큰은 한글 그대로


def test_howto_resolves_to_nav_key() -> None:
    res = client.post("/api/ask", json={"question": "사양서 어디서 등록해?", "locale": "ko"}).json()
    assert res["nextMenuKey"] == "specs"
    assert res["items"]
