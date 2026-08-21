/**
 * 결재 수명주기의 **잇는 자리** — FR-114.
 *
 * 스토어는 셋이고(사양서·결재함·배포) 서로를 부르지 않는다(순환 참조). 대신 "상신하면
 * 결재함에도 생긴다" "승인이 끝나면 사양서가 승인 완료가 된다" 같은 **두 곳이 함께
 * 움직이는 일**만 여기 모은다. 화면은 읽기는 스토어에서, 쓰기는 여기서 한다.
 *
 * 서버로 가면 이 파일이 하는 **두 곳 동시 변경**은 트랜잭션이 진다 — `docs/API_설계.md` §5.
 *
 * ⚠ **감사 기록도 여기서 남긴다**(2026-08-20). 화면마다 남기면 어떤 길로 들어왔느냐에 따라
 * 남는 것이 달라진다 — 상세에서 승인하면 남고 결재함에서 승인하면 안 남는 식이다.
 * 두 스토어가 함께 움직이는 이 자리를 지나면 **어느 화면에서 눌러도 같은 줄**이 남는다.
 *
 * ⚠⚠ 이 파일이 없던 동안 흐름이 반쪽이었다(2026-08-18):
 *   상신 → 사양서 상태만 바뀌고 결재함엔 없음 · 승인 → 그 화면의 useState 뿐 ·
 *   배포 요청 → 토스트만. 즉 **결재는 올라가기만 하고 내려오지 않았다.**
 */
import { recordAudit } from './auditStore'
import {
  activeRequestOfSpec,
  activeRequestsOfSpec,
  approvalLine,
  cancelRequest,
  createRequest,
  decideRequest,
  findRequest,
  markRequestsReflected,
  unsettledRequestsOfSpec,
  withdrawRequest,
} from './approvalStore'
import type { ApprovalRecord } from './approvalStore'
import { createDeploy, findDeploy, markDeployApproved, markDeployRejected } from './deployStore'
import type { NewDeployInput } from './deployStore'
import {
  approveSpec,
  markSpecDeployed,
  rejectSpec,
  releaseSpecToDraft,
  revertSpecApproval,
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
  // 겹침은 **상신 전에** 센다 — 내 건이 선 뒤에 세면 나까지 겹침에 들어간다
  const already = activeRequestsOfSpec(spec.id).length
  if (!submitSpecForApproval(spec.id)) return null
  recordAudit(
    {
      action: '결재 상신',
      target: `${spec.name} ${cur.version}`,
      // 겹친 상신은 **그 사실이 감사에 남아야** 한다 — 나중에 "왜 두 건이었나"를 되짚는다
      reason: already > 0
        ? `겹친 변경 요청 — 이미 심사 중인 요청 ${already}건`
        : isResubmit
          ? '반려 사유 반영 후 재요청'
          : '신규 상신',
    },
    requester,
  )
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
  /* 승인·반려는 **판단**이다 — 누가 언제 무엇을 어떤 의견으로 판단했는지가 감사의 본체다.
     ⚠ 반려 사유는 그대로 남긴다(사유 없이는 반려가 안 되므로 빈 줄이 남지 않는다). */
  recordAudit(
    {
      action: action === '승인' ? '결재 승인' : '결재 반려',
      target: `${rec.title} (${rec.kind})`,
      reason: opinion.trim() || (res.finished ? '최종 승인' : '단계 승인'),
    },
    by,
  )
  if (action === '반려') {
    /* ⚠⚠ **남은 겹침이 있으면 사양서를 되돌리지 않는다**(2026-08-21). 같은 사양서에 요청이
       둘인데 하나를 반려했다고 문서를 '초안'으로 풀면, 아직 심사 중인 다른 건이 있는데도
       편집 잠금이 열린다 — 승인자가 본 것과 다른 문서가 승인되는 그 길이 도로 열린다.
       반려 사유는 그 건의 자국(trail)에 이미 남아 있다. */
    if (rec.specId && activeRequestsOfSpec(rec.specId).length === 0) {
      rejectSpec(rec.specId, opinion.trim(), by)
    }
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
      for (const s of dep?.specs ?? []) {
        markSpecDeployed(s.id)
        // 반영이 끝났으니 그 사양서의 대기 풀을 비운다 — 안 비우면 겹침이 거짓으로 뜬다
        markRequestsReflected(s.id)
      }
    }
  }
  return { ok: true, finished: res.finished }
}

/* ── 회수 (✔ 2026-08-19 채택 — FR-114 의 확장. approvalStore 주석 참고) ── */

/** 결재함에서 곧장 회수 — 승인 관리 [내 요청]이 쓴다. 대상(사양서)도 함께 되돌린다. */
export function withdrawRequestById(requestId: string, by: string): boolean {
  const rec = findRequest(requestId)
  if (!rec) return false
  if (!withdrawRequest(requestId, by)) return false
  recordAudit({ action: '결재 회수', target: `${rec.title} (${rec.kind})`, reason: '요청자 회수' }, by)
  // ⚠ 반려와 같은 관문 — 겹친 다른 건이 남아 있으면 문서를 풀지 않는다
  if (rec.specId && activeRequestsOfSpec(rec.specId).length === 0) withdrawSpec(rec.specId)
  if (rec.deployId) markDeployRejected(rec.deployId)
  return true
}

