/**
 * 감사 로그 **쓰기 관문** — 화면이 "남습니다"라고 말한 것을 실제로 남긴다.
 *
 * ⚠⚠ 이 관문이 없던 동안 엑셀 업로드 화면은 "업로드 사실은 감사 로그에 남습니다"라고
 * 적어 두고 **아무 데도 안 남겼다**(2026-08-19 실측 — 프런트에는 `/audit` 읽기만 있었다).
 * 이 제품이 계속 잡아 온 병과 같은 부류다: 토스트는 떴는데 상태는 그대로인 화면.
 * 화면이 약속한 것은 화면이 지킨다 — 지킬 수 없으면 그 문장을 지운다.
 *
 * 정본은 서버(`POST /api/audit`)다. 서버가 없으면(mock 시연) 이 모듈이 기억한다 —
 * 두 경우 모두 개인정보 화면의 감사 표에 **그 줄이 실제로 보인다**.
 */
import { useSyncExternalStore } from 'react'

import { apiPost } from '#/lib/api'

export interface AuditEntry {
  at: string
  user: string
  action: string
  target: string
  reason: string
}

let localLog: Array<AuditEntry> = []
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  // ⚠ 서버와 **같은 모양**이어야 한다 — 감사 표는 이 문자열을 그대로 시간순으로 세운다
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 화면이 이 곳에 남긴다. 서버가 있으면 서버에도 알린다(없으면 조용히 로컬만). */
export function recordAudit(entry: { action: string; target: string; reason: string }, user = '김현대'): AuditEntry {
  const row: AuditEntry = { at: stamp(), user, ...entry }
  localLog = [row, ...localLog]
  notify()
  // 서버 왕복을 기다리지 않는다 — 감사 기록 때문에 사람이 다음 걸음을 못 밟으면 안 된다
  void apiPost('/audit', entry)
  return row
}

export function useLocalAudit(): Array<AuditEntry> {
  return useSyncExternalStore(
    subscribe,
    () => localLog,
    () => localLog,
  )
}

/** 서버 목록과 겹치지 않게 이어 붙인다 — 서버가 살아 있으면 같은 줄이 두 번 온다 */
export function mergeAudit<T extends AuditEntry>(server: ReadonlyArray<T>, local: ReadonlyArray<AuditEntry>): Array<T> {
  const key = (e: AuditEntry) => `${e.at}|${e.user}|${e.action}|${e.target}`
  const seen = new Set(server.map(key))
  return [...local.filter((e) => !seen.has(key(e))), ...server] as Array<T>
}
