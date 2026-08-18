/**
 * 배포 목록 **정본** — FR-114 의 뒷단(요청이 승인되면 배포가 선다).
 *
 * ⚠⚠ 이 관문이 없던 동안 [배포 승인 요청]은 **토스트만 쏘고** 아무 데도 안 남았다
 * (2026-08-18): 결재함에도 안 생기고 배포 목록에도 안 서서, 요청한 사람이 다시 들어오면
 * 자기가 뭘 눌렀는지 알 길이 없었다. 1판에서 고친 사양서 [승인 요청]과 같은 병이다.
 *
 * ⚠ 사양서·결재함을 부르지 않는다 — 잇는 일은 `data/workflow.ts` 가 한다.
 */
import { useSyncExternalStore } from 'react'

import { deploys as initialDeploys } from './deploys'
import type { Deploy } from './deploys'

let list: Array<Deploy> = initialDeploys
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useDeployList(): Array<Deploy> {
  return useSyncExternalStore(
    subscribe,
    () => list,
    () => list,
  )
}

export function findDeploy(id: string): Deploy | undefined {
  return list.find((d) => d.id === id)
}

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function nextId(): string {
  const year = new Date().getFullYear()
  const max = list.reduce((m, d) => Math.max(m, Number(d.id.split('-').pop()) || 0), 0)
  return `DEP-${year}-${String(max + 1).padStart(4, '0')}`
}

export interface NewDeployInput {
  version: string
  env: Deploy['env']
  owner: string
  specs: Deploy['specs']
  changes: Array<string>
}

/** 요청 — **승인 전이라 '대기'로 태어난다.** 승인자는 아직 미정이다(0 이 아니라 미정). */
export function createDeploy(input: NewDeployInput): Deploy {
  const d: Deploy = {
    id: nextId(),
    version: input.version,
    env: input.env,
    status: '대기',
    changes: input.changes,
    specs: input.specs,
    owner: input.owner,
    at: stamp(),
    scheduled: true,
    durationMin: null,
    approver: null,
  }
  list = [d, ...list]
  notify()
  return d
}

/** 승인이 끝나면 배포가 시작된다 — 승인자를 적고 '진행중'으로 올린다 */
export function markDeployApproved(id: string, approver: string): boolean {
  const d = list.find((x) => x.id === id)
  if (!d || d.status !== '대기') return false
  list = list.map((x) => (x.id === id ? { ...x, status: '진행중', approver } : x))
  notify()
  return true
}

/** 반려·회수 — 배포는 서지 않는다. 목록에서 지우지 않고 **롤백 자리로 남긴다**:
 *  "요청했다가 반려됐다"는 사실 자체가 배포 이력이다(지우면 왜 안 나갔는지 모른다). */
export function markDeployRejected(id: string): boolean {
  const d = list.find((x) => x.id === id)
  if (!d || d.status !== '대기') return false
  list = list.map((x) => (x.id === id ? { ...x, status: '롤백' } : x))
  notify()
  return true
}
