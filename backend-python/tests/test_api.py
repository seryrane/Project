"""공통 기능 API 스모크 — 파생이 정말 파생인지, 접수가 정말 막는지."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_me_and_derivations() -> None:
    me = client.get("/api/me").json()
    assert me["name"] == "김현대"
    assert me["gradeName"] == "Super Admin"

    # 메뉴는 권한의 파생물 — Super Admin 은 전 섹션이 보인다
    menu = client.get("/api/me/menu").json()
    keys = [item["key"] for section in menu for item in section["items"]]
    assert "privacy" in keys and "roles" in keys
    # 최소 메뉴는 requires 없이 내려온다
    assert "guide" in keys and "faq" in keys

    features = client.get("/api/me/features").json()
    assert "community.read" in features

    abilities = client.get("/api/me/abilities").json()
    assert abilities["roles"] == ["Super Admin"]


def test_dashboard_layout_roundtrip() -> None:
    layout = [{"id": "kpi", "size": 3}, {"id": "notice", "size": 1}]
    assert client.put("/api/me/dashboard-layout", json={"layout": layout}).status_code == 200
    assert client.get("/api/me/dashboard-layout").json()["layout"] == layout


def test_notice_create_appends() -> None:
    before = len(client.get("/api/notices").json())
    created = client.post(
        "/api/notices", json={"title": "테스트 공지", "category": "시스템", "body": "본문"}
    ).json()
    assert created["author"] == "김현대"
    assert len(client.get("/api/notices").json()) == before + 1
    # 제목 없는 등록은 거절 — 빈 정본을 만들지 않는다
    assert client.post("/api/notices", json={"title": " "}).status_code == 400


def test_answer_appends_to_question() -> None:
    updated = client.post("/api/questions/Q-108/answers", json={"body": "테스트 답변"}).json()
    assert updated["answers"][-1]["body"] == "테스트 답변"
    assert updated["answers"][-1]["author"] == "김현대"


def test_faq_helpful_counts_up() -> None:
    first = client.get("/api/faqs").json()[0]
    bumped = client.post(f"/api/faqs/{first['id']}/helpful").json()
    assert bumped["helpful"] == first["helpful"] + 1


def test_member_lock_toggle_and_audit() -> None:
    members = client.get("/api/members").json()
    locked = next(m for m in members if m["status"] == "잠금")
    toggled = client.post(f"/api/members/{locked['id']}/lock-toggle").json()
    assert toggled["status"] == "활성"
    # 되돌린다 (테스트가 정본을 어지럽히지 않게)
    client.post(f"/api/members/{locked['id']}/lock-toggle")
    # 잠금 처리 전 건이 감사 로그에 남는다 — 화면이 아니라 서버가 남긴다
    audit = client.get("/api/audit").json()
    assert any(locked["name"] in a["target"] for a in audit)


def test_self_lock_submission_rejected() -> None:
    """자기 잠금 방지는 서버가 최종으로 막는다 — 화면 검사는 한 브라우저 안의 약속."""
    res = client.post(
        "/api/submissions",
        json={
            "kind": "role-change",
            "payload": {"roleKey": "super", "matrix": {"권한 관리": ["조회"]}},
        },
    )
    assert res.status_code == 409

    ok = client.post(
        "/api/submissions",
        json={
            "kind": "role-change",
            "payload": {"roleKey": "super", "matrix": {"권한 관리": ["조회", "수정"]}},
        },
    )
    assert ok.json()["status"] == "접수"
