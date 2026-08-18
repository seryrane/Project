# HMG 통합 관리자 포털 (프로토타입)

**센터 KPI 품질(ICDAP)** 과 **IBD 사양서(IDMS)**, 두 사업이 한 포털로 들어옵니다.
프로젝트는 하나지만 **메뉴가 두 사업을 가릅니다** — 어느 한쪽 낱말로 전체를 부르지 않습니다.

> 요구사항 확정 전 **프로토타입**입니다. 화면은 목데이터로 돌고, 서버는 공통 기능만 붙어
> 있습니다. 무엇이 확정이고 무엇이 아직 비어 있는지는 [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md).

## 문서 지도 — 무엇부터 읽나

**처음 오셨다면 자기 역할의 가이드 하나만 읽으면 됩니다.** 나머지는 그 문서가 필요할 때
가리킵니다.

| 당신이 | 읽을 것 | 무엇이 들어 있나 |
|---|---|---|
| **기획자** | [docs/기획_가이드.md](docs/기획_가이드.md) | 화면 지도·업무 흐름·권한을 사람 말로·용어집·아직 정해지지 않은 것 |
| **퍼블리셔** | [docs/퍼블리싱_가이드.md](docs/퍼블리싱_가이드.md) | 토큰·테마·반응형·넘침 방지·복붙 가능한 표준 마크업·올리기 전 체크리스트 |
| **개발자** | [docs/개발_가이드.md](docs/개발_가이드.md) | 저장소 지도·띄우는 법·관문 목록·데이터 흐름·컨벤션·검증 루틴·함정 모음 |

세 가이드가 공통으로 따르는 **정본 문서**는 따로 있습니다. 규칙이 어긋나면 이쪽이 이깁니다.

| 정본 | 무엇의 정본인가 |
|---|---|
| [docs/화면_공통규칙.md](docs/화면_공통규칙.md) | 화면 규약 — 표시 영역·알림·로딩·다국어·표·모바일·강조 색 (22개 절) |
| [frontend/DESIGN.md](frontend/DESIGN.md) | 시각 토큰 — 색·치수·테마·모션 |
| [docs/RBAC_설계노트.md](docs/RBAC_설계노트.md) | 권한 설계 — 메뉴 × 액션 × 범위, 본개발 원칙 |
| [docs/API_설계.md](docs/API_설계.md) | 사양서·결재·배포 API 모양 (FR-114) — **서버는 아직 안 붙였다**, 화면이 알아낸 규칙을 스키마로 굳혀 둔 문서 |
| [docs/챗봇_표준질의_설계.md](docs/챗봇_표준질의_설계.md) | 챗봇 — 무엇을 묻고 어떻게 답하나(표준 질의·답의 칸) |
| [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | 사업 배경·원문 자료 위치·확정/미확정 |
| [CLAUDE.md](CLAUDE.md) | 이 저장소에서 일하는 방식(작업 규율) |

## 구성

| 폴더 | 스택 | 포트 | 상태 |
|---|---|---|---|
| `frontend/` | React 19 · TanStack Start/Router · Vite 8 · TypeScript · Tailwind 4 | 3000 | 정본 |
| `backend-python/` | FastAPI · SQLite | 8080 | **API 모양의 정본** |
| `backend/` | Spring Boot 4.1 · Java 21 · JdbcTemplate · PostgreSQL(H2 호환 모드) | 8081 | 같은 API의 두 번째 벌 |

백엔드 프레임워크가 아직 미확정이라 **두 벌을 나란히** 둡니다. API 모양과 시드는
FastAPI 벌이 정본이고, 스프링 벌은 같은 검사를 통과하도록 맞춰 둡니다
(시드는 `backend-python/dump_seeds.py` 가 JSON 으로 떠서 넘깁니다).
프런트를 스프링 벌로 돌리려면 `frontend/vite.config.ts` 의 프록시 대상만 8081 로 바꿉니다.

## 띄우기

필요한 것: Node.js 20+ (권장 22) · Python 3.11+ · JDK 21(스프링 벌을 볼 때만)

```bash
# 1) 백엔드 (정본) — http://localhost:8080
cd backend-python
python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"   # Windows
.venv/Scripts/python -m uvicorn app.main:app --port 8080

# 2) 프런트 — http://localhost:3000  (/api 요청은 8080 으로 프록시)
cd frontend
npm install
npm run dev
```

**백엔드 없이도 화면은 돕니다.** 통신 관문(`frontend/src/lib/api.ts`)이 서버가 없으면
목데이터로 되돌아갑니다 — 시연이 서버 상태에 흔들리지 않게 하려는 장치이고, 본개발에서는
교체합니다.

스프링 벌을 볼 때:

```bash
cd backend && ./gradlew bootJar && java -jar build/libs/backend-*.jar   # :8081
```

## 검증

올리기 전에 **위에서부터 차례로** 돌립니다. 각 단계가 잡는 것이 다릅니다.

```bash
cd frontend && npx tsc --noEmit    # 타입 — 모양이 어긋난 곳
cd frontend && npm run lint        # 규칙 — 죽은 조건·가려진 이름
cd backend-python && pytest        # 서버 — 파생이 정말 파생인지, 접수가 정말 막는지
cd backend && ./gradlew test       # 두 번째 벌이 같은 검사를 통과하는지
cd frontend && npm run e2e         # 실제 브라우저 — 모바일 넘침·서랍·시트·터치 타깃
cd frontend && npm run build       # 프로덕션 빌드
```

마지막은 **눈으로 봅니다** — 라이트/다크, 한국어/영어, 393px 폭. 한 언어·한 테마로만
보면 넘침은 반드시 늦게 발견됩니다(규약 §4-5).

> ⚠ `npm run e2e` 가 **`browserType.launch: spawn UNKNOWN`** 으로 통째 실패하면 코드 탓이
> 아닙니다 — 회사 PC 의 **애플리케이션 제어 정책이 Playwright 번들 브라우저를 차단**한 것입니다
> (실행 파일을 직접 돌려 보면 그렇게 말합니다). 그때는 설치된 Chrome 으로 돌립니다:
> `PW_CHANNEL=chrome npm run e2e`.

## 구조

```
.
├── frontend/
│   ├── src/routes/          # 파일 기반 라우팅 = 화면 하나당 파일 하나
│   ├── src/components/portal/  # 공용 관문 — 표시영역·로딩·입력·차트·셸
│   ├── src/data/            # 목데이터와 정본 목록(nav·roles·menus·specs·kpi …)
│   ├── src/lib/             # 통신(api)·다국어(i18n)·포인트색(accent)·테마(useTheme)
│   ├── e2e/                 # Playwright 모바일 스모크
│   └── DESIGN.md            # 시각 토큰 정본
├── backend-python/          # FastAPI (정본) — app/api/ 아래 모듈 단위 라우터
├── backend/                 # Spring Boot (두 번째 벌)
└── docs/                    # 규약·설계·역할별 가이드
```

**직접 만들지 말고 관문을 쓰십시오.** 모달·서랍·로딩·칩·토스트·차트·통신·다국어는
전부 `components/portal` 과 `lib` 에 관문이 있습니다. 관문을 지나지 않은 화면은
규칙에서 조용히 벗어납니다 — 목록은 [docs/개발_가이드.md](docs/개발_가이드.md).
