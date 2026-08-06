/**
 * 포인트 색상 관문 — 개인 설정.
 *
 * 색은 계정 설정이다: localStorage 는 백업, 정본은 서버(PUT /me/accent).
 * 화면 쪽은 html[data-accent] 가 강조 토큰 4개를 갈아끼우는 게 전부라
 * (styles.css의 accent 블록과 1:1) 컴포넌트는 아무것도 몰라도 된다.
 * swatch 는 선택 화면의 동그라미 색 — 다크 primary 값을 쓴다(선택 UI가 다크·라이트
 * 어느 테마에서든 "무슨 색인지"만 보이면 된다).
 */
import { useEffect, useState } from 'react'

import { apiSend } from './api'

export type Accent = 'navy' | 'violet' | 'blue' | 'green' | 'amber' | 'rose'

export const DEFAULT_ACCENT: Accent = 'navy'

export const ACCENTS: ReadonlyArray<{ key: Accent; swatch: string }> = [
  // 현대 남색이 기본 — 스와치는 밝힌 쪽(다크 값)으로. 브랜드 원색(#002C5F)은
  // 동그라미가 검게 보여 "무슨 색인지"가 안 읽힌다
  { key: 'navy', swatch: '#3f74b4' },
  { key: 'violet', swatch: '#8b7cff' },
  { key: 'blue', swatch: '#63a3ff' },
  { key: 'green', swatch: '#55cf85' },
  { key: 'amber', swatch: '#f0a84e' },
  { key: 'rose', swatch: '#f27a9d' },
]

const STORAGE_KEY = 'accent'

const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.key === v)

function apply(accent: Accent) {
  // 기본(현대 남색)은 속성 자체를 지운다 — CSS 에 navy 블록이 없는 것과 짝
  if (accent === DEFAULT_ACCENT) delete document.documentElement.dataset.accent
  else document.documentElement.dataset.accent = accent
}

/** 수화 직후 저장값 적용 — 셸 밖 화면(로그인)도 물들도록 __root 에서 부른다 */
export function applySavedAccent() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (isAccent(saved)) apply(saved)
}

export function useAccent() {
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isAccent(saved)) setAccentState(saved)
  }, [])
  const setAccent = (a: Accent) => {
    setAccentState(a)
    apply(a)
    localStorage.setItem(STORAGE_KEY, a)
    void apiSend('PUT', '/me/accent', { accent: a })
  }
  return { accent, setAccent }
}
