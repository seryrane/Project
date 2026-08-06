"""인증 — HMG-SSO(프로토콜 미정)·JWT 정책 확정 전의 약식 구현.

요구사항서에서 가져온 판단:
- 로그인 이력은 감사 로그에 남긴다(감사로그: 로그인 이력 5년 보관).
- 비밀번호 5회 오류 시 계정 잠금 — 회원 관리의 잠금과 같은 정본을 쓴다(FAQ 문구와 정합).
- FIDO 는 약식 2차 단계 — 등록 계정이면 티켓을 발급하고 verify 로 통과(사용자 지시: 약식).

⚠ 약식의 경계(본개발에서 교체): 비밀번호는 sha256+고정 salt(→ SSO 또는 argon2),
토큰은 서버 kv 세션(→ JWT Access/Refresh), 가입은 접수만(→ 결재선).
"""

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from app import db

router = APIRouter()

SALT = "hmg-proto"  # 약식 — 본개발에서 계정별 salt + argon2
DEMO_PASSWORD = "hmg1234!"  # 데모 계정 공통 비밀번호 (로그인 화면에 안내)
MAX_FAILS = 5

GRADE_TO_KEY = {"Super Admin": "super", "Admin": "admin", "Editor": "editor", "Viewer": "viewer"}


def hash_pw(password: str) -> str:
    return hashlib.sha256((SALT + password).encode()).hexdigest()


def find_member(login_id: str) -> dict[str, Any] | None:
    """이메일 전체 또는 @ 앞 아이디로 찾는다 — 사번 체계는 SSO 확정 전이라 없다."""
    members = db.kv_get("members") or []
    lid = login_id.strip().lower()
    for m in members:
        email = str(m["email"]).lower()
        if email == lid or email.split("@")[0] == lid:
            return m
    return None


def save_member(updated: dict[str, Any]) -> None:
    members = db.kv_get("members") or []
    db.kv_put("members", [updated if m["id"] == updated["id"] else m for m in members])


def audit(action: str, target: str, reason: str, user: str) -> None:
    import json

    record = {
        "at": datetime.now(UTC).strftime("%Y.%m.%d %H:%M"),
        "user": user,
        "action": action,
        "target": target,
        "reason": reason,
    }
    with db.connect() as conn:
        conn.execute("INSERT INTO audit_log(json) VALUES(?)", (json.dumps(record, ensure_ascii=False),))


def issue_token(member: dict[str, Any]) -> str:
    token = uuid.uuid4().hex
    db.kv_put(f"token:{token}", {"memberId": member["id"], "issuedAt": datetime.now(UTC).isoformat()})
    return token


def public_user(member: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": member["id"],
        "name": member["name"],
        "email": member["email"],
        "title": member["dept"],
        "gradeKey": GRADE_TO_KEY.get(member["grade"], "viewer"),
        "gradeName": member["grade"],
    }


