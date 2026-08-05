# DESIGN.md — HMG 통합 관리자 포털 (잠정 디자인 언어 v0.4 · Dark SaaS + 모션 시스템)

> Data-Inside 가이드 수령 전까지의 잠정 표준. 수령 시 토큰만 교체한다.
> v0.2에서 다크 SaaS 톤으로 전환, v0.3에서 라이트/다크 테마 전환·글로우 절제·트리 사이드바·대시보드 차트 규칙 추가.
> 참조: Behance Rentier(다크 SaaS 파일관리) · Aivora(AI 워크플로 admin) · Linear(다크 토큰 구조) · docs/UI_ADOPTION.md(화면 패턴).

## Overview

딥 네이비-블랙 캔버스 위 살짝 밝은 다크 카드, 바이올렛 퍼플 단일 액센트에 **글로우(빛 번짐)** 를 더한 모던 다크 SaaS. 배경에 은은한 퍼플 radial glow를 깔고, 주요 액션은 퍼플 그라디언트 + 글로우 섀도로 강조한다. 상태·diff는 다크용 틴트로 표현하고 원색 배경 남용은 금지.

## Colors

```
canvas        #0c0e15   페이지 배경 (딥 네이비-블랙)
surface       #141722   카드/모달/입력
raised        #1a1e2c   카드 안의 인셋/모달 내부 박스
hairline      #242938   경계선 (1px). 유리 느낌은 white/5~8 보더 병용
ink           #eef0f6   본문 제목
ink-muted     #9aa1b5   보조 텍스트
ink-subtle    #676e84   레이블/캡션
primary       #8b7cff   액센트 (바이올렛 퍼플)
primary-deep  #7463f2   hover/pressed
sidebar       #090b11   사이드바 (캔버스보다 한 단계 어둡게)
```

상태(Semantic) — 다크용 틴트 배경 + 밝은 동일 계열 텍스트:

```
draft    초안      bg #232838  text #a3aabf
review   검토 중   bg #322611  text #f2b65a
pending  승인 대기 bg #262047  text #b3a4ff
deployed 배포 완료 bg #12301f  text #57dd92
danger   삭제/반려 bg #391b1f  text #f78c95
```

Diff(버전 비교): 변경 전 `bg #391b1f + 취소선 text #f78c95`, 변경 후 `bg #123023 text #4fd38a`, 무변경 `raised/60`.

## Signature Effects (이 테마의 정체성)

- **퍼플 그라디언트**: 주요 CTA·활성 메뉴는 `from-primary to-accent2`
- **글로우 섀도(절제)**: `0 2px 10px var(--color-glow)` — v0.2보다 blur·강도를 줄여 선명하게
- **앰비언트 글로우(절제)**: 콘텐츠 배경 radial 1개, `primary/10 blur(100px)` 이하
- **글래스**: 상단바 `bg-canvas/75 + backdrop-blur`; 모달 오버레이 `black/65 + blur-sm`
- 카드 hover: `-translate-y-0.5` + `border-primary/40` + `0 6px 20px var(--color-glow)`

## Typography

- 폰트: `Pretendard Variable, Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif`
  — ⚠ **번들 필수**(`pretendard` npm 패키지를 styles.css 에서 import). 이름만 올린 글꼴은
  없는 글꼴이다: 미설치 PC 전원이 맑은 고딕을 보게 되고, 실제로 그랬다(2026-08-05 수정).
  외부 CDN 로드는 하지 않는다(번들 self-host).
- 스케일: 페이지 제목 24/700 · 섹션·모달 제목 18/600 · 카드 제목 16/600 · 본문 14/400 · 레이블·캡션 12/500(ink-subtle) · 수치는 tabular-nums
- ID·버전(SP-001, v2.3)은 monospace 계열로 구분. 모노는 코드·경로·ID·버전에만 — **한글 문장에는 쓰지 않는다**

## Layout & Shape

- 사이드바 240px 고정, 콘텐츠 max-width 1280px, 패딩 32px, 간격 4px 체계
- radius: 카드·모달 16px(rounded-2xl), 버튼·입력 8px, 배지·칩 full
- 경계 우선(보더), 그림자는 글로우 용도 외 최소화

## Components

