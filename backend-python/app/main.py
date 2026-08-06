"""HMG 통합 관리자 포털 — 공통 기능 백엔드 (FastAPI).

붙인 것(확정된 공통 기능): 내 정보 파생(me/menu/features/abilities) ·
대시보드 배치 계정 저장 · RBAC 정본 조회 + 상신 접수 · 커뮤니티(공지/Q&A/FAQ) ·
회원 목록/잠금 · 감사 로그 · 새 기능(whatsnew).

⚠ 일부러 안 붙인 것(미확정): 사양서 CRUD(요구사항 확정 전) · 승인 결재선 ·
배포 실행 · 검증엔진 실행 · 인증(HMG-SSO — 사용자를 김현대로 고정).
프레임워크도 미확정(B/E: 협의)이라 Spring 스캐폴드(backend/)는 남겨 둔다 —
확정 시 한쪽을 제거한다(docs/PROJECT_CONTEXT.md).

실행: backend-python 에서 `uvicorn app.main:app --port 8080 --reload`
(프런트 vite proxy 가 /api → :8080 으로 넘긴다)
"""

from fastapi import FastAPI

from app import db, seeds
from app.api import auth, community, directory, embeds, hello, me, navs, rbac

app = FastAPI(title="hmg-portal-backend", docs_url="/api/docs", openapi_url="/api/openapi.json")

db.init()
seeds.seed_if_empty()

app.include_router(hello.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(directory.router, prefix="/api")
app.include_router(rbac.router, prefix="/api")
app.include_router(embeds.router, prefix="/api")
app.include_router(navs.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
