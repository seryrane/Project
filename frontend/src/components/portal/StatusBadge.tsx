import type { SpecStatus } from '#/data/specs'

const styles: Record<SpecStatus, string> = {
  '초안': 'bg-draft-bg text-draft-ink',
  '검토 중': 'bg-review-bg text-review-ink',
  '승인 대기': 'bg-pending-bg text-pending-ink',
  '배포 완료': 'bg-deployed-bg text-deployed-ink',
}

export function StatusBadge({ status }: { status: SpecStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  )
}