- **버튼**: primary(퍼플 그라디언트 + 글로우), secondary(`bg-white/5 + hairline 보더`, hover `white/10`). 높이 32~36px
- **상태 배지**: 다크 틴트 + 12px/500
- **버전 칩**: `bg-primary/12 text-primary` 라운드 필
- **카드(사양서)**: surface + hairline 보더, 스펙 미리보기는 `canvas/70 인셋 + white/5 보더`, 태그는 `white/5` 칩
- **사이드바**: 섹션 레이블 11px/40% 투명, 활성 아이템 퍼플 그라디언트 필 + 글로우, 로고는 그라디언트 사각 + 글로우
- **모달**: `rounded-2xl + white/8 보더`, 오버레이 블러, 내부 인셋은 raised
- **탭**: primary 2px 언더라인, 카운트 칩 `white/8`
- **입력/셀렉트**: surface 배경 + hairline 보더, focus `primary/60` 보더 (option 배경은 CSS로 surface 강제)

## Mobile (≤720px) — 타겟이다. 접는 구조는 화면 만들 때 같이 잡는다

상세 규칙과 근거는 `docs/화면_공통규칙.md` §1(표시 영역)·§7(패널 해부)·§8(모바일)이 정본.
여기는 치수 요약만 둔다.

- 사이드바 → **본문을 덮는 서랍**. 잎(메뉴 항목)을 고르면 닫힌다. 가지(섹션)는 그대로
- 모달 → **아래에서 올라오는 시트** (가로 100%, 세로는 내용만큼, 최대 100dvh−헤더, 위 모서리만 라운드)
- 터치 타깃: 조작 min-height 40px(표·칩 안은 36px) · 아이콘 버튼 폭도 36px · 체크박스 24px
  · **입력 글자 16px 이상**(그 아래면 iOS 가 확대) · input 도 min-height 40px
  · **좁은 화면에서만** — 데스크톱 밀도는 그대로 둔다. `height` 아닌 `min-height` 로
- 높이는 `100vh` 폴백 + `100dvh` 겹쳐 쓰기 (iOS 주소창)
- 토스트는 **하단**, 발(액션 줄)의 주 동작은 오른쪽 끝(엄지 자리), 아래 여백은 `env(safe-area-inset-bottom)` 가산
- 표는 자기 상자 안에서만 가로 스크롤(페이지는 안 밀린다) + 오른쪽 열 존재를 가장자리 그림자로
- 덮개 z-index 는 이름 붙인 사다리에서만 고른다 (숫자를 화면마다 손으로 적지 않는다)

## Rules