export function withdrawSpecRequest(specId: string, by: string): boolean {
  const rec = activeRequestOfSpec(specId)
  if (!rec) return false
  if (!withdrawRequest(rec.id, by)) return false
  recordAudit({ action: '결재 회수', target: rec.title, reason: '요청자 회수' }, by)
  if (activeRequestsOfSpec(specId).length === 0) withdrawSpec(specId)
  return true
}

/* ── 취소 (동일 사양 다중 수정 요청 충돌 관리 — 2026-07-20 회의) ──────── */

/**
 * 겹친 요청 중 **채택되지 않은 것**을 내린다. 사유는 필수(관문이 막는다).
 *
 * 근거: "동일한 항목이 두 개 있으면 담당자가 수기로 검증하고 둘 중 하나는 취소해야 된다,
 * 그러면 취소 사유를 내고 취소한다"(고객, 2026-07-20).
 *
 * ⚠ **자동으로 취소하지 않는다.** 하나를 승인하면 나머지를 알아서 내리게 만들 수도 있지만,
 * 그러면 사유가 "시스템이 자동 취소"로 남는다 — 회의가 요구한 것은 사람의 판단과 그 이유다.
 * 승인 화면은 남은 겹침을 **말해 주기만** 하고, 내리는 것은 사람이 누른다.
 */
export function cancelRequestById(requestId: string, reason: string, by: string): boolean {
  // 내리기 **전에** 무엇이었는지 봐 둔다 — 내린 뒤에는 '취소'라서 알 길이 없다
  const wasApproved = findRequest(requestId)?.state === '승인 완료'
  const rec = cancelRequest(requestId, reason, by)
  if (!rec) return false
  recordAudit(
    { action: '결재 취소', target: `${rec.title} (${rec.kind})`, reason: reason.trim() },
    by,
  )
  if (rec.specId) {
    const left = unsettledRequestsOfSpec(rec.specId)
    // 마지막 한 건이 내려갔다면 문서를 푼다 — 남아 있으면 잠근 채로 둔다(반려·회수와 같은 관문)
    if (left.length === 0) releaseSpecToDraft(rec.specId)
    /* ⚠ 내린 것이 **승인까지 간 건**이면 사양서의 '승인 완료'도 되돌린다 — 안 그러면
       아무도 승인하지 않은 변경이 반영되는 길이 열린다(specStore.revertSpecApproval 주석). */
    if (wasApproved) revertSpecApproval(rec.specId, left.length > 0)
  }
  if (rec.deployId) markDeployRejected(rec.deployId)
  return true
}

/* ── 배포 요청 ───────────────────────────────────────────────────── */

/**
 * 반영을 막는 유일한 관문 — 실을 사양서 중 **겹친 것**의 id.
 *
 * 근거: "마지막에 반영할 때도 동일하게 2개 이상이면 반영을 못하게 뭔가 검증하는 그런 것도
 * 있어야 되겠다 — 사용자가 체크 못 해서 두 개가 다 반영돼 버리면 무슨 문제가 생길지 모르니까"
 * (고객, 2026-07-20).
 *
 * ⚠ 겹침을 막는 자리는 **여기 하나뿐**이다. 신청은 막지 않는다(같은 회의에서 못 박았다).
 */
export function conflictedAmong(specIds: Array<string>): Array<string> {
  return specIds.filter((id) => unsettledRequestsOfSpec(id).length > 1)
}

/**
 * 배포를 요청한다 — 배포 목록에 '대기'로 서고, **같은 순간 결재함에도 건이 생긴다**.
 * 승인이 끝나야 '진행중'이 된다(승인 없이는 배포가 시작되지 않는다).
 */
export function requestDeploy(
  input: NewDeployInput,
  requesterTeam = '플랫폼운영팀',
): ApprovalRecord | null {
  /* ⚠⚠ **막는 것이 먼저다** — `createDeploy` 를 지나면 목록에 배포 건이 이미 서 버린다.
     화면도 버튼을 잠그지만, 관문은 화면을 믿지 않는다(결재선 검사와 같은 규칙). */
  if (conflictedAmong(input.specs.map((s) => s.id)).length > 0) return null

  const deploy = createDeploy(input)
  // ⚠ 배포는 되돌리기 어려운 일이다 — **요청 자체**가 감사에 남아야 "누가 올렸나"를 되짚는다
  recordAudit(
    {
      action: '배포 요청',
      target: `${deploy.id} Release ${deploy.version} (${deploy.env})`,
      reason: `사양서 ${deploy.specs.length}건 · ${deploy.changes.join(' · ')}`,
    },
    input.owner,
  )
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
