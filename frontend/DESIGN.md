# DESIGN.md — HMG 통합 관리자 포털 (잠정 디자인 언어 v0.2 · Dark SaaS)

> Data-Inside 가이드 수령 전까지의 잠정 표준. 수령 시 토큰만 교체한다.
> v0.2에서 밝은 admin 톤 → **다크 SaaS 톤으로 전면 전환** (사용자 결정, 2026-08-05).
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

- **퍼플 그라디언트**: 주요 CTA·활성 메뉴는 `linear-gradient(to right, #8b7cff, #a08cff)`
- **글로우 섀도**: 그라디언트 요소에 `0 4px 16~18px rgb(139 124 255 / 30~35%)`
- **앰비언트 글로우**: 콘텐츠 배경에 `bg-primary/15 blur(140px)` radial 1~2개 (pointer-events 없음, 장식)
- **글래스**: 상단바는 `bg-canvas/75 + backdrop-blur`; 모달 오버레이는 `black/65 + blur-sm`
- 카드 hover: `-translate-y-0.5` + `border-primary/40` + 퍼플 글로우 12%

## Typography

- 폰트: `Pretendard Variable, Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif`
- 스케일: 페이지 제목 24/700 · 모달 제목 18/600 · 카드 제목 16/600 · 본문 14/400 · 레이블 12/500(ink-subtle) · 수치 tabular-nums · ID/버전은 monospace

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

## Rules

1. 퍼플 액센트·그라디언트는 화면당 1~2곳 (주요 CTA + 활성 메뉴) — 남용 금지
2. 상태는 배지로만, 카드 전체를 상태색으로 칠하지 않는다
3. 다크 배경에서 텍스트 대비 WCAG AA 유지 (muted 이하 텍스트를 본문에 쓰지 않기)
4. 앰비언트 글로우는 화면당 최대 2개, 채도 15% 이하
5. 라이트 테마는 미정의 — 요구 발생 시 v0.1 토큰(Stripe 계열)을 복원해 테마 토글로 제공
