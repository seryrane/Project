# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> ## ⚠ 새 세션이 읽는 순서
>
> 1. `docs/PROJECT_CONTEXT.md` — 프로젝트 정체·미확정 이슈 (기능 작업 전 필수)
> 2. `docs/화면_공통규칙.md` — **화면을 만들기 전에** 읽는다 (표시 영역·알림·로딩·모바일)
> 3. `frontend/DESIGN.md` — 시각 토큰 정본 (색·글자·간격·모바일 치수)

## Project Overview

Monolithic full-stack platform project for HMG (Hyundai Motor Group): a unified portal hosting ICDAP (KPI/data visualization) and IDMS (IBD spec management). Requirements are still being finalized — see `docs/PROJECT_CONTEXT.md` for the full integrated project context and `docs/MEETING_CHECKLIST.md` for open questions. Read `docs/PROJECT_CONTEXT.md` before doing feature work.

**모바일도 타겟이다.** 접는 구조(레이아웃)는 화면 만들 때 같이 잡는다 — 나중에 하면
다시 짜게 된다. 상세는 `docs/화면_공통규칙.md` §8.

- `frontend/` — React 19 + TanStack Start (file-based routing via TanStack Router), Vite 8, TypeScript, Tailwind CSS 4. Scaffolded with `@tanstack/cli`. React matches the customer standard.
- `backend/` — Spring Boot 4.1 on Java 21, built with Gradle 9 (wrapper committed). Spring MVC (`spring-boot-starter-webmvc` — note: Boot 4 deprecated `spring-boot-starter-web`), Spring Data JPA with in-memory H2, Bean Validation, Actuator.
- `backend-python/` — FastAPI candidate scaffold (venv + `pip install -e ".[dev]"`, pytest, ruff).

IMPORTANT: The backend framework is NOT yet decided (customer requirement says "B/E: 협의"; signals lean FastAPI). Both backend scaffolds exist in parallel — do not build business logic into either until the decision is confirmed, then delete the losing one and update this file and CI.

The frontend dev server (port 3000) proxies `/api/*` to the backend (port 8080) — see `frontend/vite.config.ts`. All backend REST endpoints live under the `/api` prefix (`backend/src/main/java/com/example/backend/api/`).

## Commands

Frontend (run from `frontend/`):
- `npm install` — install dependencies
- `npm run dev` — dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run check` / `npm run format` — Prettier check / write
- `npm run generate-routes` — regenerate `src/routeTree.gen.ts` after adding routes (the Vite plugin also does this automatically during dev)

Backend (run from `backend/`):
- `./gradlew build` — compile + tests
- `./gradlew test` — tests only
- `./gradlew bootRun` — run the app on port 8080

Backend candidate (run from `backend-python/`, after `python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"`):
- `.venv/bin/pytest` — tests
- `.venv/bin/ruff check .` — lint
- `.venv/bin/uvicorn app.main:app --reload --port 8080` — run (same port as Spring Boot so the frontend proxy works with either)

## Conventions

- Backend dependency versions come from the `spring-boot-dependencies` platform BOM declared in `backend/build.gradle`; the BOM must be applied to each configuration that needs it (it is applied to both `implementation` and `developmentOnly`).
- New backend REST controllers go in the `com.example.backend.api` package under the `/api` path prefix so the dev proxy picks them up.
- Frontend routes are file-based under `frontend/src/routes/`; `src/routeTree.gen.ts` is generated — never edit it by hand.
- H2 is dev-only; `spring.jpa.hibernate.ddl-auto=update` is a local convenience and a real database/migration story is still to be decided.

## 작업 규율 (사내 Acrofuture Portal 프로젝트에서 이식 — 전부 실사고에서 나온 규칙)

0. **화면을 만들기 전에 `docs/화면_공통규칙.md` 를 읽는다.** 규약에 없는 상황을 만나면
   **규칙을 먼저 정해 그 문서에 적은 뒤** 만든다 — 화면이 먼저 나가면 그게 그대로 규칙이 된다.
