import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect } from '#/components/portal/Chips'
import { DataTable } from '#/components/portal/DataTable'
import { FilterAxes, FilterAxis } from '#/components/portal/FilterAxis'
import { StatusBadge } from '#/components/portal/StatusBadge'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { SpecImportModal } from '#/components/portal/SpecImportModal'
import { SavedFilters } from '#/components/portal/SavedFilters'
import { SpecCard } from '#/components/portal/SpecCard'
import { VersionCompareModal } from '#/components/portal/VersionCompareModal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { rowToFieldDef } from '#/lib/specImport'
import { orNone, pickOne, pickText } from '#/lib/urlState'
import { recordAudit } from '#/data/auditStore'
import { members } from '#/data/members'
import { SPEC_CATEGORIES, currentVersion } from '#/data/specs'
import { mergeSpecFields } from '#/data/specFieldStore'
import { registerSpec, registerSpecs, useSpecList } from '#/data/specStore'
import type { NewSpecInput } from '#/data/specStore'
import type { Spec, SpecStatus, SpecVersion } from '#/data/specs'

const allStatuses: Array<SpecStatus> = ['초안', '검토 중', '승인 대기', '승인 완료', '배포 완료']

// 필터 내부 값(sentinel)은 한국어 원문 그대로 — 화면에 보일 때만 사전을 입힌다
const ALL_CATEGORY = '전체 카테고리'
const ALL_STATUS = '전체 상태'

// 카테고리 선택지는 초기 정본에서 — 등록으로 늘어난 목록에 따라 필터 허용값이
// 흔들리면 옛 링크가 기본값으로 떨어진다(urlState 규칙 ②는 지키되 축은 고정)
/* ⚠ 예전에는 mock 에서 뽑았다 — 등록으로 카테고리가 늘면 필터 허용값이 흔들리고 옛 링크가
   기본값으로 떨어진다. 축은 **정본**이 정한다(data/specs.ts SPEC_CATEGORIES). */
const specCategories = SPEC_CATEGORIES

/**
 * 목록을 **어떻게 볼 것인가** — 카드냐 표냐 (2026-08-21).
 *
 * ⚠⚠ 카드 하나가 300px 대다(설명 2줄 + 태그 5개 + 스펙 미리보기 4값 + 발 버튼). 지금은
 * 4건이라 견디지만 **사양서는 결국 수백 건이 된다** — 20건만 되어도 카드로는 못 훑는다.
 * 나중에 반드시 겪을 문제라 골격에 지금 넣는다(나중에 넣으면 화면을 다시 짜야 한다).
 * ⚠ 카드를 표로 **바꾸지는 않는다** — 카드는 몇 건 안 될 때 내용을 보여 주는 데 낫다.
 *   고르는 것은 사람이고, 고른 것은 **주소에 남는다**(새로고침·링크 공유에서 살아남는다).
 */
const VIEWS = ['카드', '표'] as const
type SpecsView = (typeof VIEWS)[number]
const DEFAULT_VIEW: SpecsView = '카드'

/** 보고 있는 상태는 주소에 둔다 (lib/urlState.ts) — 새로고침·뒤로가기·링크 공유에서 살아남는다 */
interface SpecsSearch {
  open?: string
  q?: string
  cat?: string
  status?: SpecStatus
  /** 등록 모달을 열고 진입 — GNB [+ 새 사양서]가 이 문으로 들어온다 */
  new?: string
  /** 카드로 볼지 표로 볼지 — 기본은 카드 */
  view?: SpecsView
}

export const Route = createFileRoute('/specs')({
  component: SpecsPage,
  // 대시보드 승인 큐 등에서 특정 사양서를 바로 연다: /specs?open=SP-001
  validateSearch: (search: Record<string, unknown>): SpecsSearch => ({
    open: pickText(search.open),
    q: pickText(search.q),
    cat: pickOne(search.cat, specCategories),
    status: pickOne(search.status, allStatuses),
    new: search.new === '1' || search.new === 1 || search.new === true ? '1' : undefined,
    view: pickOne(search.view, VIEWS),
  }),
})

