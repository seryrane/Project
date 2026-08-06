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


def test_login_direct_and_me_switches() -> None:
    """FIDO 미등록 계정은 바로 토큰 — /me 가 로그인 사용자로 바뀐다(메뉴 파생도 따라간다)."""
    res = client.post("/api/auth/login", json={"id": "seoyeon.lee", "password": "hmg1234!"}).json()
    assert res["step"] == "done"
    headers = {"Authorization": f"Bearer {res['token']}"}
    me = client.get("/api/me", headers=headers).json()
    assert me["name"] == "이서연" and me["gradeKey"] == "editor"
    # Editor 는 회원/권한/메뉴 관리가 메뉴에서 아예 빠진다 — 메뉴는 권한의 파생물
    menu = client.get("/api/me/menu", headers=headers).json()
    keys = [i["key"] for s in menu for i in s["items"]]
    assert "roles" not in keys and "members" not in keys and "specs" in keys


def test_login_fido_two_step() -> None:
    """FIDO 등록 계정은 티켓 → verify 를 거쳐야 토큰이 나온다(약식 2차)."""
    first = client.post("/api/auth/login", json={"id": "hyundae.kim", "password": "hmg1234!"}).json()
    assert first["step"] == "fido" and "token" not in first
    done = client.post("/api/auth/fido", json={"ticket": first["ticket"]}).json()
    assert done["step"] == "done" and done["user"]["name"] == "김현대"
    # 로그인 이력은 감사 로그에 남는다 (요구사항: 로그인 이력 5년 보관)
    audit = client.get("/api/audit").json()
    assert any(a["action"] == "로그인" and "김현대" in a["target"] for a in audit)


def test_login_five_fails_locks_account() -> None:
    for n in range(1, 5):
        res = client.post("/api/auth/login", json={"id": "daeun.jung", "password": "wrong"})
        assert res.status_code == 401
        assert f"({n}/5회" in res.json()["detail"]
    res = client.post("/api/auth/login", json={"id": "daeun.jung", "password": "wrong"})
    assert res.status_code == 423  # 5회째 — 잠금
    # 잠긴 계정은 맞는 비밀번호로도 못 들어온다
    res = client.post("/api/auth/login", json={"id": "daeun.jung", "password": "hmg1234!"})
    assert res.status_code == 423
    # 회원 정본에도 잠금이 반영된다 (회원 관리 화면과 같은 정본)
    members = client.get("/api/members").json()
    assert next(m for m in members if m["name"] == "정다은")["status"] == "잠금"


def test_forgot_same_answer_regardless() -> None:
    """계정 존재 여부를 노출하지 않는다 — 있든 없든 같은 답."""
    a = client.post("/api/auth/forgot", json={"email": "hyundae.kim@hmg.com"}).json()
    b = client.post("/api/auth/forgot", json={"email": "nobody@nowhere.com"}).json()
    assert a == b


def test_signup_receipt_and_duplicate() -> None:
    ok = client.post("/api/auth/signup", json={
        "name": "신규자", "email": "new.user@partner.com", "dept": "LG전자",
        "password": "hmg1234!",
    })
    assert ok.json()["status"] == "접수"
    dup = client.post("/api/auth/signup", json={
        "name": "김현대", "email": "hyundae.kim@hmg.com", "dept": "IT", "password": "hmg1234!",
    })
    assert dup.status_code == 409
    short = client.post("/api/auth/signup", json={
        "name": "짧은비번", "email": "short@x.com", "dept": "x", "password": "1234",
    })
    assert short.status_code == 400


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
