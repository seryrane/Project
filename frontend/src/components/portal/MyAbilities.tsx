import { ACTION_SPECS, SCOPE_LABEL, roleDefs, scopeOf } from '#/data/roles'
import { useI18n } from '#/lib/i18n'

import { Avatar } from './Avatar'

/** 현재 사용자(김현대 · Super Admin)의 권한을 역할에서 파생해 사람 말로 보여 준다.
 *  ⚠ 본개발에서는 서버 `GET /api/me/abilities` 로 교체 — 화면이 권한을 다시 세면
 *  "보이는데 눌러도 안 되는 것"이 생긴다. */
export function MyAbilities() {
  const { t } = useI18n()
  const myRole = roleDefs.find((r) => r.key === 'super')
  if (!myRole) return null
  const menus = Object.entries(myRole.matrix).filter(([, actions]) => actions.length > 0)
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5">
          <Avatar name="김현대" size={30} />
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] font-semibold text-ink">김현대</span>
            <span className="block text-xs text-ink-subtle">
              역할 <b className="text-ink-muted">{myRole.name}</b> — 아래 권한은 이 역할에서
              파생됩니다
            </span>
          </span>
        </div>
        <ul className="space-y-1.5">
          {menus.map(([menu, actions]) => (
            <li key={menu} className="rounded-xl border border-hairline/70 px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-ink">{t(`perm.${menu}`, menu)}</span>
                {actions.includes('조회') && (
                  <span className="text-[10px] text-ink-subtle">
                    조회 범위 · {SCOPE_LABEL[scopeOf(myRole, menu)]}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {actions.map((a) => (
                  <span
                    key={a}
                    title={ACTION_SPECS[a].hint}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      ACTION_SPECS[a].danger
                        ? 'bg-pending-bg text-pending-ink'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {t(`perm.${a}`, a)}
                    {ACTION_SPECS[a].danger && ' ⚠'}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 border-t border-hairline pt-3 text-xs leading-relaxed text-ink-subtle">
        ⚠ 표시는 되돌리기 어려운 권한입니다. 권한이 예상과 다르면 관리자에게 문의하세요 —
        변경은 [권한 관리]에서 상신으로 처리됩니다.
      </p>
    </div>
  )
}
