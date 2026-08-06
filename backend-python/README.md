# backend-python (FastAPI)

백엔드 프레임워크가 아직 미확정("B/E: 협의")이라, Spring Boot(`backend/`)와 나란히 준비해둔 FastAPI 후보 스캐폴드입니다.
표준 확정 시 한쪽을 제거합니다.

## 실행

```bash
cd backend-python
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 개발 서버 (프론트엔드 프록시와 맞추기 위해 8080 포트 사용)
uvicorn app.main:app --reload --port 8080
```

- API 문서(Swagger): http://localhost:8080/api/docs
- 헬스체크: http://localhost:8080/api/health

## 테스트 / 린트

```bash
pytest
ruff check .
```

## 규칙

- 모든 REST 엔드포인트는 `/api` 프리픽스를 사용합니다 (frontend dev 프록시 대상).
- 라우터는 `app/api/` 아래에 모듈 단위로 추가하고 `app/main.py`에 등록합니다.
