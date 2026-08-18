import { currentVersion } from '#/data/specs'
import type { Spec } from '#/data/specs'
import { useI18n } from '#/lib/i18n'

import { Avatar } from './Avatar'
import { StatusBadge } from './StatusBadge'

interface Props {
  spec: Spec
  index: number
  onDetail: () => void
  onCompare: () => void
  /** 승인 요청 — 카드는 **상세의 상신 모달로 보내기만** 한다. 예전엔 여기서 토스트만
   *  쏘고 상태는 그대로였다: "전송되었습니다"라는데 카드가 안 바뀌어 또 누르게 되는
   *  버튼이었고, 상세에서는 묻고 목록에서는 즉발이라 같은 행위가 자리마다 달랐다
   *  (규약 §2 되돌릴 수 없는 것은 묻는다 · 상신 판단은 상세 한 곳 — 2026-08-18). */
  onRequest: () => void
}

export function SpecCard({ spec, index, onDetail, onCompare, onRequest }: Props) {
  const { t, tf } = useI18n()
  const cur = currentVersion(spec)
  const needsApproval = cur.status === '초안' || cur.status === '검토 중'
  return (
    <article
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={onDetail}
      // 카드 전체가 상세로 가는 문이다 — 누를 수 있으면 커서로 말한다 (규약 §9)
      className="anim-fade-up flex cursor-pointer flex-col overflow-hidden card-spotlight rounded-2xl border border-hairline bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-2)]"
    >
      {/* 머리 — 무엇인지(ID·상태·버전)를 면+선으로 갈라 얹는다. 카드가 여럿 늘어선
          목록에서 카드 경계와 "이 카드가 무엇인가"가 함께 읽힌다 (규약 §7 · 덮개와 같은 해부) */}
      <div className="flex items-start justify-between surface-head px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-ink-subtle">{spec.id}</span>
          <StatusBadge status={cur.status} />
        </div>
        <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
          {cur.version}
        </span>
      </div>

      {/* 몸 */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
      <h3 className="text-base font-semibold text-ink">{spec.name}</h3>
      <div className="mt-0.5 text-xs text-ink-subtle">{spec.category}</div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
        {spec.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {spec.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-chip px-2 py-0.5 text-xs font-medium text-ink-muted"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* 방금 등록한 초안은 필드가 없다 — 빈 상자를 그리는 대신 어디서 채우는지 말한다 (규약 §17) */}
      {cur.fields.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-xl border border-hairline bg-canvas/70 px-4 py-3.5">
          {cur.fields.slice(0, 4).map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-ink-subtle">{f.label}</dt>
              <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-xl border border-hairline bg-canvas/70 px-4 py-3.5 text-xs text-ink-subtle">
          {t('specCard.noFields', '아직 필드가 없습니다 — [상세 보기]에서 필드 정의를 채웁니다.')}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
        <div className="flex items-center gap-2 text-xs text-ink-subtle">
          <Avatar name={cur.author} />
          <span className="font-medium text-ink-muted">{cur.author}</span>
          <span>·</span>
          <span>{tf('specCard.updated', { date: spec.updated })}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDetail}
            className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:bg-chip-strong hover:text-ink"
          >
            {t('specCard.detail')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCompare()
            }}
            className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:bg-chip-strong hover:text-ink"
          >
            {t('specCard.compare')}
          </button>
          {needsApproval && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRequest()
              }}
              className="h-8 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3 text-xs font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-[opacity,transform] hover:opacity-90 active:scale-95"
            >
              {t('specCard.request')}
            </button>
          )}
        </div>
      </div>
      </div>
    </article>
  )
}
