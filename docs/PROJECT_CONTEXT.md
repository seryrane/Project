# 프로젝트 컨텍스트 (취합 정보 통합 정리)

> 2026-08-05 기준. 고객 제공 체크리스트 3종, 사전 미팅 안건, 회의록 요약, 디자인 메모를 통합한 파악 문서.
> 이 문서는 요구사항 확정 전 "현재 이해"를 기록한 것으로, 미팅 결과에 따라 갱신한다.
>
> **원문 자료 위치**(로컬 `C:\Users\acroi\Downloads\`): `02_요구사항정의서.docx`
> (KPI&IBD 관리 어드민 — 두 사업 합본 정의서, FR/NFR/OPN 번호의 정본) ·
> `IBD 데이터 분석 웹 페이지 개발 프로젝트.pptx` · `요구사항추적표.xlsx` ·
> `OneDrive_2026-07-20\회의록1·2.txt`. 화면·설계의 요구 근거는 FR 번호로 적는다.
> ⚠ 이 포털은 **두 프로젝트의 합본**(① 웹 기반 KPI 운영 플랫폼 ② Connect IBD2.0
> 사양서 관리/검증) — 사용자·인증·인프라·공통 프레임워크를 공유하고 메뉴가 가른다.

## 1. 프로젝트 정체

현대차그룹(HMG) 대상 **통합 데이터 플랫폼** 구축. 슬로건: **One Portal, One Login, One User, Many Services.**
하나의 포털 아래 두 시스템을 구축하고, 향후 업무시스템 추가(IBD 2.0 등)를 수용하는 확장 구조.

| 시스템 | 정식 명칭 | 내용 |
| --- | --- | --- |
| KPI 포털 | **ICDAP** | 센터 KPI·데이터 시각화. 센터/실/팀/개인 KPI(목표·실적·달성률·월별 추이), IVI 분석 대시보드(MAU/WAU, 기능 사용률, 설정값 분포, 다국어, 엑셀 다운로드) |
| IBD 사양관리 | **IDMS** | IBD 수집사양 관리. 엑셀 수작업 → 웹 전환: 사양 조회/신규·수정·삭제 요청, N단계 결재, 엑셀 일괄 업로드/마이그레이션, 배포 버전 관리, 검증엔진, 승인·반영 이력 |

- **일정**: 2026년 10월 ~ 2027년 4월, 총 4단계 오픈 (현재는 착수 전 요구사항 확정 단계)
- **Tableau 전환 전략**: 1차 임베딩으로 빠른 오픈 → 2차부터 웹으로 순차 전환 → 최종 Tableau 의존 제거
- **AI**(챗봇: 자연어 데이터 조회 / AI 검증 고도화)는 부가 기능, PoC 후 단계 적용. Claude/Gemini/H-Chat API 후보

## 2. 공통 플랫폼 기반

- **인증**: HMG-SSO (OAuth2/OIDC/SAML/LDAP 중 미정), JWT Access/Refresh 정책, Teams 내 접속, Tableau 임베딩 시 이중 로그인 차단(SSO 토큰 연계) 필요
  - 회의록 시그널: "SSO 간편 로그인 + **일반 로그인도 할 수도 있겠다**" · 로그인 범위는
    센터 + 협력사(모비스·오토에버·해외 연구소 — **LG전자는 HMG-SSO 미커버**) →
    SSO 밖 계정의 일반 로그인·가입 승인 경로가 필요하다
  - 프로토타입 반영(2026-08-06, 약식): /login(SSO 자리+일반 로그인·ID 기억·비번 표시·
    CapsLock·5회 잠금·FIDO 약식 2차·비번 찾기) · /signup(접수→관리자 승인, Viewer 시작) ·
    로그인 이력 감사 기록(요구사항: 5년 보관) · 토큰은 약식 세션(JWT 정책 확정 시 교체)
- **권한(RBAC)**: 조직 + 메뉴 + 사용자 예외 정책. 등급: Super Admin / Admin / Editor / Viewer. 서비스별 Role 분리(예: KPI_ADMIN, IBD_APPROVER), 국가/차종/조직 기반 데이터 권한, 조직 변경 시 권한 자동 변경 고려
- **메뉴**: 관리자 UI 기반 동적 등록, Role 연결, 동적 URL 등록으로 신규 시스템 편입
- **알림**: Email / Teams / Webhook (+SMS 언급), 수신자 룰
- **감사로그**: 로그인·화면 이동·다운로드·검색·승인 이력, **5년 보관** → 파티셔닝/아카이브/용량 산정 필요
- **모니터링**: 서버(CPU/MEM/Storage)·배치·프로세스 상태를 웹 내부 통합으로 (Grafana 별도 페이지보다 선호)
- **공통 게시판**: FAQ / QnA / 공지사항
- **DB 전략**: KPI/IBD의 DB·스키마 분리 여부 미정

## 3. 기술 환경 (사실상 확정)

| 항목 | 내용 |
| --- | --- |
| 프론트엔드 | React (고객 표준). MUI 템플릿 활용 검토 중 |
| 백엔드 | **미확정 — 요구사항서 "B/E: 협의"**. 정황상 FastAPI 우세 (기존 KPI 플랫폼 React/FastAPI, 검증엔진 Python, Airflow, WAS "Python Framework") |
| DB | PostgreSQL (버전 확인 필요) |
| 인프라 | hCloud VM, Rocky Linux, Nginx/Apache. DEV/(SIT)/UAT/PRD 제공 시점 확인 필요 |
| CI/CD | GitLab |
| 데이터 소스 | **CDO(HMC Cloud)** 에서 정제된 데이터를 별도 DB로 수신. 연계 방식 **Kafka vs SFTP 미정**(CDO 정책 따름) |
| 보안 | 현대오토에버 SAMS 보안성 검토, 보안 PASS제(인력 증빙), AES256, TLS1.2+, 개인정보 마스킹/암호화 |
| 재사용 | 기존 KPI 플랫폼 소스(Git) 제공 검토 — SSO/RBAC/메뉴/게시판/알림/감사로그 모듈 |

## 4. IDMS 도메인 요점

- **데이터 모델**: Event/Signal/Parameter/Attribute + 관계. 축: 국가 × 플랫폼 × 차종(+연식). 계층 구조(대분류/중분류/항목). Key 식별자 정책, 데이터 Dictionary 존재 여부 확인 필요
- **버전**: 현재 사양서 버전 ↔ 데이터 버전 매칭 문제 존재. Major/Minor + 작업버전/배포버전, **T-N주(배포 기준) 체계** 재정립 검토. Diff(행/컬럼/텍스트 단위) 요구
- **Workflow**: 신규/수정/삭제 요청별 프로세스, 최대 N단계, 대결, 참조, 반려·재상신, 승인 후 수정 정책. **동일 사양 다중 수정 요청 충돌 관리**가 명시된 이슈. 최종 반영 전 관리자 승인 필수
- **검증엔진** (IBD 공수의 ~60%, 프로젝트 최대 공수 변수):
  - Rule 수(10/100/1000+ 미정), 작성 주체(개발자 vs 현업), 변경 빈도(월/주/수시)에 따라 아키텍처 상이 — 현업 작성이면 Rule Engine + DSL + Admin Builder로 공수 3배+
  - 회의록 시그널: 현 Airflow 수작업 → **웹에서 Rule 관리 + CSV 업로드 + 버전관리 + 반영 전 테스트** (Admin Builder형에 가까움)
  - 검증 유형: 형식/필수값/오탈자/룰 기반. 실시간+배치, 재실행, 오류 재처리. 일 10만 건+ 처리, SLA 확인 필요
  - 검증 결과: 저장 항목, 오류 분류 체계, 품질 KPI, Excel/PDF 리포트, 대시보드
- **엑셀 마이그레이션**: 양식 수/파일 수/건수 미정. 정상·오류·대용량 샘플 확보 필요. 오류 정제, 롤백, 정합성 검증 기준
- **외부 연동**: Jira(Cloud/DC 미확인, 생성 Rule/프로젝트/필드), Confluence(Space/Template/게시 형식), **EStrack**(API 제공 여부 미확인)

## 5. ICDAP 도메인 요점

- KPI 등록/수정/삭제 + 시각화 (센터/실/팀/개인 단위)
- **데이터마트**: 구축 주체·일정 미정 — "개발 완료 → 데이터 없음 → 테스트 불가" 리스크. Mock Data / Swagger 제공 수준 협의 필요
- **Tableau**: Embedded / Server / Cloud 여부, 직접 개발 vs 호출 비율, Tableau SSO 미확인
- 대용량 다운로드: 수십만 건 스트리밍(CSV/Excel), OOM 대비 설계

## 6. 디자인 요구 (중요)

1. **담당자가 디자인에 매우 민감** — 시안 조기 합의 + 리뷰 사이클 필수
2. **세련되고 트렌디한 디자인 요구** — 전형적 admin 템플릿 스타일 지양
3. **Data-Inside Look & Feel 준수** — 가이드/Figma/디자인시스템 제공 여부 확인 필요
4. "예쁜 UI보다 사용자 중심 UX" — 데이터 서비스의 직관성
5. MUI 활용 시에도 Data-Inside 토큰으로 확실한 테마 적용 필요
- ⚠️ 미팅 확인: "Data-Inside 범위 내 트렌디한 해석 허용 vs 기존 화면과 픽셀 수준 통일"

## 7. P1 미확정 이슈 (미확정 시 아키텍처/공수 산정 불가)

1. 백엔드 프레임워크 (FastAPI vs Spring Boot)
2. 검증엔진 구조 (Rule 수 / 작성 주체 / 변경 빈도)
3. 데이터마트 구축 주체·일정
4. Kafka vs SFTP (CDO 정책)
5. Tableau SSO 연계 방식
6. 사양서 데이터 모델 / Excel 템플릿 구조
7. 버전 관리 정책
8. 결재 프로세스
9. RBAC 상세 / 사용자 유형
10. MVP 범위, 프로젝트 성공 KPI(문서에 부재 — 반드시 수령), 운영조직

## 8. 미팅 시 확보할 자료

업무: As-Is/To-Be 프로세스, 조직도, 권한 체계 문서
데이터: 사양서 Excel 샘플(정상/오류/대용량), 검증 Rule 문서·샘플, Kafka 샘플 메시지
시스템: SSO 연동 문서, Jira/Confluence API 문서, EStrack API 문서
운영: 인프라 구성도, 보안 가이드, 운영 표준, 기존 KPI 플랫폼 Git 접근

## 9. 저장소 현황과의 관계

- `frontend/` — React 19 + TanStack Start. 고객 표준(React)과 일치. 유효
- `backend/` — Spring Boot 4.1 스캐폴드. 백엔드 표준 확정 전까지 업무 로직 적재 보류
- `backend-python/` — FastAPI. **2026-08-05 부터 확정된 공통 기능을 적재 중**
  (정황 우세 판단 — 기존 KPI 플랫폼 FastAPI·검증엔진 Python·Airflow):
  내 정보 파생(me/menu/features/abilities) · 대시보드 배치 계정 저장 · RBAC 정본
  조회+상신 접수 · 커뮤니티(공지/Q&A/FAQ) · 회원/잠금 · 감사 로그 · whatsnew.
  실행 `uvicorn app.main:app --port 8080` (vite proxy /api). 저장은 SQLite
  (`data/app.db`, gitignore) — 시드는 비어 있을 때만 채운다.
  ⚠ 일부러 안 붙인 것(미확정): 사양서 CRUD · 승인 결재선 · 배포 실행 ·
  검증엔진 실행 · 인증(SSO — 사용자 김현대 고정). 프런트는 서버가 없으면
  mock 으로 조용히 돌아간다(`frontend/src/lib/api.ts` 관문 — 시연 안전).
- `backend/` — **같은 공통 기능을 Spring Boot 4.1 + PostgreSQL 로 한 벌 더**
  (2026-08-05, 사용자 지시 — 두 후보를 실물로 나란히 두고 비교). :8081,
  JdbcTemplate + 공용 schema.sql. 표적은 PG(`postgres` 프로필,
  HMG_PG_URL/USER/PASSWORD) — 이 PC 엔 PG 가 없어 기본 프로필은 H2 의
  PostgreSQL 호환 모드(파일 `data/hmg`). 시드는 backend-python 정본을
  `dump_seeds.py` 로 덤프한 `resources/seed/*.json` (손 복사 금지).
  테스트 MockMvc 8건 — FastAPI pytest 와 같은 것을 검사한다(두 벌 정합).
  실행 `gradlew bootJar && java -jar build/libs/backend-*.jar`.
  프런트 전환 = vite proxy 대상만 8080↔8081.
- 백엔드 확정 시 한쪽을 제거하고 CLAUDE.md/CI를 갱신할 것 — API 모양(정본)이
  같아서 프런트는 무변경이다
