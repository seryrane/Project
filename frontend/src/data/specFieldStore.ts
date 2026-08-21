/**
 * 사양서 **필드 정의 정본** 관문 (FR-115 이관이 실제로 붙는 자리).
 *
 * ⚠⚠ 이 관문이 없던 동안 필드 정의의 정본은 **상세 화면의 `useState`** 였다. 그래서
 * 엑셀의 '필드 정의' 시트를 올려도 붙일 곳이 없어, 업로드 화면은 검증만 하고
 * `return rows.length` 로 **"n건 반영했습니다"라고 말만 했다**(2026-08-19 실측).
 * 어제 감사 로그에서 고친 것과 같은 병이다 — 화면이 지키지 못할 말을 했다.
 *
 * 규칙 하나: **같은 필드명은 덮어쓰고, 없으면 더한다.** 대장(사양서)은 이미 있으면
 * 건너뛰지만 필드는 *정의*라 갱신이 정상이다 — 엑셀에서 고쳐 다시 올리는 것이 이 제품의
 * 기본 왕복이기 때문이다. 그래서 같은 파일을 두 번 올려도 표가 두 배가 되지 않는다.
 */
import { useSyncExternalStore } from 'react'

import { isSeededSpec } from './specStore'
import { specFieldDefs } from './specFields'
import type { FieldDef } from './specFields'

const table = new Map<string, Array<FieldDef>>()
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 시드 4건만 mock 필드표를 갖는다 — 새 사양서는 **빈 표**로 시작한다(규약: 남의 필드를 물려주지 않는다) */
function seedOf(specId: string): Array<FieldDef> {
  return isSeededSpec(specId) ? specFieldDefs : []
}

export function getSpecFields(specId: string): Array<FieldDef> {
  const found = table.get(specId)
  if (found) return found
  const seeded = seedOf(specId)
  table.set(specId, seeded)
  return seeded
}

export function useSpecFields(specId: string): Array<FieldDef> {
  return useSyncExternalStore(
    subscribe,
    () => getSpecFields(specId),
    () => getSpecFields(specId),
  )
}

/** 화면이 [전체 저장] 했을 때 — 정본을 통째로 바꾼다 */
export function setSpecFields(specId: string, fields: Array<FieldDef>) {
  table.set(specId, fields)
  notify()
}

/**
 * 엑셀 이관 — 이름이 같으면 덮어쓰고 없으면 더한다.
 * 돌려주는 값은 **실제로 붙은 행 수**다: 화면이 "n건 반영"이라 말할 근거가 여기서 나온다.
 */
export function mergeSpecFields(specId: string, incoming: Array<Omit<FieldDef, 'no'>>): number {
  if (incoming.length === 0) return 0
  const current = [...getSpecFields(specId)]
  for (const row of incoming) {
    const at = current.findIndex((f) => f.name === row.name)
    if (at >= 0) current[at] = { ...current[at], ...row }
    else current.push({ ...row, no: 0 })
  }
  // 번호는 표의 자리 번호다 — 합친 뒤 다시 매긴다(구멍이 나면 사람이 "빠졌나" 하고 센다)
  table.set(
    specId,
    current.map((f, i) => ({ ...f, no: i + 1 })),
  )
  notify()
  return incoming.length
}
