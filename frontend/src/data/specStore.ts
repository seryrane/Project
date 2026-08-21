/**
 * 사양서 정본 **관문** — 세는 곳과 바꾸는 곳을 한 곳으로 모은다.
 *
 * ⚠⚠ 이 관문이 없던 동안 대시보드가 손으로 적은 128건·승인 대기 7을 말하고
 * 사양서 관리가 4건·1건을 말했다 — 같은 이름의 숫자가 화면마다 달랐다(규약 §10,
 * 2026-08-18 실측). 그리고 목록 카드의 [승인 요청]은 토스트만 쏘고 **상태는 그대로**라
 * "전송됐다는데 화면이 안 바뀌는" 카드였다. 숫자와 상태 전이가 전부 여기를 지나면
 * 두 병이 같이 낫는다.
 *
 * 프로토타입: 정본은 이 모듈 스코프 배열이다(서버 CRUD 미확정 — CLAUDE.md).
 * **서버로 옮길 때의 모양은 `docs/API_설계.md` §1 에 굳혀 두었다** — 화면은 훅 모양만 안다.
 * 본개발에서는 이 관문의 구현만 서버 조회로 바꾼다 — 화면은 훅 모양만 안다.
 */
import { useSyncExternalStore } from 'react'

import { currentVersion, specs as initialSpecs } from './specs'
import type { Spec, SpecField, SpecStatus } from './specs'

/* ── 스토어 본체 ─────────────────────────────────────────────────── */

let specList: Array<Spec> = initialSpecs
const listeners = new Set<() => void>()

/** 시드로 태어난 사양서 — 이 넷만 mock 필드표(32개)를 갖는다.
 *  ⚠ 이 갈래가 없던 동안 상세 화면이 **모든 사양서에 같은 필드표**를 물려서,
 *  방금 등록한 사양서가 "필드 정의를 채워 주세요" 토스트와 **동시에** 남의 필드
 *  32개(완료 17…)를 그렸다(2026-08-18 실측). 새 사양서는 빈 표로 태어난다. */
const seededIds = new Set(initialSpecs.map((s) => s.id))
export function isSeededSpec(id: string): boolean {
  return seededIds.has(id)
}

