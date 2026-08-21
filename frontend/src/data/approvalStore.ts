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
 * 서버로 옮길 때의 엔드포인트·스키마는 `docs/API_설계.md` §2 (FR-114 수용기준과 짝지어 둠).
 *
 * ⚠ 이 파일은 **다른 스토어를 부르지 않는다.** 사양서·배포 상태까지 함께 움직이는
 *   일은 `data/workflow.ts` 가 맡는다 — 스토어끼리 서로 부르면 순환 참조가 된다.
 */
import { useSyncExternalStore } from 'react'

import { SPEC_APPROVAL_LINE, approvalRequests } from './approvals'
import { membersWithRole } from './members'
import type { ApprovalRequest, ApprovalStep } from './approvals'

/* ── 결재선 (설정으로 바뀐다 — FR-114 ②) ────────────────────────── */

/** ASM-011: 결재선은 최대 3단계, 조건부 분기는 범위 밖이다 */
export const MAX_APPROVAL_STEPS = 3

let line: Array<ApprovalStep> = SPEC_APPROVAL_LINE

/**
 * 결재선을 바꾼다 — 빈 결재선과 3단계 초과는 받지 않는다(받으면 상신이 갈 곳을 잃는다).
 *
 * ⚠ **존재하지 않는 결재자도 받지 않는다**(2026-08-18): 화면이 회원 목록에서 고르게
 * 바뀌었지만, 관문은 화면을 믿지 않는다 — 이름이 회원 정본에 없으면 그 건은 영영
 * 누구의 차례도 되지 않는다. 그 역할을 가진 사람인지까지 본다.
 */
export function setApprovalLine(next: Array<Omit<ApprovalStep, 'seq'>>): boolean {
  if (next.length === 0 || next.length > MAX_APPROVAL_STEPS) return false
  if (next.some((s) => s.name.trim() === '')) return false
  if (next.some((s) => !membersWithRole(s.role).some((m) => m.name === s.name.trim()))) return false
  line = next.map((s, i) => ({ ...s, seq: i + 1, name: s.name.trim() }))
  notify()
  return true
}

export function approvalLine(): Array<ApprovalStep> {
  return line
}

/* ── 결재함 ──────────────────────────────────────────────────────── */

/**
 * ⚠ **'취소'는 '반려'·'회수'와 다른 것이다** (2026-08-21, 동일 사양 다중 수정 요청 충돌 관리).
 *   반려 = "이 내용은 틀렸다" — 요청자가 고쳐서 재요청한다.
 *   회수 = "내가 올린 것을 내가 내린다" — 요청자 본인만, 아무도 판단하기 전에만.
 *   취소 = "이 건이 틀린 게 아니라, **같은 사양서의 다른 건으로 간다**" — 판단하는 쪽이
 *          사유를 내고 내린다. 겹친 요청 중 채택되지 않은 것이 여기로 간다.
 * 셋을 한 낱말로 뭉치면 요청자가 "내 요청이 왜 반려됐지"를 영영 오해한다.
 */
export type RequestState = '진행 중' | '승인 완료' | '반려' | '회수' | '취소' | '반영 완료'