def member_from_token(authorization: str | None) -> dict[str, Any] | None:
    """Authorization: Bearer <token> → 회원. 무효면 None (약식 — 소프트 게이트)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    session = db.kv_get(f"token:{authorization.removeprefix('Bearer ').strip()}")
    if not session:
        return None
    members = db.kv_get("members") or []
    return next((m for m in members if m["id"] == session["memberId"]), None)


@router.post("/auth/login")
def login(body: dict[str, Any]) -> dict[str, Any]:
    login_id = str(body.get("id") or "").strip()
    password = str(body.get("password") or "")
    member = find_member(login_id)

    # 존재하지 않는 계정도 같은 말로 답한다 — 계정 존재 여부를 노출하지 않는다
    generic = "이메일 또는 비밀번호가 올바르지 않습니다."
    if member is None:
        raise HTTPException(status_code=401, detail=generic)

    if member["status"] == "잠금":
        raise HTTPException(status_code=423, detail="계정이 잠겨 있습니다 — 관리자에게 잠금 해제를 요청하세요.")
    if member["status"] == "비활성":
        raise HTTPException(status_code=403, detail="비활성 계정입니다 — 관리자에게 활성화를 요청하세요.")

    fails_key = f"loginfails:{member['id']}"
    if hash_pw(password) != hash_pw(DEMO_PASSWORD):
        fails = (db.kv_get(fails_key) or 0) + 1
        db.kv_put(fails_key, fails)
        if fails >= MAX_FAILS:
            save_member({**member, "status": "잠금"})
            audit("마스킹 해제", f"{member['name']} 계정 잠금", f"비밀번호 {MAX_FAILS}회 오류", "시스템")
            raise HTTPException(status_code=423, detail=f"비밀번호 {MAX_FAILS}회 오류로 계정이 잠겼습니다 — 관리자에게 해제를 요청하세요.")
        raise HTTPException(status_code=401, detail=f"{generic} ({fails}/{MAX_FAILS}회 — {MAX_FAILS}회 오류 시 잠깁니다)")

    db.kv_put(fails_key, 0)

    # FIDO 등록 계정은 2차 단계로 — 약식: 티켓 발급 → /auth/fido 로 통과
    if member.get("fido"):
        ticket = uuid.uuid4().hex
        db.kv_put(f"fido:{ticket}", {"memberId": member["id"]})
        return {"step": "fido", "ticket": ticket, "name": member["name"]}

    audit("로그인", f"{member['name']} 로그인", "비밀번호 인증", member["name"])
    return {"step": "done", "token": issue_token(member), "user": public_user(member)}


@router.post("/auth/fido")
def fido_verify(body: dict[str, Any]) -> dict[str, Any]:
    """약식 FIDO — 티켓만 맞으면 통과한다(본개발에서 WebAuthn 으로 교체)."""
    ticket = str(body.get("ticket") or "")
    session = db.kv_get(f"fido:{ticket}")
    if not session:
        raise HTTPException(status_code=401, detail="FIDO 인증이 만료됐습니다 — 처음부터 다시 로그인해 주세요.")
    members = db.kv_get("members") or []
    member = next(m for m in members if m["id"] == session["memberId"])
    audit("로그인", f"{member['name']} 로그인", "비밀번호 + FIDO 2차 인증", member["name"])
    return {"step": "done", "token": issue_token(member), "user": public_user(member)}


@router.post("/auth/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        with db.connect() as conn:
            conn.execute("DELETE FROM kv WHERE name = ?", (f"token:{token}",))
    return {"status": "ok"}


@router.post("/auth/forgot")
def forgot(body: dict[str, Any]) -> dict[str, str]:
    """비밀번호 찾기 — 존재 여부와 무관하게 같은 답(계정 존재를 노출하지 않는다)."""
    return {"status": "ok", "message": "가입된 이메일이라면 재설정 안내를 보냈습니다. 메일함을 확인해 주세요."}


@router.post("/auth/signup")
def signup(body: dict[str, Any]) -> dict[str, Any]:
    """가입 신청 — 결재선 미확정이라 접수만 하고, 관리자 승인 후 활성화된다(RBAC 정합).

    신규 계정은 Viewer 로 시작한다 — 넓은 권한은 신청이 아니라 부여로 받는다.
    """
    import json

    name = str(body.get("name") or "").strip()
    email = str(body.get("email") or "").strip().lower()
    dept = str(body.get("dept") or "").strip()
    password = str(body.get("password") or "")
    if not name or "@" not in email:
        raise HTTPException(status_code=400, detail="이름과 올바른 이메일을 입력해 주세요.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다.")
    if find_member(email) is not None:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다 — 비밀번호 찾기를 이용해 주세요.")

    with db.connect() as conn:
        conn.execute(
            "INSERT INTO submissions(kind, json, created_at) VALUES(?,?,?)",
            (
                "signup",
                json.dumps(
                    {"name": name, "email": email, "dept": dept, "grade": "Viewer",
                     "passwordHash": hash_pw(password)},
                    ensure_ascii=False,
                ),
                datetime.now(UTC).isoformat(),
            ),
        )
    return {"status": "접수", "message": "가입 신청을 접수했습니다 — 관리자 승인 후 이메일로 안내됩니다."}