/** 카테고리 표시 — 값은 한국어 정본 그대로, 표시만 사전이 옮긴다 (2026-08-19) */
function useCategoryLabel() {
  const { t } = useI18n()
  return (c: string) => t(`specCategory.${c}`, c)
}

function SpecsPage() {
  const { t, tf } = useI18n()
  const catLabel = useCategoryLabel()
  const {
    open,
    q: query = '',
    cat: category = ALL_CATEGORY,
    status = ALL_STATUS,
    new: wantNew,
    view = DEFAULT_VIEW,
  } = Route.useSearch()
  const navigate = useNavigate()
  const [compare, setCompare] = useState<{ spec: Spec; base: SpecVersion } | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  // 정본은 스토어 — 등록·상신이 일어나면 목록·상태 칩이 같이 다시 센다
  const specList = useSpecList()

  // ?new=1 로 들어오면 등록 모달을 열고 주소에서 지운다 — 새로고침이 모달을 또 열지 않게
  useEffect(() => {
    if (!wantNew) return
    setCreating(true)
    void navigate({ to: '/specs', search: (prev) => ({ ...(prev as SpecsSearch), new: undefined }), replace: true })
  }, [wantNew, navigate])

  /** 고르는 것(칩)은 뒤로가기로 되돌 수 있게 쌓고, 글자 입력은 replace 로 덮는다
   *  — 한 글자마다 히스토리가 쌓이면 뒤로가기가 못 쓰게 된다 (lib/urlState.ts) */
  // ⚠ `prev` 는 **모든 화면의 검색 타입을 합친 것**으로 들어온다(navigate 가 라우트에
  //   묶여 있지 않아서) — 이 화면 몫으로 좁혀서 편다
  const setSearch = (patch: Partial<SpecsSearch>, replace = false) =>
    void navigate({
      to: '/specs',
      search: (prev) => ({ ...(prev as SpecsSearch), ...patch }),
      replace,
    })

  // ?open=SP-001 은 상세 본문 페이지로 보낸다 (대시보드 승인 큐·알림 → 여기 → 상세)
  useEffect(() => {
    if (!open) return
    const target = specList.find((s) => s.id === open)
    if (target) navigate({ to: '/specs/$specId', params: { specId: target.id }, replace: true })
  }, [open, navigate, specList])

  const categories = specCategories

  const filtered = specList.filter((s) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.tags.some((tag) => tag.toLowerCase().includes(q))
    const matchesCategory = category === ALL_CATEGORY || s.category === category
    const matchesStatus = status === ALL_STATUS || currentVersion(s).status === status
    return matchesQuery && matchesCategory && matchesStatus
  })

  const pendingCount = specList.filter((s) => currentVersion(s).status === '승인 대기').length

  const openCompare = (spec: Spec) => {
    const prev = spec.history.find((v, i) => i > 0 && v.status === '배포 완료') ?? spec.history[1]
    setCompare({ spec, base: prev })
  }

  return (
    <AppShell active="specs" title="사양서 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.specs', '사양서 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {tf(
              'page.specs.subtitle',
              { total: specList.length, pending: pendingCount },
              '총 {total}개 사양서 · {pending}개 승인 대기',
            )}
          </p>
        </div>
        {/* ⚠ 이 버튼은 onClick 없이 노출돼 있었다 — 화면에서 가장 눈에 띄는 CTA 가
            눌러도 아무 일 없는 죽은 조작이었다(2026-08-18 실측, 규약 §0 예측 가능성) */}
        {/* ⚠ 두 버튼을 **한 묶음**으로 둔다. 바깥이 justify-between 이라 낱개로 두면
            엑셀 버튼이 제목과 등록 사이 허공으로 밀려난다(2026-08-19 실측 — 화면 가운데에
            혼자 떠 있었다). 조작은 오른쪽 끝에 모이고, **주 행동이 바깥쪽**에 선다. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 엑셀 이관(FR-115) — 최초 대량 이관은 여기서 시작한다. 등록 옆에 두는 이유:
              "한 건 만들기"와 "여러 건 가져오기"는 같은 자리에서 고르는 일이다 */}
          <button
            type="button"
            onClick={() => setImporting(true)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('specs.import', '엑셀 올리기')}
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
          >
            {t('specs.register', '+ 사양서 등록')}
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setSearch({ q: pickText(e.target.value) }, true)}
        placeholder={t('specs.searchPlaceholder', '사양서 명, ID, 태그 검색...')}
        className="mt-6 h-10 w-full rounded-lg border border-hairline bg-surface px-4 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary"
      />

      {/* 거르는 축이 둘(카테고리·상태) — 관문 FilterAxes 가 축마다 이름표를 달아
          자기 줄에 세운다 (규약 §23-10, 왜 그런지는 관문 주석에). */}
      <FilterAxes className="mt-3">
        <FilterAxis label={t('specs.filter.category', '카테고리')}>
          {/* 표시만 번역한다 — 내부 값은 sentinel 유지 (언어를 바꿔도 필터가 안 깨진다) */}
          <ChipSelect
            options={[t('specs.allCategories', ALL_CATEGORY), ...categories]}
            label={(c) => (c === t('specs.allCategories', ALL_CATEGORY) ? c : catLabel(c))}
            value={category === ALL_CATEGORY ? t('specs.allCategories', ALL_CATEGORY) : category}
            onChange={(v) =>
              setSearch({
                cat: orNone(v === t('specs.allCategories', ALL_CATEGORY) ? ALL_CATEGORY : v, ALL_CATEGORY),
              })
            }
          />
        </FilterAxis>

        {/* 상태 필터: 셀렉트 대신 카운트 칩 — 좁은 화면에서는 줄바꿈으로 접힌다 */}
        <FilterAxis label={t('specs.filter.status', '상태')} wrap>
          {[ALL_STATUS, ...allStatuses].map((st) => {
            const count =
              st === ALL_STATUS
                ? specList.length
                : specList.filter((sp) => currentVersion(sp).status === st).length
            const selected = status === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setSearch({ status: orNone(st as SpecStatus, ALL_STATUS as SpecStatus) })}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                  selected
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-hairline bg-surface text-ink-muted hover:border-primary/30 hover:text-ink'
                }`}
              >
                {/* 값은 한국어 정본 그대로, 표시만 사전이 옮긴다 — 배지는 EN 인데 칩만
                    한국어면 같은 낱말이 한 화면에서 두 말을 한다 (규약 §15, 2026-08-18) */}
                {st === ALL_STATUS ? t('common.all', '전체') : t(`specStatus.${st}`, st)}
                <span className={selected ? 'text-primary/80' : 'text-ink-subtle'}>{count}</span>
              </button>
            )
          })}
        </FilterAxis>
      </FilterAxes>

      {/* ⚠ 보기 전환은 **필터가 아니다** — 거르는 칩 사이에 섞어 두면 "표도 필터인가"로
          읽힌다(내가 처음에 그렇게 뒀다). 거르는 블록에서 빼내 **목록 바로 위**에 세운다:
          이 자리에 있으면 "아래 목록을 어떻게 볼지"라는 뜻이 자리로 드러난다. */}
      <div className="mt-4 flex justify-end">
        <ChipSelect
          options={VIEWS}
          value={view}
          onChange={(v) => setSearch({ view: orNone(v, DEFAULT_VIEW) })}
          label={(v) => t(`specs.view.${v}`, v)}
        />
      </div>

      {/* 저장 필터 — 자주 쓰는 조합에 이름을 붙여 둔다(관문 SavedFilters).
          ⚠ 거르는 조건은 이미 주소에 있으므로 **주소 값을 그대로** 담고 그대로 되돌린다:
          따로 든 상태를 저장하면 저장한 것과 화면이 어긋난다. */}
      <SavedFilters
        className="mt-3"
        scope="specs"
        current={{ q: query, cat: category, status }}
        canSave={query.trim() !== '' || category !== ALL_CATEGORY || status !== ALL_STATUS}
        onApply={(v) =>
          setSearch({
            q: pickText(v.q),
            cat: orNone(v.cat, ALL_CATEGORY),
            status: orNone(v.status as SpecStatus, ALL_STATUS as SpecStatus),
          })
        }
      />

      {view === '표' ? (
        /* 표 — 관문이 그린다(규약 §9 "표는 한 곳에서만"). 카드가 보여 주던 것 중
           **훑을 때 쓰는 것만** 열로 세운다: 설명·태그·스펙 미리보기는 상세가 맡는다.
           ⚠ 열 폭 합은 코드의 본문 폭(1360)을 넘지 않게 잡는다 — 넘으면 마지막 열이
           화면에서 조용히 잘린다(DESIGN.md 폭 표 참고). */
        /* ⚠⚠ **표는 카드 안에 있어야 한다.** 관문의 가장자리 그림자(`.table-scroll`)는
           양 끝 36px 에 **카드 면색(`--color-surface`)** 을 칠해 "여기서 끝"을 가린다 —
           캔버스 위에 맨몸으로 두면 그 띠가 배경과 달라 **흰 조각**으로 보인다(2026-08-21
           라이트 테마 실사에서 사용자 지적). 머리줄의 `bg-canvas` 도 같은 이유로 카드
           안에서만 층이 선다. 사양서 상세의 필드 표와 같은 상자를 쓴다. */
        <section className="anim-fade-up mt-6 card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface p-4">
          <DataTable
            rows={filtered}
            rowKey={(sp) => sp.id}
            minWidth={880}
            onRowClick={(sp) => navigate({ to: '/specs/$specId', params: { specId: sp.id } })}
            empty={{ title: t('specs.empty', '조건에 맞는 사양서가 없습니다.') }}
            columns={[
              {
                header: t('specs.th.id', 'ID'),
                cellClassName: 'whitespace-nowrap',
                cell: (sp) => <span className="font-mono text-xs text-ink-subtle">{sp.id}</span>,
              },
              {
                header: t('specs.th.name', '사양서명'),
                cell: (sp) => <span className="font-medium text-ink">{sp.name}</span>,
              },
              {
                header: t('specs.th.category', '카테고리'),
                cellClassName: 'whitespace-nowrap',
                cell: (sp) => (
                  <span className="text-ink-muted">{catLabel(sp.category)}</span>
                ),
              },
              {
                header: t('specs.th.version', '버전'),
                cellClassName: 'whitespace-nowrap',
                cell: (sp) => (
                  <span className="font-mono text-xs text-primary">{currentVersion(sp).version}</span>
                ),
              },
              {
                header: t('specs.th.status', '상태'),
                cellClassName: 'whitespace-nowrap',
                cell: (sp) => <StatusBadge status={currentVersion(sp).status} />,
              },
              {
                header: t('specs.th.author', '담당'),
                cellClassName: 'whitespace-nowrap',
                cell: (sp) => <span className="text-ink-muted">{currentVersion(sp).author}</span>,
              },
              {
                header: t('specs.th.updated', '수정'),
                cellClassName: 'whitespace-nowrap',
                cell: (sp) => <span className="tabular-nums text-ink-subtle">{sp.updated}</span>,
              },
            ]}
          />
        </section>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filtered.map((spec, i) => (
              <SpecCard
                key={spec.id}
                spec={spec}
                index={i}
                onDetail={() => navigate({ to: '/specs/$specId', params: { specId: spec.id } })}
                onCompare={() => openCompare(spec)}
                /* 상신 판단은 상세 한 곳 — 카드는 상세의 상신 모달로 보내기만 한다 (SpecCard 주석) */
                onRequest={() =>
                  navigate({ to: '/specs/$specId', params: { specId: spec.id }, search: { request: '1' } })
                }
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="mt-16 text-center text-sm text-ink-subtle">
              {t('specs.empty', '조건에 맞는 사양서가 없습니다.')}
            </div>
          )}
        </>
      )}
      {/* ⚠ 목록은 몇 건인지 말하고 끝난다(규약 §9). **카드 목록에도 발이 필요하다** —
          표에만 달아 두어서, 거르면 카드가 줄어드는데 화면은 아무 말이 없었다: 보는 사람은
          그게 전부인지 걸러진 것인지 모른다(2026-08-18 감사에서 거르는 목록 다섯이 그랬다). */}
      {filtered.length > 0 && <ListFoot total={specList.length} shown={filtered.length} unit="개" />}

      {compare && (
        <VersionCompareModal
          spec={compare.spec}
          base={compare.base}
          onClose={() => setCompare(null)}
        />
      )}

      {/* 등록 — 끝내고 닫는 것이라 MODAL (규약 §1). 저장되면 상세로 보낸다:
          등록의 다음 행동은 언제나 "필드를 채우는 것"이다 (규약 §10 카드는 다음 행동으로 끝난다) */}
      {importing && (
        <SpecImportModal
          knownSpecNames={specList.map((s) => s.name)}
          knownMemberNames={members.map((m) => m.name)}
          lockedSpecNames={specList
            .filter((sp) => currentVersion(sp).status === '승인 대기')
            .map((sp) => sp.name)}
          onClose={() => setImporting(false)}
          onSeeResult={() => {
            /* 방금 들어온 것만 보이게 좁힌다 — 목록에 100건이 섞여 있으면 "들어갔다"는
               말이 확인되지 않는다. 이관본은 '엑셀 이관' 태그를 달고 태어난다. */
            setSearch({ q: '엑셀 이관', cat: undefined, status: undefined })
          }}
          onApply={(kind, rows) => {
            /* ⚠ **정상 행만** 온다(검증은 관문이 끝냈다). 여기서는 "이미 있으면 건너뛴다"만
               판단한다 — 같은 파일을 다시 올려도 안전해야 한다(설계 §5). 필드 정의는
               사양서 본문에 붙는 것이라 **본개발에서 서버로** 간다(지금은 셈만 돌려준다). */
            if (kind === 'fields') {
              /* ⚠ 여기가 `return rows.length` 였다 — 검증만 하고 **아무 데도 안 붙이면서**
                 화면은 "n건 반영했습니다"라고 말했다(2026-08-19). 붙일 자리를 만들었다:
                 `data/specFieldStore.ts`(필드 정본). 같은 이름은 덮어쓰고 없으면 더한다. */
              const byName = new Map<string, Array<Record<string, string>>>()
              for (const r of rows) {
                const key = r['사양서명']
                byName.set(key, [...(byName.get(key) ?? []), r])
              }
              let done = 0
              for (const [name, group] of byName) {
                const target = specList.find((sp) => sp.name === name)
                if (!target) continue
                done += mergeSpecFields(
                  target.id,
                  group.map((r) => rowToFieldDef(r, '김현대')),
                )
              }
              recordAudit({
                action: '업로드',
                target: `사양서 필드 정의 (${done}건 반영 / ${rows.length}건 중)`,
                reason: '사양서 엑셀 이관',
              })
              return done
            }
            // 관문이 한 번에 넣고 **한 번만** 알린다 — 건마다 알리면 100건에서 화면이 100번 다시 그려진다
            const applied = registerSpecs(
              rows.map((r) => ({
                name: r['사양서명'],
                category: r['카테고리'],
                description: r['설명'] ?? '',
                tags: (r['태그'] ?? '').split(',').map((x) => x.trim()).filter(Boolean),
                author: r['담당자'] || '김현대',
              })),
            )
            recordAudit({
              action: '업로드',
              target: `사양서 대장 엑셀 (${applied}건 반영 / ${rows.length}건 중)`,
              reason: '사양서 엑셀 이관',
            })
            return applied
          }}
          onApplyPlans={(planned) => {
            /* 원본 엑셀 길 — **시트 하나가 사양서 하나**로 들어온다(설계 §1-1). 필드까지 안고
               오므로 등록 관문에 그대로 넘긴다. 여기서도 판단은 "이미 있으면 건너뛴다" 하나뿐. */
            const applied = registerSpecs(
              planned.map((p) => ({
                name: p.name,
                category: p.category,
                description: `엑셀 이관 — 시트 '${p.sheet}' (자료 ${p.dataRows.toLocaleString()}행)`,
                tags: ['엑셀 이관'],
                author: '김현대',
                fields: p.fields,
              })),
            )
            /* ⚠ 화면이 "감사 로그에 남습니다"라고 적어 두고 **아무 데도 안 남기던** 자리다
               (2026-08-19). 시트 이름을 함께 남긴다 — 나중에 "무엇이 들어왔나"를 되짚는 축이다. */
            recordAudit({
              action: '업로드',
              target: `사양서 엑셀 (${applied}건 반영: ${planned.map((p) => p.sheet).join(', ')})`,
              reason: '사양서 엑셀 이관',
            })
            return applied
          }}
        />
      )}

      {creating && (
        <RegisterSpecModal
          onClose={() => setCreating(false)}
          onRegistered={(id) => {
            setCreating(false)
            navigate({ to: '/specs/$specId', params: { specId: id } })
          }}
        />
      )}
    </AppShell>
  )
}

/* 등록 폼 — 종류(카테고리)에 따라 칸이 달라지지 않는 짧은 폼이라 §11 카드 고르기 없이
   한 장으로 간다. 이름만 필수 — 오류는 그 칸 아래 인라인 (규약 §2 규칙 2). */
function RegisterSpecModal({
  onClose,
  onRegistered,
}: {
  onClose: () => void
  onRegistered: (id: string) => void
}) {
  const catLabel = useCategoryLabel()
  const { t, tf } = useI18n()
  const toast = useToast()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<(typeof specCategories)[number]>(specCategories[0])
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [nameError, setNameError] = useState(false)

  const submit = () => {
    if (name.trim() === '') {
      setNameError(true)
      return
    }
    const input: NewSpecInput = {
      name,
      category,
      description,
      tags: tags
        .split(',')
        .map((s) => s.trim().replace(/^#/, ''))
        .filter(Boolean),
      author: '김현대', // 프로토타입: 로그인 사용자 mock — 본개발에서 /me
    }
    const spec = registerSpec(input)
    toast(tf('specs.registeredToast', { id: spec.id }, '{id} 로 등록했습니다 — 필드 정의를 채워 주세요'))
    onRegistered(spec.id)
  }

  return (
    <Modal
      title={t('specs.registerTitle', '사양서 등록')}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('common.cancel', '취소')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
          >
            {t('specs.registerSubmit', '등록')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-subtle">{t('specs.form.name', '사양서 이름')}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError && e.target.value.trim() !== '') setNameError(false)
            }}
            placeholder={t('specs.form.namePlaceholder', '예: VN9 하이브리드 파워트레인 사양서')}
            autoFocus
            className={`mt-1 h-10 w-full rounded-lg border bg-canvas/60 px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 ${
              nameError ? 'border-danger-ink/50' : 'border-hairline'
            }`}
          />
          {/* 입력 오류는 반드시 인라인 — 어느 칸이 문제인지 그 자리에서 (규약 §2) */}
          {nameError && (
            <span className="mt-1 block text-xs text-danger-ink">
              {t('specs.form.nameRequired', '이름을 입력해 주세요 — 목록과 검색이 이 이름으로 찾습니다.')}
            </span>
          )}
        </label>
        <div>
          <span className="text-xs font-medium text-ink-subtle">{t('specs.form.category', '카테고리')}</span>
          <div className="mt-1.5">
            <ChipSelect options={specCategories} value={category} onChange={setCategory} label={catLabel} />
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-ink-subtle">{t('specs.form.desc', '설명')}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t('specs.form.descPlaceholder', '무엇을 정의하는 문서인지 한두 문장으로')}
            className="mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-subtle">{t('specs.form.tags', '태그 (쉼표로 구분)')}</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('specs.form.tagsPlaceholder', '예: 엔진, 하이브리드')}
            className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60"
          />
        </label>
        <p className="rounded-xl bg-canvas/50 px-4 py-3 text-xs text-ink-subtle">
          {t(
            'specs.form.hint',
            'v0.1 초안으로 만들어집니다. 필드 정의는 등록 후 상세 화면에서 채우고, 다 채우면 승인 요청으로 결재를 시작합니다.',
          )}
        </p>
      </div>
    </Modal>
  )
}
