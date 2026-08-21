import { ACCENTS, useAccent } from '#/lib/accent'
import { useI18n } from '#/lib/i18n'

/** 개인 설정 — 언어·테마·포인트 색상. 전부 즉시 적용(정본은 서버, localStorage 백업).
 *  선택 상태는 면+글자+✓ (규약 16절 — 색만으로 선택을 말하지 않는다). */
export function Preferences({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const { locale, setLocale, t } = useI18n()
  const { accent, setAccent } = useAccent()

  const seg = (on: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-[13px] transition-colors ${
      on ? 'bg-chip-strong font-semibold text-ink' : 'text-ink-muted hover:bg-chip hover:text-ink'
    }`

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[13px] font-semibold text-ink">{t('prefs.language')}</h3>
        <div className="mt-2 flex gap-1 rounded-xl border border-hairline bg-canvas/40 p-1">
          {/* 언어 이름은 그 언어로 — 못 읽는 말로 적힌 언어 메뉴는 못 고른다 */}
          <button type="button" aria-pressed={locale === 'ko'} onClick={() => setLocale('ko')} className={seg(locale === 'ko')}>
            {locale === 'ko' && '✓ '}한국어
          </button>
          <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')} className={seg(locale === 'en')}>
            {locale === 'en' && '✓ '}English
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold text-ink">{t('prefs.theme')}</h3>
        <div className="mt-2 flex gap-1 rounded-xl border border-hairline bg-canvas/40 p-1">
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={() => theme !== 'dark' && onToggleTheme()}
            className={seg(theme === 'dark')}
          >
            {theme === 'dark' && '✓ '}
            {t('prefs.theme.dark')}
          </button>
          <button
            type="button"
            aria-pressed={theme === 'light'}
            onClick={() => theme !== 'light' && onToggleTheme()}
            className={seg(theme === 'light')}
          >
            {theme === 'light' && '✓ '}
            {t('prefs.theme.light')}
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold text-ink">{t('prefs.accent')}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-subtle">{t('prefs.accent.desc')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ACCENTS.map((a) => {
            const on = accent === a.key
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={on}
                onClick={() => setAccent(a.key)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                  on ? 'border-primary bg-chip-strong' : 'border-hairline hover:bg-chip'
                }`}
              >
                <span
                  className={`h-8 w-8 rounded-full ${on ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-surface' : ''}`}
                  style={{ background: a.swatch }}
                />
                <span className={`text-xs ${on ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                  {on && '✓ '}
                  {t(`accent.${a.key}`)}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
