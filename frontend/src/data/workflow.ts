/**
 * 결재 수명주기의 **잇는 자리** — FR-114.
 *
 * 스토어는 셋이고(사양서·결재함·배포) 서로를 부르지 않는다(순환 참조). 대신 "상신하면
 * 결재함에도 생긴다" "승인이 끝나면 사양서가 승인 완료가 된다" 같은 **두 곳이 함께
 * 움직이는 일**만 여기 모은다. 화면은 읽기는 스토어에서, 쓰기는 여기서 한다.
 *
 * ⚠⚠ 이 파일이 없던 동안 흐름이 반쪽이었다(2026-08-18):
 *   상신 → 사양서 상태만 바뀌고 결재함엔 없음 · 승인 → 그 화면의 useState 뿐 ·
 *   배포 요청 → 토스트만. 즉 **결재는 올라가기만 하고 내려오지 않았다.**
 */
import {
  activeRequestOfSpec,
  approvalLine,
  createRequest,
  decideRequest,
  findRequest,
  withdrawRequest,
} from './approvalStore'
import type { ApprovalRecord } from './approvalStore'
import { createDeploy, findDeploy, markDeployApproved, markDeployRejected } from './deployStore'
import type { NewDeployInput } from './deployStore'
import {
  approveSpec,
  markSpecDeployed,
  rejectSpec,
  submitSpecForApproval,
  withdrawSpec,
} from './specStore'
import { currentVersion } from './specs'
import type { Spec } from './specs'

/* ── 상신 (사양서) ───────────────────────────────────────────────── */

/**
 * 사양서를 결재에 올린다 — 사양서 상태와 결재함이 **함께** 움직인다.
 * 재요청도 같은 문이다: 반려당한 문서는 초안으로 돌아와 있으므로 다시 이 함수를 탄다
 * (FR-114 ① 요청–승인–반려–**재요청**). 결재선은 상신 시점의 것을 건이 안고 간다.
 */
export function submitSpec(spec: Spec, requester: string, requesterTeam = 'IT 전략팀'): ApprovalRecord | null {
  const cur = currentVersion(spec)
  const isResubmit = Boolean(cur.rejection)
  if (!submitSpecForApproval(spec.id)) return null
  return createRequest({
    kind: '사양서',
    specId: spec.id,
    title: `${spec.name} ${cur.version}`,
    version: cur.version,
    // 재요청은 '수정' 으로 올라간다 — 결재자가 "처음 보는 건"과 "고쳐 온 건"을 가른다
    type: isResubmit ? '수정' : '신규',
    requester,
    requesterTeam,
    summary: isResubmit
      ? `반려 사유를 반영해 재요청합니다 — ${cur.rejection?.reason ?? ''}`
      : spec.description,
    changes: cur.fields.slice(0, 4).map((f) => ({ item: f.label, before: null, after: f.value })),
  })
}

/* ── 승인·반려 ───────────────────────────────────────────────────── */

export interface DecideOutcome {
  ok: boolean
  /** 마지막 단계까지 통과했는가 — 화면이 "다음 행동"을 다르게 말한다 */
  finished: boolean
  reason?: 'not-found' | 'need-opinion'
}

/**
 * 결재 한 단계를 처리한다. 마지막 단계에서 승인이 나야 대상(사양서·배포)이 움직인다.
 * ⚠ 반려는 **사유 없이는 못 한다**(스토어가 막는다) — 되돌아간 문서가 이유를 안고 가야 한다.
 */
export function decide(
  requestId: string,
  action: '승인' | '반려',
  opinion: string,
  by: string,
): DecideOutcome {
  const before = findRequest(requestId)
  if (!before) return { ok: false, finished: false, reason: 'not-found' }

  const res = decideRequest(requestId, action, opinion, by)
  if (!res.ok) return { ok: false, finished: false, reason: 'need-opinion' }

  const rec = res.record!
  if (action === '반려') {
    if (rec.specId) rejectSpec(rec.specId, opinion.trim(), by)
    if (rec.kind === '배포' && rec.deployId) markDeployRejected(rec.deployId)
    return { ok: true, finished: false }
  }
  if (res.finished) {
    // 사양서는 '승인 완료'까지 (배포는 별건 — 배포 관리에서 다시 요청한다)
    if (rec.kind === '사양서' && rec.specId) approveSpec(rec.specId)
    if (rec.kind === '배포' && rec.deployId) {
      markDeployApproved(rec.deployId, by)
      // 배포에 실린 사양서들은 이 순간 배포 완료가 된다 — 배포가 사양서를 끌고 간다
      const dep = findDeploy(rec.deployId)
      for (const s of dep?.specs ?? []) markSpecDeployed(s.id)
    }
  }
  return { ok: true, finished: res.finished }
}

/* ── 회수 (⚠ 요구사항 밖 — approvalStore.withdrawRequest 주석 참고) ── */

/** 결재함에서 곧장 회수 — 승인 관리 [내 요청]이 쓴다. 대상(사양서)도 함께 되돌린다. */
export function withdrawRequestById(requestId: string, by: string): boolean {
  const rec = findRequest(requestId)
  if (!rec) return false
  if (!withdrawRequest(requestId, by)) return false
  if (rec.specId) withdrawSpec(rec.specId)
  if (rec.deployId) markDeployRejected(rec.deployId)
  return true
}

export function withdrawSpecRequest(specId: string, by: string): boolean {
  const rec = activeRequestOfSpec(specId)
  if (!rec) return false
  if (!withdrawRequest(rec.id, by)) return false
  withdrawSpec(specId)
  return true
}

/* ── 배포 요청 ───────────────────────────────────────────────────── */

/**
 * 배포를 요청한다 — 배포 목록에 '대기'로 서고, **같은 순간 결재함에도 건이 생긴다**.
 * 승인이 끝나야 '진행중'이 된다(승인 없이는 배포가 시작되지 않는다).
 */
export function requestDeploy(
  input: NewDeployInput,
  requesterTeam = '플랫폼운영팀',
): ApprovalRecord | null {
  const deploy = createDeploy(input)
  return createRequest({
    kind: '배포',
    deployId: deploy.id,
    title: `Release ${deploy.version} ${deploy.env === 'Production' ? '운영' : '검증'} 배포`,
    version: deploy.version,
    type: '신규',
    requester: input.owner,
    requesterTeam,
    summary: deploy.changes.join(' · '),
    changes: deploy.specs.map((s) => ({ item: s.name, before: null, after: s.version })),
    urgent: deploy.env === 'Production',
  })
}

/** 지금 결재선 — 화면이 "누구에게 올라가는지" 보여 줄 때 쓴다 */
export { approvalLine }