export interface TrailEntry {
  seq: number
  approver: string
  action: '승인' | '반려' | '취소'
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

/** 이 사양서로 지금 **진행 중인** 결재 중 **가장 먼저 올라온 것**.
 *  ⚠ 겹칠 수 있다(아래 `activeRequestsOfSpec`) — 한 건만 필요한 자리(잠금 띠·회수 버튼)가
 *    이것을 쓴다. "몇 건이 겹쳤나"를 물을 때는 반드시 복수형 쪽을 부른다. */
export function activeRequestOfSpec(specId: string): ApprovalRecord | undefined {
  return records.find((r) => r.specId === specId && r.state === '진행 중')
}

/**
 * 이 사양서로 지금 진행 중인 결재 **전부** — 겹침(동일 사양 다중 수정 요청)을 세는 자리.
 *
 * ⚠⚠ **겹침은 막지 않는다**(고객 2026-07-20 회의): "권한이 있는 사람이 둘 다 같은 사양을
 * 수정하고 싶으면 둘 다 신청할 수 있어야 한다 — 누가 먼저 했다고 다른 사람 걸 막는 건
 * 안 될 것 같다." 그래서 이 관문은 **세기만 한다**. 막는 자리는 딱 하나, **반영(배포)**이다
 * (같은 회의: "2개 이상이면 반영을 못하게 검증하는 것도 있어야겠다").
 */
export function activeRequestsOfSpec(specId: string): Array<ApprovalRecord> {
  return records.filter((r) => r.specId === specId && r.state === '진행 중')
}

/** **아직 반영되지 않은** 요청 — 심사 중이거나, 승인은 났는데 배포는 안 된 것.
 *  겹침을 세는 기준이 이것이다(아래 `conflictedSpecIds` 주석 참고). */
export function unsettledRequestsOfSpec(specId: string): Array<ApprovalRecord> {
  return records.filter((r) => r.specId === specId && UNSETTLED.has(r.state))
}

/** 요청이 **끝나지 않은** 상태 — 대기 풀에 남아 있다는 뜻 */
const UNSETTLED = new Set<RequestState>(['진행 중', '승인 완료'])

/**
 * 겹친 사양서 id — 진행 중 요청이 **둘 이상**인 사양서.
 *
 * ⚠ 목록을 인자로 받는다: 화면은 `useApprovalList()` 로 구독한 그 배열을 그대로 넘긴다.
 *   모듈 상태를 몰래 읽으면 구독을 안 탄 화면이 옛 숫자를 그린다(규약 §10).
 */
export function conflictedSpecIds(list: Array<ApprovalRecord>): Set<string> {
  const seen = new Map<string, number>()
  for (const r of list) {
    if (!UNSETTLED.has(r.state) || !r.specId) continue
    seen.set(r.specId, (seen.get(r.specId) ?? 0) + 1)
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([id]) => id))
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
 * ✔ **채택됨 (2026-08-19 사용자 결정).** 원래는 요구사항 밖이었다 — 정의서의 "회수" 세 곳은
 * 전부 *권한 회수*(FR-024·FR-030) 뜻이고 FR-114 는 요청–승인–반려–재요청까지만 말한다.
 * 상신 직후 오타를 발견하는 실무를 보고 넣었고, 그대로 쓰기로 정했다. **FR-114 의 확장**으로
 * 다루므로 요구사항 추적표에 올릴 때 그 사실을 함께 적는다(정의서에 없던 기능이다).
 *
 * ⚠ **한 단계라도 승인이 찍혔으면 못 내린다** — 이미 판단한 사람이 있는 건을 요청자가
 *   지우면 그 판단의 기록이 사라진다.
 */
/**
 * 취소 — **겹친 요청 중 채택되지 않은 것**을 결재자가 사유를 내고 내린다.
 *
 * 근거(2026-07-20 회의): "동일한 항목이 두 개 있으면 반영을 관리하는 담당자가 수기로
 * 검증하고 **둘 중 하나는 취소해야 된다, 그러면 취소 사유를 내고 취소한다**."
 *
 * ⚠ **사유가 없으면 받지 않는다.** 남이 올린 요청을 내리는 일이다 — 요청자가 나중에
 *   "왜 내 것이 사라졌나"를 물었을 때 답이 없으면 이 기능은 신뢰를 잃는다.
 * ⚠ 이미 판단이 찍힌 건도 취소할 수 있다(회수와 다른 점). 1차 승인까지 갔더라도 겹친
 *   다른 건이 채택되면 이 건은 갈 곳이 없다 — 자국(trail)은 그대로 남기고 상태만 닫는다.
 */
export function cancelRequest(id: string, reason: string, by: string): ApprovalRecord | null {
  const rec = records.find((r) => r.id === id)
  /* ⚠ **승인이 난 건도 반영 전이면 내릴 수 있다.** 겹친 둘이 다 승인까지 갔을 때
     아무것도 못 내리면 그 사양서는 영영 배포되지 않는다(막다른 골목). 반영이 곧
     되돌릴 수 없는 지점이고, 그 전까지는 사람이 고를 수 있어야 한다. */
  if (!rec || !UNSETTLED.has(rec.state)) return null
  if (reason.trim() === '') return null
  const entry: TrailEntry = {
    seq: rec.step[0],
    approver: by,
    action: '취소',
    at: today(),
    opinion: reason.trim(),
  }
  const next: ApprovalRecord = { ...rec, state: '취소', myTurn: false, trail: [...rec.trail, entry] }
  records = records.map((r) => (r.id === id ? next : r))
  notify()
  return next
}

/**
 * 반영됐다 — 배포가 끝난 사양서의 **승인 완료** 요청을 대기 풀에서 내린다.
 *
 * ⚠⚠ 이 자리가 없으면 겹침이 **거짓으로** 뜬다: 배포까지 끝난 옛 요청이 '승인 완료'로
 * 계속 남아, 나중에 새 변경 요청이 하나 들어오면 둘이 되어 "겹쳤다"고 말한다.
 * 대기 풀은 **반영되면 비워져야** 한다.
 */
export function markRequestsReflected(specId: string): void {
  // ⚠ 바꿀 것이 없으면 알리지 않는다 — 배포에 실린 사양서 수만큼 화면이 다시 그려진다
  const hit = (r: ApprovalRecord) => r.specId === specId && r.state === '승인 완료'
  if (!records.some(hit)) return
  records = records.map((r) => (hit(r) ? { ...r, state: '반영 완료' } : r))
  notify()
}

export function withdrawRequest(id: string, by: string): boolean {
  const rec = records.find((r) => r.id === id)
  if (!rec || rec.state !== '진행 중') return false
  if (rec.trail.length > 0) return false
  if (rec.requester !== by) return false
  records = records.map((r) => (r.id === id ? { ...r, state: '회수', myTurn: false } : r))
  notify()
  return true
}
