/**
 * 결재함 + 결재선 **정본** — FR-114(배포 승인 관리 워크플로, 우선순위 M).
 *
 * ⚠⚠ 이 관문이 없던 동안 결재는 **올라가기만 하고 내려오지 않았다**(2026-08-18):
 * 상신하면 사양서 상태는 바뀌는데 결재함에는 안 생겼고(결재함은 고정 mock 10건),
 * 승인 관리에서 [승인]을 눌러도 그건 그 화면의 `useState` 라 사양서로 돌아가면
 * 여전히 '승인 대기'였다. 승인자가 처리한 화면과 요청자가 보는 화면이 다른 말을 했다.
 *
 * FR-114 수용기준과 이 파일의 짝:
 *   ① 요청–승인–반려–재요청 전 경로   → create* · decide · (재요청은 workflow.ts)
 *   ② 승인선을 설정으로 변경할 수 있다 → useApprovalLine / setApprovalLine
 *   ③ 각 단계에서 담당자에게 알림      → myTurnCount (벨이 읽는다)
 *   ④ 승인 이력이 사후 조회된다        → ApprovalRecord.trail
 *   ⑤ 결재선 최대 3단계·분기 없음      → MAX_APPROVAL_STEPS (ASM-011)
 *
 * ⚠ 이 파일은 **다른 스토어를 부르지 않는다.** 사양서·배포 상태까지 함께 움직이는
 *   일은 `data/workflow.ts` 가 맡는다 — 스토어끼리 서로 부르면 순환 참조가 된다.
 */
import { useSyncExternalStore } from 'react'

import { SPEC_APPROVAL_LINE, approvalRequests } from './approvals'
import type { ApprovalRequest, ApprovalStep } from './approvals'

/* ── 결재선 (설정으로 바뀐다 — FR-114 ②) ────────────────────────── */

/** ASM-011: 결재선은 최대 3단계, 조건부 분기는 범위 밖이다 */
export const MAX_APPROVAL_STEPS = 3

let line: Array<ApprovalStep> = SPEC_APPROVAL_LINE

/** 결재선을 바꾼다 — 빈 결재선과 3단계 초과는 받지 않는다(받으면 상신이 갈 곳을 잃는다) */
export function setApprovalLine(next: Array<Omit<ApprovalStep, 'seq'>>): boolean {
  if (next.length === 0 || next.length > MAX_APPROVAL_STEPS) return false
  if (next.some((s) => s.name.trim() === '')) return false
  line = next.map((s, i) => ({ ...s, seq: i + 1, name: s.name.trim() }))
  notify()
  return true
}

export function approvalLine(): Array<ApprovalStep> {
  return line
}

/* ── 결재함 ──────────────────────────────────────────────────────── */

export type RequestState = '진행 중' | '승인 완료' | '반려' | '회수'

export interface TrailEntry {
  seq: number
  approver: string
  action: '승인' | '반려'
  at: string
  /** 반려는 사유가 **필수**다(규약 §2) — 승인 의견은 비어 있을 수 있다 */
  opinion: string
}

export interface ApprovalRecord extends ApprovalRequest {
  state: RequestState
  /** 결재선 사본 — 상신 시점의 선을 그대로 안고 간다.
   *  ⚠ 설정이 바뀌어도 **이미 올라간 건의 결재선은 안 바뀐다** — 결재 중에 선이 움직이면
   *    "누가 승인해야 하는가"가 사후에 달라져 이력이 못 믿을 것이 된다. */
  line: Array<ApprovalStep>
  trail: Array<TrailEntry>
}

/**
 * 시드 mock 을 결재함 모양으로 올린다.
 *
 * ⚠⚠ 시드는 `step: [2, 3]` 처럼 **3단계 결재**를 말하는데 결재선 정본은 2단계였다 —
 * 그대로 두면 2단계짜리 선에서 3단계를 찾다가 `line[2]` 가 undefined 가 되어 승인
 * 한 번에 터진다(2026-08-18, 화면에서 잡음). 시드의 단계 수를 **선의 길이로 맞춘다**:
 * mock 이 정본을 이기면 안 된다.
 */
const seeded: Array<ApprovalRecord> = approvalRequests.map((r) => {
  const total = SPEC_APPROVAL_LINE.length
  const cur = Math.min(r.step[0], total)
  return {
    ...r,
    step: [cur, total] as [number, number],
    approver: SPEC_APPROVAL_LINE[cur - 1].name,
    state: '진행 중' as const,
    line: SPEC_APPROVAL_LINE,
    // 앞 단계는 이미 통과했다는 뜻이라 자국을 남긴다(사후 조회에서 빈칸이 되지 않게)
    trail: SPEC_APPROVAL_LINE.slice(0, cur - 1).map((a) => ({
      seq: a.seq,
      approver: a.name,
      action: '승인' as const,
      at: r.requestedAt,
      opinion: '',
    })),
  }
})

let records: Array<ApprovalRecord> = seeded
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useApprovalList(): Array<ApprovalRecord> {
  return useSyncExternalStore(
    subscribe,
    () => records,
    () => records,
  )
}

/** 결재선도 같은 구독을 탄다 — 설정을 바꾸면 화면이 함께 다시 그린다 */
export function useApprovalLine(): Array<ApprovalStep> {
  return useSyncExternalStore(
    subscribe,
    () => line,
    () => line,
  )
}

export function findRequest(id: string): ApprovalRecord | undefined {
  return records.find((r) => r.id === id)
}

/** 이 사양서로 지금 **진행 중인** 결재. 끝난 건은 안 잡는다(재요청하면 새 건이 선다). */
export function activeRequestOfSpec(specId: string): ApprovalRecord | undefined {
  return records.find((r) => r.specId === specId && r.state === '진행 중')
}

