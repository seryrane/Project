import { useI18n } from '#/lib/i18n'
import type { SpecStatus } from '#/data/specs'

const styles: Record<SpecStatus, string> = {
  '초안': 'bg-draft-bg text-draft-ink',
  '검토 중': 'bg-review-bg text-review-ink',
  '승인 대기': 'bg-pending-bg text-pending-ink',
  '배포 완료': 'bg-deployed-bg text-deployed-ink',
}

export function StatusBadge({ status }: { status: SpecStatus }) {
  // ⚠ 값(한국어 정본)은 그대로 두고 **표시만** 옮긴다 — 사전 키는 이미 있었는데
  //   이 관문이 안 타고 있어서 EN 화면 제목 옆에만 한국어가 남았다(2026-08-18).
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {t(`specStatus.${status}`, status)}
    </span>
  )
}
