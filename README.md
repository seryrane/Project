# Project

모놀리식 구성의 풀스택 프로젝트입니다.

| 구성 | 스택 |
| --- | --- |
| `frontend/` | React 19 · TanStack Start · TanStack Router · Vite 8 · TypeScript · Tailwind CSS 4 |
| `backend/` | Spring Boot 4.1 · Java 21 · Gradle 9 · Spring MVC · Spring Data JPA · H2(로컬) |

## 요구 사항

- Node.js 20 이상 (권장: 22)
- JDK 21

## 개발 서버 실행

두 서버를 각각 띄웁니다. 프론트엔드 개발 서버는 `/api` 요청을 백엔드(`localhost:8080`)로 프록시합니다.

```bash
# 백엔드 (http://localhost:8080)
cd backend
./gradlew bootRun

# 프론트엔드 (http://localhost:3000)
cd frontend
npm install
npm run dev
```

동작 확인: 백엔드 `http://localhost:8080/api/hello`, 프론트엔드 `http://localhost:3000`.

## 테스트 / 빌드

```bash
# 백엔드: 테스트 포함 전체 빌드
cd backend && ./gradlew build

# 프론트엔드: 린트 및 프로덕션 빌드
cd frontend && npm run lint && npm run build
```

## 구조

```
.
├── frontend/          # TanStack Start (React) 앱
│   ├── src/routes/    # 파일 기반 라우팅
│   └── vite.config.ts # /api → localhost:8080 프록시 설정
└── backend/           # Spring Boot 앱 (단일 배포 단위)
    └── src/main/java/com/example/backend/
        ├── BackendApplication.java
        └── api/       # REST 컨트롤러 (/api/**)
```

- 백엔드 REST API는 `/api` 프리픽스를 사용합니다.
- 로컬 DB는 H2 인메모리이며, `spring.h2.console.enabled=true`라 `http://localhost:8080/h2-console`에서 확인할 수 있습니다.
- 운영 배포 시에는 프론트엔드 빌드 산출물을 정적 리소스로 서빙하거나 리버스 프록시 뒤에 두는 방식 모두 가능합니다.
