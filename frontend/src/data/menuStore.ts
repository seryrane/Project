/**
 * 메뉴 활성 정본 관문 — 메뉴 관리 화면의 부제("정본은 이 목록이다 — LNB·팔레트·권한이
 * 함께 본다")를 **실제로 지키는 자리**다 (FR-032 동적 메뉴 노출).
 *
 * ⚠⚠ 이 관문이 없던 동안 LNB(AppShell)·팔레트(CommandPalette)는 data/menus 를 한 줄도
 * 안 봤다 — 시드의 FAQ 가 꺼져(취소선) 있는데 LNB 엔 FAQ 가 살아 있었다(2026-08-25 웹
 * 실사). 화면이 지키지 못할 말을 하던 자리다(specFieldStore·auditStore 와 같은 병).
 *
 * 규칙: **값은 경로(path)로 잇는다** — nav.ts(라벨·아이콘 정본)와 menus.ts(활성·권한
 * 정본)는 파일이 다르므로, 이름이 아니라 경로가 다리다(§15 이름 어긋남 방지).
 * 본개발에서는 GET /api/menus 가 이 관문을 대체한다.
 */
import { useSyncExternalStore } from 'react'

import { menuItems } from './menus'

/** 꺼진 메뉴 경로 집합 — 스냅샷은 불변, 바뀔 때만 새 Set (useSyncExternalStore 규약) */
let offPaths: ReadonlySet<string> = new Set(menuItems.filter((m) => !m.active).map((m) => m.path))

const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setMenuActive(path: string, active: boolean) {
  const has = offPaths.has(path)
  if (active === !has) return
  const next = new Set(offPaths)
  if (active) next.delete(path)
  else next.add(path)
  offPaths = next
  notify()
}

/** LNB·팔레트가 구독한다 — 항목을 그리기 전에 여기서 걸러진다 */
export function useInactiveMenuPaths(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => offPaths, () => offPaths)
}