function notify() {
  for (const fn of listeners) fn()
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 화면이 정본을 읽는 유일한 길 — 등록·상신이 일어나면 구독한 화면이 함께 다시 센다.
 *  SSR 스냅샷은 초기 목록이다(등록은 브라우저에서만 일어난다 — 수화 불일치 없음). */
export function useSpecList(): Array<Spec> {
  return useSyncExternalStore(
    subscribe,
    () => specList,
    () => specList,
  )
}

/* ── 상태 전이 ───────────────────────────────────────────────────── */

export interface NewSpecInput {
  name: string
  category: string
  description: string
  tags: Array<string>
  author: string
  /** 엑셀 이관으로 들어올 때만 채워진다 — 손으로 등록하면 빈 표로 태어난다(위 `isSeededSpec`).
   *  ⚠ 원본 엑셀은 시트가 사양서이고 **머리 행이 곧 필드 목록**이라, 이관은 필드를 알고 온다. */
  fields?: Array<SpecField>
}

function nextId(): string {
  const max = specList.reduce((m, s) => Math.max(m, Number(s.id.replace('SP-', '')) || 0), 0)
  return `SP-${String(max + 1).padStart(3, '0')}`
}

/** 대량 등록에서 번호를 잇는다 — 목록에 **아직 안 넣은 것**만큼 밀어야 번호가 겹치지 않는다 */
function nextIdFrom(offset: number): string {
  const max = specList.reduce((m, s) => Math.max(m, Number(s.id.replace('SP-', '')) || 0), 0)
  return `SP-${String(max + offset + 1).padStart(3, '0')}`
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 등록 — v0.1 초안으로 태어난다. 새것이 맨 앞(목록이 "방금 만든 것"부터 보인다). */
export function registerSpec(input: NewSpecInput): Spec {
  const spec = makeSpec(input, nextId())
  specList = [spec, ...specList]
  notify()
  return spec
}

/** 사양서 한 건의 **모양** — 한 건 등록과 대량 이관이 이 함수를 함께 쓴다(두 벌이면 어긋난다) */
function makeSpec(input: NewSpecInput, id: string): Spec {
  const spec: Spec = {
    id,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    tags: input.tags,
    author: input.author,
    updated: today(),
    history: [
      {
        version: 'v0.1',
        status: '초안',
        date: today(),
        summary: input.fields?.length ? `엑셀 이관 — 필드 ${input.fields.length}개` : '신규 등록 — 필드 정의 작성 전',
        author: input.author,
        // 필드는 상세 화면에서 채운다 — 빈 배열이면 카드가 필드 상자를 그리지 않는다
        fields: input.fields ?? [],
      },
    ],
  }
  // ⚠ 여기서 목록에 넣지 않는다 — 만드는 함수가 넣기까지 하면 대량 등록이 **두 번** 넣는다
  //   (2026-08-19 실측: 시트 2개 파일에서 "1건 반영"이라 말하고 목록엔 같은 SP-005 가 두 장)
  return spec
}

/**
 * 여러 건을 **한 번에** 등록한다 (엑셀 이관). 알림은 마지막에 한 번.
 *
 * ⚠ `registerSpec` 을 반복해 부르면 건마다 구독자가 깨어난다 — 시트 100개짜리 파일에서
 * 목록·대시보드·도넛이 100번 다시 그려진다. 사람 눈엔 멈춘 화면으로 보인다.
 * ⚠ 이미 있는 이름은 건너뛴다(설계 §5) — 같은 파일을 다시 올려도 안전해야 한다.
 * 돌려주는 값은 **실제로 들어간 수**다: 화면이 "n건 반영"이라고 말할 근거가 여기서 나온다.
 */
export function registerSpecs(inputs: Array<NewSpecInput>): number {
  const have = new Set(specList.map((s) => s.name))
  const born: Array<Spec> = []
  for (const input of inputs) {
    const name = input.name.trim()
    if (name === '' || have.has(name)) continue
    born.push(makeSpec(input, nextIdFrom(born.length)))
    have.add(name)
  }
  if (born.length === 0) return 0
  specList = [...born.reverse(), ...specList]
  notify()
  return born.length
}

/** 상신 — 초안·검토 중은 승인 대기로 간다. 승인 완료·배포 완료면 아무 일도 안 한다.
 *  ⚠ 스토어가 상태를 실제로 바꾸므로, 상신 직후 목록 칩·대시보드 도넛이 같이 움직인다 —
 *    "전송됐습니다" 토스트와 화면 상태가 서로 다른 말을 하지 않는다.
 *
 *  ⚠⚠ **이미 '승인 대기'여도 받는다**(2026-08-21, 동일 사양 다중 수정 요청 충돌 관리).
 *  예전엔 여기서 false 를 줘서, 두 번째 사람의 변경 요청이 **아무 말 없이 사라졌다** —
 *  고객이 회의에서 못 박은 자리다: "누가 먼저 했다고 다른 사람 걸 막느냐, 그건 안 될 것
 *  같다." 사양서 상태는 이미 '승인 대기'라 바뀔 것이 없고, 요청만 하나 더 선다(겹침).
 *  ⚠ 문서 **본문**은 여전히 잠긴 채다 — 승인자가 본 것이 심사 중에 바뀌면 안 된다.
 *  잠그는 것은 '내용'이고, 여는 것은 '요청'이다. 둘을 같은 자물쇠로 묶지 않는다. */
export function submitSpecForApproval(id: string): boolean {
  const spec = specList.find((s) => s.id === id)
  if (!spec) return false
  const cur = currentVersion(spec)
  if (cur.status === '승인 대기') return true // 겹친 요청 — 상태는 이미 맞다
  if (cur.status !== '초안' && cur.status !== '검토 중') return false
  const next: Spec = {
    ...spec,
    history: [{ ...cur, status: '승인 대기' }, ...spec.history.slice(1)],
  }
  specList = specList.map((s) => (s.id === id ? next : s))
  notify()
  return true
}

/** 지금 버전의 상태만 갈아 끼운다 — 나머지는 그대로 둔다(이력은 손대지 않는다) */
function setStatus(id: string, status: SpecStatus, patch: Partial<Spec['history'][number]> = {}): boolean {
  const spec = specList.find((s) => s.id === id)
  if (!spec) return false
  const cur = currentVersion(spec)
  const next: Spec = {
    ...spec,
    history: [{ ...cur, status, ...patch }, ...spec.history.slice(1)],
  }
  specList = specList.map((s) => (s.id === id ? next : s))
  notify()
  return true
}

/** 결재가 끝났다 — 승인 완료. **배포는 아직이다**(다음은 배포 관리에서 요청). */
export function approveSpec(id: string): boolean {
  const spec = specList.find((s) => s.id === id)
  if (!spec || currentVersion(spec).status !== '승인 대기') return false
  return setStatus(id, '승인 완료', { rejection: undefined })
}

/** 반려 — 초안으로 되돌리되 **사유를 안고 돌아온다**. 요청자는 이것을 보고 고친다. */
export function rejectSpec(id: string, reason: string, by: string): boolean {
  const spec = specList.find((s) => s.id === id)
  if (!spec || currentVersion(spec).status !== '승인 대기') return false
  return setStatus(id, '초안', { rejection: { reason, by, at: today() } })
}

/**
 * 결재가 하나도 안 남았다 — 사양서를 초안으로 되돌린다. 반려 자국은 남기지 않는다.
 *
 * ⚠ **부르기 전에 "진행 중인 요청이 정말 없는지"를 먼저 세야 한다.** 겹친 요청 둘 중
 * 하나만 내려갔는데 여기까지 오면, 아직 심사 중인 다른 건이 있는데도 사양서가 초안으로
 * 풀려 편집이 열린다 — 승인자가 본 것과 다른 문서가 승인되는 그 길이 다시 열린다.
 * 그 셈은 두 스토어를 함께 보는 `data/workflow.ts` 가 한다.
 */
export function releaseSpecToDraft(id: string): boolean {
  const spec = specList.find((s) => s.id === id)
  if (!spec || currentVersion(spec).status !== '승인 대기') return false
  return setStatus(id, '초안')
}

/**
 * **승인이 취소됐다** — '승인 완료'를 되돌린다 (2026-08-21, 겹침 정리).
 *
 * ⚠⚠ 이 자리가 없으면 구멍이 난다: 겹친 둘 중 승인까지 간 건을 내리고 **다른 건으로 가기로**
 * 했는데, 사양서는 '승인 완료'로 남는다 → 배포 관문은 겹침이 풀렸다고 보고 길을 열어 준다
 * → **아무도 승인하지 않은 변경이 반영된다.**
 *
 * @param stillPending 심사 중인 다른 요청이 남았는가 — 남았으면 '승인 대기', 없으면 '초안'
 * ⚠ 배포까지 간 문서는 되돌리지 않는다(반영은 되돌리기 어렵다 — 상태가 '승인 완료'가 아니면 그냥 만다).
 */
export function revertSpecApproval(id: string, stillPending: boolean): boolean {
  const spec = specList.find((s) => s.id === id)
  if (!spec || currentVersion(spec).status !== '승인 완료') return false
  return setStatus(id, stillPending ? '승인 대기' : '초안')
}

/** 회수 — 요청자가 도로 내렸다 (✔ 2026-08-19 채택, FR-114 확장). */
export function withdrawSpec(id: string): boolean {
  return releaseSpecToDraft(id)
}

/** 배포까지 끝났다 */
export function markSpecDeployed(id: string): boolean {
  return setStatus(id, '배포 완료')
}

/* ── 파생 셈 — 숫자는 코드가 센다 (규약 §10) ─────────────────────── */

export const SPEC_STATUSES: Array<SpecStatus> = ['초안', '검토 중', '승인 대기', '승인 완료', '배포 완료']

export function countByStatus(list: Array<Spec>): Record<SpecStatus, number> {
  const c: Record<SpecStatus, number> = { 초안: 0, '검토 중': 0, '승인 대기': 0, '승인 완료': 0, '배포 완료': 0 }
  for (const s of list) c[currentVersion(s).status]++
  return c
}

/** 도넛·상태 칩용 분포. prev 는 "이전 동일 기간" mock — 실 이력이 없는 프로토타입이라
 *  결정적 상수다(난수 금지). ⚠ 현재 값(value)만은 반드시 목록에서 센다. */
const STATUS_PREV: Record<SpecStatus, number> = { 초안: 1, '검토 중': 2, '승인 대기': 1, '승인 완료': 0, '배포 완료': 1 }
const STATUS_FILL: Record<SpecStatus, string> = {
  초안: 'var(--color-fill-draft)',
  '검토 중': 'var(--color-fill-review)',
  '승인 대기': 'var(--color-fill-pending)',
  '승인 완료': 'var(--color-fill-approved)',
  '배포 완료': 'var(--color-fill-deployed)',
}

export function specStatusDistribution(list: Array<Spec>) {
  const counts = countByStatus(list)
  return SPEC_STATUSES.map((label) => ({
    label,
    value: counts[label],
    prev: STATUS_PREV[label],
    fill: STATUS_FILL[label],
  }))
}
