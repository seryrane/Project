/**
 * 흐름 스트립 관문 — 사양서 수명주기(상태 5종)를 **한 언어**로 그린다.
 *
 * ⚠⚠ 이 관문이 없던 동안 같은 여정이 세 말로 갈라져 있었다(2026-08-26 흐름 검토):
 * 상세는 7단계 스테퍼(수정중·임시저장·최종완료·승인요청·배포승인 — 레퍼런스 기획의
 * 유산, 절반은 도달 불가능한 단계), 보드는 상태 5종, 배포는 파이프라인 4단계.
 * 사양서를 따라가는 사람이 화면을 옮길 때마다 딴 낱말을 만났다(§15).
 *
 * 정본: 단계 = specStore.SPEC_STATUSES · 색 = SPEC_STATUS_FILL · 표시 = specStatus 사전.
 * 배포 파이프라인(개발→검증→승인→운영)은 릴리즈의 여정이라 별개 — 여기 통합하지 않는다.
 */
import { useI18n } from '#/lib/i18n'
import { SPEC_STATUSES, SPEC_STATUS_FILL } from '#/data/specStore'
import type { SpecStatus } from '#/data/specs'

export function FlowStrip({ current }: { current: SpecStatus }) {
  const { t } = useI18n()
  const cur = SPEC_STATUSES.indexOf(current)
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 text-xs">
        {SPEC_STATUSES.map((s, i) => {
          const tone = SPEC_STATUS_FILL[s]
          return (
            <li key={s} className="flex items-center gap-1">
              {i > 0 && <span className="text-ink-subtle">→</span>}
              <span
                className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${
                  i < cur ? 'bg-chip text-ink-muted' : i === cur ? 'font-semibold' : 'text-ink-subtle'
                }`}
                /* 현재 칸만 제 상태색을 입는다 — 보드 레인·목록 배지와 같은 색(§16) */
                style={
                  i === cur
                    ? {
                        backgroundColor: `color-mix(in oklab, ${tone} 14%, var(--color-surface))`,
                        color: tone,
                        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} 45%, transparent)`,
                      }
                    : undefined
                }
              >
                {i === cur && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone }} />}
                {t(`specStatus.${s}`, s)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