1. 퍼플 액센트·그라디언트는 화면당 1~2곳 (주요 CTA + 활성 메뉴) — 남용 금지
2. 상태는 배지로만, 카드 전체를 상태색으로 칠하지 않는다
3. 다크 배경에서 텍스트 대비 WCAG AA 유지 (muted 이하 텍스트를 본문에 쓰지 않기)
4. 앰비언트 글로우는 화면당 최대 2개, 채도 15% 이하
5. 라이트 테마는 아래 "테마 시스템" 참조 — 콘텐츠 영역에서 white/* 유틸 직접 사용 금지 (토큰만)
6. **치수·색은 토큰에서만 고른다** — `@theme` 에 없는 값이 필요해 보이면 단계가 틀린 것.
   손 눈대중 값이 쌓이면 하나하나는 그럴듯한데 모아 놓으면 리듬이 없다("촌스럽다"의 정체)
7. 누를 수 있는 것에는 `:hover` 와 `:focus-visible` 을 **둘 다** 준다
8. 브라우저 기본 위젯(`<select>`·file input·**스크롤바**)도 앱의 물건처럼 입힌다 — 기본 모양이
   남으면 그 줄만 딴 앱. 스크롤바는 전역 얇은 테마(styles.css `scrollbar-color`)라 화면이
   따로 할 일 없음. 숨겨야 하면 `.scrollbar-hidden` + 가장자리 페이드
9. 상태 칩(점 + 뜻이 정한 색)과 이름표 태그(테두리만, 무색)를 가른다. 모르는 상태는 회색
10. **입력 컨트롤 위계** (관문: `components/portal/Chips.tsx`) — 옵션이 한눈에 들어오면(≤6) 단일 선택은
    `ChipSelect`, 다중 선택은 `ChipMulti`. on/off 하나짜리는 `Switch`. `<Select>` 는 옵션이 많을 때만
    (메뉴 10개, 액션 7개 등). 원시 체크박스는 쓰지 않는다 — 매트릭스도 aria-pressed 토글 버튼(✓/─)로

## 테마 시스템 (v0.3)

- 기본 다크. `<html data-theme="light">`로 라이트 전환 — 모든 색은 CSS 변수 토큰이라 통째로 교체됨. 토글은 상단바(해/달), localStorage `theme`에 저장.
- **사이드바는 두 테마 모두 다크 유지** (브랜드 아이덴티티). 사이드바 내부는 white/* 유틸 사용 가능, 콘텐츠 영역은 반드시 `chip`/`chip-strong`/`hairline` 토큰 사용 (white/* 금지 — 라이트에서 깨짐).
- 라이트 토큰: canvas #f4f5f9 · surface #fff · primary #6d5cf0 등 (styles.css `[data-theme='light']` 블록).

## 사이드바 (Rentier 스타일)

- 아이템: 16px 스트로크 아이콘 + 라벨, 활성은 그라디언트 필 + 글로우
- 섹션: 접이식(체브론), 펼침 시 `ml-2 border-l pl-2` 트리 가이드 라인
- 대시보드/사양서 관리는 실제 라우트 Link, 나머지는 자리표시자

## 대시보드 차트 규칙 (dataviz 스킬 준수)

- 마크: 라인 2px round, 마커 r4 + surface 2px 링, 바 두께 ≤24px(실사용 16px) + 데이터 끝 4px 라운드(베이스라인은 직각), 스택 세그먼트 사이 2px surface 갭, 그리드는 hairline 1px 실선
- 영역 필은 시리즈 색 10% 워시. 텍스트(값·레이블·축·범례)는 ink 토큰만 사용 — 시리즈 색 텍스트 금지
- 단일 시리즈 라인은 범례 없음(제목이 시리즈명), 끝점 직접 레이블. 2+ 시리즈는 범례 필수
- 호버: 라인 차트는 크로스헤어 스냅 + 툴팁, 바/세그먼트는 마크 자체가 히트 타깃(비호버 마크 dim)
- 필터(기간 프리셋)는 차트 위 한 줄, 아래 콘텐츠 전체에 적용
- **차트 상태 필 팔레트는 CVD 검증 통과본만 사용** (validate_palette.js):
  - 다크(surface #141722): 초안 #4e7de0 · 검토 #bd831e · 승인대기 #8b7cff · 배포 #2fae6b
  - 라이트(surface #ffffff): #3f6ad0 · #b8770a · #6d5cf0 · #1d9d5f
  - 배지용 ink 색은 차트 필로 쓰지 않는다 (검증 실패 조합)

## 모션 & 인터랙션 시스템 (v0.4)

원칙: 모든 등장 모션은 `cubic-bezier(0.16, 1, 0.3, 1)`(ease-out-expo 계열) 180~420ms, 퇴장은 ease 120~200ms로 등장보다 짧게. `prefers-reduced-motion: reduce`에서 전부 비활성화.

**motion(구 framer-motion) 은 관문(`components/portal/motion.tsx`)을 지나서만** —
LazyMotion(domAnimation)+`m` 조합(~15kb gz)에 `MotionConfig reducedMotion="user"`.
역할 분담: 한 번 일어나고 끝나는 등장·호버는 CSS 토큰(anim-*), **자리가 바뀌는 것**
(위젯·행 재정렬의 layout 스프링, 목록 스태거)만 motion. 공통 스프링은 `layoutSpring` 하나.
⚠ `layout` 을 쓰는 요소에 `anim-fade-up` 을 같이 얹지 않는다 — fill:both 가 transform 을
고정해 layout 이동(transform 기반)이 조용히 죽는다(.card-hover 때 실증한 함정).

- **페이지 전환**: TanStack Router `defaultViewTransition` — View Transitions API로 크로스페이드 + 미세 상승
- **슬라이드 오버(Drawer)**: 사양서 상세는 모달이 아닌 우측 슬라이드 오버 패널(max 520px). 등장 280ms 슬라이드, 퇴장 200ms 후 언마운트(닫힘 애니메이션 보장). ESC/백드롭 클릭 닫기
- **모달**: scale-in(0.97→1 + 10px 상승) 200ms / scale-out 140ms, ESC 닫기
- **커맨드 팔레트(⌘K)**: 상단바 검색 버튼 또는 Cmd/Ctrl+K. 페이지·사양서 통합 검색, ↑↓/Enter/ESC 키보드 내비게이션, 그룹 헤더, kbd 힌트 표시
- **리스트 스태거**: 카드·타일은 `fade-up` 420ms + 항목당 60~80ms 지연
- **사이드바 접힘**: 섹션은 `grid-template-rows 0fr↔1fr` 트랜지션 200ms + 체브론 회전
- **토스트**: 우하단 스택, 성공 아이콘 + 220ms 등장, 3.2초 후 자동 소멸. 사용자 액션(승인 요청 등)에는 반드시 피드백 제공
- **프레스 피드백**: 주요 버튼·칩은 `active:scale-95`
- **상태 필터 칩**: 셀렉트 대신 카운트 포함 필터 칩 행 (선택: primary 틴트 + 보더)
