# DESIGN.md — HMG 통합 관리자 포털 (잠정 디자인 언어 v0.1)

> Data-Inside 가이드 수령 전까지의 잠정 표준. 수령 시 색·타이포 토큰만 교체한다.
> 근거: docs/UI_ADOPTION.md (샘플 채택안). 참조 톤: Stripe(밝은 데이터 admin) + Figma 샘플(다크 사이드바 + 밝은 콘텐츠) + Behance Aivora/Rentier(모던 SaaS 마감).

## Overview

밝은 근백색 캔버스 위 화이트 카드, 딥 네이비 다크 사이드바, 인디고 단일 액센트의 데이터 중심 엔터프라이즈 admin. 상태는 원색 배경이 아니라 **소프트 틴트 배지**로만 표현한다. 장식보다 밀도·정렬·여백으로 "세련됨"을 만든다.

## Colors

```
canvas        #f6f7f9   페이지 배경
surface       #ffffff   카드/모달/입력
hairline      #e5e9f0   경계선 (1px)
ink           #1a1f36   본문 제목
ink-muted     #4f566b   보조 텍스트
ink-subtle    #8792a2   레이블/캡션
primary       #635bff   액센트 (버튼, 활성 메뉴, 링크, 포커스링)
primary-deep  #5148d6   hover
sidebar       #101828   사이드바 배경
sidebar-ink   #cbd5e1   사이드바 텍스트 (활성: #ffffff + primary 배경)
```

상태(Semantic) — 배경은 틴트, 글자는 진한 동일 계열:

```
draft    초안      bg #eef1f5  text #5b6472
review   검토 중   bg #fff3e0  text #9a5b00
pending  승인 대기 bg #efeaff  text #6440d4
deployed 배포 완료 bg #e3f5ea  text #177245
danger   삭제/반려 bg #fdecec  text #b3261e
```

Diff(버전 비교): 변경 전 `bg #fdecec + 취소선 text #b3261e`, 변경 후 `bg #e3f5ea text #146c43`, 무변경 중립 surface.

## Typography

- 폰트: `Pretendard Variable, Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif` (외부 로드 없음, 시스템 폴백)
- 스케일: 페이지 제목 24/700 · 섹션·모달 제목 18/600 · 카드 제목 16/600 · 본문 14/400 · 레이블·캡션 12/500(ink-subtle) · 수치는 tabular-nums
- ID·버전(SP-001, v2.3)은 monospace 계열로 구분

## Layout & Shape

- 사이드바 고정 240px, 콘텐츠 max-width 1280px, 콘텐츠 패딩 32px
- 간격 단위 4px 체계 (8/12/16/24/32)
- radius: 카드·모달 12px, 버튼·입력 8px, 배지·칩 full
- 그림자: 카드 `0 1px 2px rgb(16 24 40 / 6%)`, 모달 `0 20px 48px rgb(16 24 40 / 24%)` — 그 외 사용 금지, 경계는 hairline으로

## Components

- **버튼**: primary(인디고 채움/화이트 텍스트), secondary(화이트 + hairline 테두리), danger는 확인 단계에서만. 높이 36px
- **상태 배지**: 틴트 배경 + 12px/500 텍스트, 아이콘 없이
- **카드(사양서)**: ID+상태배지 상단, 제목 16/600, 버전 칩 우상단, 태그 칩 행, 핵심 스펙 미리보기(캔버스 톤 인셋 박스, label/value 2열), 하단 담당자 아바타+수정일+액션
- **사이드바**: 섹션 레이블(11px 대문자 톤) + 아이템(활성: primary 배경 라운드), 뱃지 카운트는 primary 원형
- **모달**: 중앙, max-width 960px(비교)/720px(상세), 배경 딤 `rgb(16 24 40 / 55%)`
- **탭**: 하단 2px 언더라인(primary), 카운트는 회색 칩
- **테이블/타임라인**: 행 hover는 canvas 톤, 셀 패딩 12px

## Rules

1. 액센트(인디고)는 화면당 주요 액션 1~2곳에만 — 장식 사용 금지
2. 상태별 원색 배경으로 카드 전체를 칠하지 않는다 (배지로만)
3. 텍스트 대비 WCAG AA 이상 유지
4. 다크 테마는 아직 정의하지 않음 (요구 발생 시 Linear 토큰 참조)