/** 이 사양서의 결재 이력 전부 — 사후 조회(FR-114 ④), 최근 것이 앞 */
export function requestsOfSpec(specId: string): Array<ApprovalRecord> {
  return records.filter((r) => r.specId === specId)
}

/** 내 차례 건수 — 알림 벨이 읽는다(FR-114 ③) */
export function myTurnCount(): number {
  return records.filter((r) => r.state === '진행 중' && r.myTurn).length
}

/* ── 만들기 ──────────────────────────────────────────────────────── */

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 기한은 상신일 + 3일 — 프로토타입 규칙 하나로 고정(난수 금지, 규약 §10) */
function deadlineFrom(base: Date, days = 3): string {
  const d = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function nextId(): string {
  const year = new Date().getFullYear()
  const max = records.reduce((m, r) => Math.max(m, Number(r.id.split('-').pop()) || 0), 0)
  return `APR-${year}-${String(max + 1).padStart(4, '0')}`
}

export interface NewRequestInput {
  kind: ApprovalRequest['kind']
  specId?: string
  deployId?: string
  title: string
  version?: string
  type: ApprovalRequest['type']
  requester: string
  requesterTeam: string
  summary: string
  changes: ApprovalRequest['changes']
  urgent?: boolean
}

export function createRequest(input: NewRequestInput): ApprovalRecord {
  const now = new Date()
  const rec: ApprovalRecord = {
    id: nextId(),
    kind: input.kind,
    specId: input.specId,
    deployId: input.deployId,
    title: input.title,
    version: input.version,
    type: input.type,
    urgent: input.urgent ?? false,
    requester: input.requester,
    requesterTeam: input.requesterTeam,
    // 지금 차례의 결재자 — 단계가 넘어가면 함께 바뀐다
    approver: line[0].name,
    requestedAt: today(),
    deadline: deadlineFrom(now),
    waitingDays: 0,
    step: [1, line.length],
    // 데모 계정(김현대)이 결재선에 있으면 내 차례로 잡힌다 — 알림·[내 차례] 탭이 산다
    myTurn: line[0].name === '김현대',
    summary: input.summary,
    changes: input.changes,
    state: '진행 중',
    line,
    trail: [],
  }
  records = [rec, ...records]
  notify()
  return rec
}

/* ── 상태 전이 ───────────────────────────────────────────────────── */

export interface DecideResult {
  ok: boolean
  /** 마지막 단계까지 승인이 끝났는가 — 부르는 쪽(workflow)이 사양서·배포를 움직인다 */
  finished: boolean
  record?: ApprovalRecord
}

/**
 * 승인·반려. 승인은 **다음 단계로 넘어가고**, 마지막 단계에서만 끝난다.
 * ⚠ 반려는 사유가 없으면 받지 않는다 — 되돌릴 수 없는 판단은 이유가 남아야 한다(규약 §2).
 */
export function decideRequest(
  id: string,
  action: '승인' | '반려',
  opinion: string,
  by: string,
): DecideResult {
  const rec = records.find((r) => r.id === id)
  if (!rec || rec.state !== '진행 중') return { ok: false, finished: false }
  if (action === '반려' && opinion.trim() === '') return { ok: false, finished: false }

  const [cur, total] = rec.step
  const entry: TrailEntry = { seq: cur, approver: by, action, at: today(), opinion: opinion.trim() }

  let next: ApprovalRecord
  if (action === '반려') {
    next = { ...rec, state: '반려', myTurn: false, trail: [...rec.trail, entry] }
  } else if (cur >= total) {
    next = { ...rec, state: '승인 완료', myTurn: false, trail: [...rec.trail, entry] }
  } else if (!rec.line[cur]) {
    // ⚠ 결재선이 줄어든 뒤 남은 건 — 갈 곳이 없으면 여기서 끝낸다(멈춰 서지 않게)
    next = { ...rec, state: '승인 완료', myTurn: false, trail: [...rec.trail, entry] }
  } else {
    const nextStep = rec.line[cur] // 0-based: 다음 단계
    next = {
      ...rec,
      step: [cur + 1, total],
      approver: nextStep.name,
      myTurn: nextStep.name === '김현대',
      trail: [...rec.trail, entry],
    }
  }
  records = records.map((r) => (r.id === id ? next : r))
  notify()
  return { ok: true, finished: next.state === '승인 완료', record: next }
}

/**
 * 회수 — 요청자가 올린 것을 도로 내린다.
 *
 * ⚠⚠ **요구사항 밖 기능이다.** 02_요구사항정의서의 "회수" 세 곳은 전부 *권한 회수*
 * (FR-024·FR-030) 뜻이고, FR-114 는 요청–승인–반려–재요청만 말한다. 상신 직후 오타를
 * 발견하는 실무를 보고 2026-08-18 사용자 문의로 넣었다 — 요구사항 확정 때 빠지면
 * 이 함수와 호출부(승인 관리 [내 요청] · 사양서 상세)만 걷어내면 된다.
 *
 * ⚠ **한 단계라도 승인이 찍혔으면 못 내린다** — 이미 판단한 사람이 있는 건을 요청자가
 *   지우면 그 판단의 기록이 사라진다.
 */
export function withdrawRequest(id: string, by: string): boolean {
  const rec = records.find((r) => r.id === id)
  if (!rec || rec.state !== '진행 중') return false
  if (rec.trail.length > 0) return false
  if (rec.requester !== by) return false
  records = records.map((r) => (r.id === id ? { ...r, state: '회수', myTurn: false } : r))
  notify()
  return true
}