1. **문서·타입·상수에만 적힌 판단은 반드시 어긋난다.** 판단은 한 곳(관문 컴포넌트·순수
   함수)에서 하고, 그 한 곳을 지나가게 강제한다. 규칙을 문서에만 적으면 화면마다 자기
   자리를 스스로 정한다.
2. **테스트가 통과해도 살아 있는 앱에서 본다.** 화면 문제는 브라우저에서 값을 **재서**
   찾는다. `skip` 은 통과가 아니다 — 데이터가 없어 건너뛴 e2e 는 아무것도 확인하지 않는다.
3. **픽스처가 깨지면 가드가 실제로 도는 증거다.** 새 권한·검증을 걸어 기존 테스트가
   깨지면, 깨진 테스트를 고쳐 새 규칙을 반영한다. 가드를 무르는 것이 아니다.
4. **치수·색은 토큰에서만 고른다** (`frontend/DESIGN.md`). 손으로 박은 값이 쌓이는 것이
   "촌스럽다"의 정체다.
5. **모달·패널 ↔ 본문으로 화면을 옮기면 눈으로 본다.** 감싸던 상자가 주던 패딩·간격이
   통째로 사라진다.
6. **커밋 메시지·주석에 '왜'를 적는다** — 무엇을 바꿨다가 아니라 왜 그렇게 정했나,
   무엇이 잘못됐었나. `⚠` 는 실제로 겪은 사고에만 붙인다. 한글 커밋 메시지는
   `git commit -F <파일>` 로 넣는다 (PowerShell 인라인 문자열이 깨진다).
- UI 수정 시 **모바일(393px) 확인은 필수.** 화면 설명은 ASCII 다이어그램 + 판단 사유와 함께.

<!-- ═══════════ 공유 작업 교리 (acrofuture-poc·stock_auto·billiard-platform 과 동일 취지 블록) ═══════════ -->
## 사용자 & 공유 작업 교리

**사용자**: sery(sery245@gmail.com). 한국어로 소통. '구현 로직의 빈틈'을 직관으로 짚고,
지속적 발굴·개선을 최우선으로 여긴다.

**교리 — 이 사용자와 일하는 방식:**

1. **"한계·소진·불가"를 결론으로 쓰기 전에 한 축 더 판다.** "별도 검증 중"·"관찰만"·"가정"
   으로 남긴 미측정 항목은 실제로 측정한다 — 가정을 결과로 쓰지 않는다.
2. **부정 결과도 다음 삽의 방향을 준다** — 죽은 축이면 인접·직교 축으로 확장. 한 번에
   하나씩 계속 변주(완화/강화 양방향, 유형 추가, 정방향/역방향 양면).
3. **검증·근거 규율은 유지하되 탐색은 멈추지 않는다.** 규율은 탐색을 막는 게 아니라
   가짜를 거른다.
4. **개선 대상 상시 목록화** — 구성요소마다 "검증됐나? 실측했나? 빈틈 있나?"를 물어
   미검 항목을 큐에 쌓고 하나씩 판다. 종결 제안을 기본값으로 하지 말 것 — 다음 팔
   후보를 항상 함께 제시한다.
5. **★영향 기능 전수 체크** — 기능 추가·개선이 건드리는 다른 기능까지 반드시 확인:
   ①이 변경이 읽는/쓰는 데이터를 다른 어디서 소비하나 ②호출자·피호출자·UI·알림·
   마이그레이션·테스트 파급 ③규약과 라이브가 여전히 일치하나 ④설정과 상호작용하나
   ⑤역방향·엣지 유발하나. **변경 후 관련 테스트 실행 + 영향 지점 코드 확인까지가 '완료'다.**
6. **사용자 사고 패턴을 능동 채용** — 순서·엣지케이스·설정 상호작용·양방향 리스크 같은
   각도를 내가 먼저 자문하고 선제 점검한다.
7. **감사·지적을 무조건 수용하지 않는다** — 코드·수치를 직접 재확인한 뒤 반영하거나 반박한다.
<!-- ═══════════ 공유 블록 끝 ═══════════ -->
