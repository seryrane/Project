import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChartCard, MultiLineChart } from '#/components/portal/charts'
import { ListFoot, usePaged } from '#/components/portal/ListFoot'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import {
  ALERTS_NOW,
  THRESHOLD_DANGER,
  THRESHOLD_WARN,
  alertEvents,
  alertServers,
  defaultAlertChannels,
  defaultAlertRules,
  parseAlertAt,
} from '#/data/alerts'
import type {
  AlertChannel,
  AlertEvent,
  AlertMetric,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  ServerCard,
  ServerHealth,
} from '#/data/alerts'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/alerts')({ component: AlertsPage })

/* ── 상태 → 색 (임계값·규약이 정한 색만 쓴다. hex 직접 금지) ───────────── */
const SEVERITY_CLS: Record<AlertSeverity, string> = {
  위험: 'bg-danger-bg text-danger-ink',
  주의: 'bg-review-bg text-review-ink',
  정보: 'bg-draft-bg text-draft-ink',
}
// 미해결은 "지금 조치가 필요"라는 뜻이라 pending(대기) 토큰 — 등급(danger/review)과는
// 다른 축의 정보라 같은 색을 겹쳐 쓰지 않는다 (severity 위험 + status 미해결이 둘 다
// 빨강이면 표가 온통 빨강이 되어 등급 구분이 죽는다).
const STATUS_CLS: Record<AlertStatus, string> = {
  미해결: 'bg-pending-bg text-pending-ink',
  해결: 'bg-deployed-bg text-deployed-ink',
}
// dashboard.tsx 의 HEALTH_CLS 와 같은 값 — 그 파일의 비공개 상수라 가져올 수 없어 옮겨 적는다
const HEALTH_CLS: Record<ServerHealth, string> = {
  HEALTHY: 'bg-deployed-bg text-deployed-ink',
  WARNING: 'bg-review-bg text-review-ink',
  ERROR: 'bg-danger-bg text-danger-ink',
}
const SEVERITY_SLUG: Record<AlertSeverity, string> = { 위험: 'danger', 주의: 'warn', 정보: 'info' }
const STATUS_SLUG: Record<AlertStatus, string> = { 미해결: 'open', 해결: 'resolved' }
/** ⚠ CPU·메모리·디스크는 **좋고 나쁨이 없는 식별**이다 — 상태색(fill-*)을 쓰면 읽는 사람이
 *  없는 뜻을 읽는다(디스크가 보라면 "승인 대기"인가?). 계열 색은 따로 있다(styles.css).
 *  ⚠ 순서가 곧 정체성이다 — 서버를 바꿔도 CPU 는 늘 1번 색이다. */
const METRIC_FILL: Record<AlertMetric, string> = {
  cpu: 'var(--color-series-1)',
  mem: 'var(--color-series-2)',
  disk: 'var(--color-series-3)',
}

const SEVERITY_FILTERS = ['전체', '위험', '주의', '정보'] as const
type SeverityFilter = (typeof SEVERITY_FILTERS)[number]

/* 자원 게이지 — dashboard.tsx 의 Meter 와 같은 임계값(70 주의 · 85 위험), 같은 색 규칙.
   그 컴포넌트는 다른 라우트 파일 안의 비공개 함수라 가져올 수 없어 여기서 다시 그린다. */
function Meter({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= THRESHOLD_DANGER
      ? 'var(--color-danger-ink)'
      : pct >= THRESHOLD_WARN
        ? 'var(--color-review-ink)'
        : 'var(--color-fill-deployed)'
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] text-ink-subtle">
      {label}
      <span className="h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-chip">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      <span className="w-7 text-right tabular-nums text-ink-muted">{pct}%</span>
    </span>
  )
}

/* 증감 칩 — charts.tsx StatTile 의 DeltaChip 과 같은 모양. 관문(components/**) 은 고칠 수
   없고 비공개 함수라 가져올 수도 없어, 라우트 안에 같은 모양을 그대로 옮겨 쓴다 (규약 §10) */
function DeltaChip({ delta, good }: { delta: string; good: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        good ? 'bg-deployed-bg text-deployed-ink' : 'bg-danger-bg text-danger-ink'
      }`}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
        {delta.startsWith('-') ? (
          <path d="M1 2.5h6L4 6.5z" fill="currentColor" />
        ) : (
          <path d="M1 5.5h6L4 1.5z" fill="currentColor" />
        )}
      </svg>
      {delta}
    </span>
  )
}

/** 경과 시간을 일/시/분 중 가장 큰 단위 하나로 말한다(초 단위까지 적으면 못 읽는다) */
function elapsedParts(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  return { d, h, m }
}

function AlertServerCard({
  server,
  selected,
  onSelect,
}: {
  server: ServerCard
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useI18n()
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected ? 'border-primary/50 bg-primary/6' : 'border-hairline hover:border-primary/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate font-mono text-[13px] font-semibold text-ink">{server.name}</span>
          <span className="block truncate text-xs text-ink-subtle">{server.role}</span>
        </span>
        {/* 규약 §16 — 선택·상태는 색만으로 말하지 않는다. 배지에 글자를 함께 */}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${HEALTH_CLS[server.health]}`}>
          {server.health}
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <Meter label="CPU" pct={server.cpu} />
        <Meter label="MEM" pct={server.mem} />
        <Meter label="DISK" pct={server.disk} />
      </div>
      <button
        type="button"
        onClick={onSelect}
        className={`mt-3 w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${
          selected ? 'bg-primary/15 text-primary' : 'bg-chip text-ink-muted hover:text-ink'
        }`}
      >
        {selected ? `✓ ${t('alerts.server.viewTrend', '추이 보기')}` : t('alerts.server.viewTrend', '추이 보기')}
      </button>
    </div>
  )
}

function AlertChannelRow({
  channel,
  onToggle,
  onTargetChange,
}: {
  channel: AlertChannel
  onToggle: (v: boolean) => void
  onTargetChange: (v: string) => void
}) {
  const { t } = useI18n()
  const needsTarget = channel.key === 'email' || channel.key === 'webhook'
  return (
    <div className="rounded-xl bg-chip px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[13px]">
          <b className="font-medium text-ink">{t(`alerts.rules.channel.${channel.key}`)}</b>
          <span className={`ml-2 text-xs ${channel.enabled ? 'text-deployed-ink' : 'text-ink-subtle'}`}>
            {channel.enabled ? t('alerts.rules.channel.enabled', '사용 중') : t('alerts.rules.channel.disabled', '미사용')}
          </span>
        </span>
        <Switch checked={channel.enabled} onChange={onToggle} label={t(`alerts.rules.channel.${channel.key}`)} />
      </div>
      {needsTarget && channel.enabled && (
        <div className="mt-2">
          <input
            value={channel.target ?? ''}
            onChange={(e) => onTargetChange(e.target.value)}
            placeholder={
              channel.key === 'email'
                ? t('alerts.rules.channel.emailTarget', '수신 그룹')
                : t('alerts.rules.channel.webhookTarget', '엔드포인트 URL')
            }
            className="h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
          />
          {channel.key === 'webhook' && channel.target === '' && (
            <p className="mt-1 text-xs text-review-ink">
              {t('alerts.rules.channel.webhookEmptyNote', '엔드포인트가 없으면 켜 두어도 이 방법으로 알림이 오지 않습니다')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function AlertsPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()

  const defaultServer = alertServers.find((s) => s.health !== 'HEALTHY')?.name ?? alertServers[0].name
  const [selectedServer, setSelectedServer] = useState(defaultServer)

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('전체')
  const [openOnly, setOpenOnly] = useState(false)
  const [detail, setDetail] = useState<AlertEvent | null>(null)

  const [rules, setRules] = useState<Array<AlertRule>>(defaultAlertRules)
  const [channels, setChannels] = useState<Array<AlertChannel>>(defaultAlertChannels)
  const [rulesModalOpen, setRulesModalOpen] = useState(false)
  const [draftRules, setDraftRules] = useState<Array<AlertRule>>(defaultAlertRules)
  const [draftChannels, setDraftChannels] = useState<Array<AlertChannel>>(defaultAlertChannels)

  const severityLabel = (v: SeverityFilter) =>
    v === '전체' ? t('common.all', '전체') : t(`alerts.severity.${SEVERITY_SLUG[v]}`, v)
  const statusLabel = (v: AlertStatus) => t(`alerts.status.${STATUS_SLUG[v]}`, v)

  // 정렬 기본값은 시간순(최신 먼저) — 서버가 정한다(규약 §9)
  const sortedEvents = useMemo(
    () => [...alertEvents].sort((a, b) => parseAlertAt(b.at) - parseAlertAt(a.at)),
    [],
  )
  const rows = sortedEvents.filter(
    (e) => (severityFilter === '전체' || e.severity === severityFilter) && (!openOnly || e.status === '미해결'),
  )
  /* 발은 관문이 그린다 (규약 §9) — 거른 수와 전체 수를 함께 말하고, 21줄부터 쪽이 선다.
     좁은 화면 카드와 넓은 화면 표가 **같은 쪽**을 본다 — 둘이 갈리면 폭을 줄였을 때
     보던 줄이 사라진다. */
  const { page, pageCount, pageRows, setPage } = usePaged(rows)

  /* ── 요약 타일 — 0 을 평온함으로 읽지 않는다(규약 §10): 각 0 은 이유가 다르다 ── */
  const last24h = alertEvents.filter((e) => ALERTS_NOW - parseAlertAt(e.at) <= 86_400_000)
  const resolvedIn24h = last24h.filter((e) => e.status === '해결').length
  const dangerServers = alertServers.filter((s) => s.health !== 'HEALTHY')
  const openEvents = alertEvents.filter((e) => e.status === '미해결')
  const oldestOpen =
    openEvents.length > 0
      ? openEvents.reduce((a, b) => (parseAlertAt(a.at) < parseAlertAt(b.at) ? a : b))
      : null
  const oldestOpenLabel = (() => {
    if (!oldestOpen) return t('alerts.elapsed.none', '—')
    const { d, h, m } = elapsedParts(ALERTS_NOW - parseAlertAt(oldestOpen.at))
    if (d > 0) return tf('alerts.elapsed.days', { d, h }, '{d}일 {h}시간 경과')
    if (h > 0) return tf('alerts.elapsed.hours', { h, m }, '{h}시간 {m}분 경과')
    return tf('alerts.elapsed.minutes', { m }, '{m}분 경과')
  })()

  // 어제 이 시각 스냅샷 — 실 이력이 없는 프로토타입이라 라우트 안 결정적 상수로 둔다
  // (난수 금지, 규약 §10). "가장 오래된 미해결"은 경과 시간이라 전과 견줄 수 없어 증감을
  // 빼고 면(①)만 적용한다(규약 §10 예시와 같은 경우).
  const PREV_24H = { dangerServers: 1, last24h: 7, resolved: 5 }
  const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${n}`
  const dangerServersDelta = dangerServers.length - PREV_24H.dangerServers
  const last24hDelta = last24h.length - PREV_24H.last24h
  const resolvedDelta = resolvedIn24h - PREV_24H.resolved
  const vsYesterday = t('alerts.delta.caption', '어제 대비')

  const tiles = [
    {
      id: 'dangerServers',
      label: t('alerts.tile.dangerServers.label', '위험 · 주의 서버'),
      value: String(dangerServers.length),
      cls: dangerServers.length > 0 ? 'text-danger-ink' : 'text-deployed-ink',
      // 위험·주의 서버가 늘면 나쁘다
      delta: fmtDelta(dangerServersDelta),
      deltaGood: dangerServersDelta <= 0,
      caption:
        dangerServers.length === 0
          ? tf('alerts.tile.dangerServers.okCaption', { n: alertServers.length }, `문제 없음 — 서버 ${alertServers.length}대 모두 정상`)
          : tf('alerts.tile.dangerServers.warnCaption', { n: dangerServers.length }, '{n}대 점검 필요 — 아래 카드에서 확인'),
    },
    {
      id: 'last24h',
      label: t('alerts.tile.last24h.label', '24시간 발생 알림'),
      value: String(last24h.length),
      cls: 'text-ink',
      // 발생 알림이 늘면 나쁘다 — 원인 이벤트가 늘었다는 뜻
      delta: fmtDelta(last24hDelta),
      deltaGood: last24hDelta <= 0,
      caption:
        last24h.length === 0
          ? t('alerts.tile.last24h.zeroCaption', '수집은 정상 — 지난 24시간 발생한 알림이 없습니다')
          : `${t('alerts.tile.last24h.caption', '최근 24시간 기준')} · ${vsYesterday}`,
    },
    {
      id: 'resolved',
      label: t('alerts.tile.resolved.label', '해소된 알림'),
      value: String(resolvedIn24h),
      cls: resolvedIn24h > 0 ? 'text-deployed-ink' : last24h.length > 0 ? 'text-danger-ink' : 'text-ink',
      // 해소 건이 늘면 좋다 — 발생한 알림이 없으면(last24h=0) 견줄 뜻이 없어 증감을 뺀다
      delta: last24h.length > 0 ? fmtDelta(resolvedDelta) : undefined,
      deltaGood: resolvedDelta >= 0,
      caption:
        last24h.length === 0
          ? t('alerts.tile.resolved.noneOccurred', '발생한 알림이 없어 해소 건도 없습니다')
          : resolvedIn24h === 0
            ? t('alerts.tile.resolved.zeroCaption', '발생만 있고 아직 해소된 알림이 없습니다 — 조치가 필요합니다')
            : `${tf('alerts.tile.resolved.caption', { n: last24h.length }, '24시간 발생 {n}건 중')} · ${vsYesterday}`,
    },
    {
      id: 'oldestOpen',
      label: t('alerts.tile.oldestOpen.label', '가장 오래된 미해결'),
      value: oldestOpenLabel,
      cls: oldestOpen ? 'text-danger-ink' : 'text-deployed-ink',
      caption: oldestOpen
        ? tf('alerts.tile.oldestOpen.caption', { server: oldestOpen.serverName }, '{server} — 지금도 진행 중')
        : t('alerts.tile.oldestOpen.noneCaption', '모든 알림이 해소되었습니다 — 미해결 없음'),
    },
  ]

  const selected = alertServers.find((s) => s.name === selectedServer) ?? alertServers[0]

  const openRulesModal = () => {
    setDraftRules(rules)
    setDraftChannels(channels)
    setRulesModalOpen(true)
  }
  const saveRules = () => {
    setRules(draftRules)
    setChannels(draftChannels)
    setRulesModalOpen(false)
    toast(t('alerts.toast.rulesSaved', '알림 규칙을 저장했습니다 — 값은 언제든 [규칙 편집]에서 다시 바꿀 수 있습니다'))
  }

  return (
    <AppShell active="alerts" title={t('nav.alerts', '시스템 알림')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.alerts', '시스템 알림')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">{t('alerts.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openRulesModal}
          className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          {t('alerts.rules.edit', '규칙 편집')}
        </button>
      </div>

      {/* 요약 타일 4개 — 라벨 줄은 머리(옅은 면), 숫자는 몸 (규약 §7·§10) */}
      <div className="mt-5 grid grid-cols-2 gap-3 pc:grid-cols-4">
        {tiles.map((tile, i) => (
          <div
            key={tile.id}
            style={{ animationDelay: `${i * 60}ms` }}
            className="card-spotlight card-hover anim-fade-up overflow-hidden rounded-2xl border border-hairline bg-surface"
          >
            <div className="flex items-center justify-between gap-2 surface-head px-4 py-2">
              <span className="truncate text-xs text-ink-subtle">{tile.label}</span>
              {tile.delta && <DeltaChip delta={tile.delta} good={tile.deltaGood} />}
            </div>
            <div className="px-4 py-3.5">
              <div className={`text-xl font-bold tabular-nums ${tile.cls}`}>{tile.value}</div>
              <div className="mt-1 text-xs leading-snug text-ink-subtle">{tile.caption}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 서버 자원 리포팅 */}
      <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface [animation-delay:100ms]">
        <div className="surface-head px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{t('alerts.section.servers.title', '서버 자원 리포팅')}</h2>
          <p className="mt-0.5 text-xs text-ink-subtle">{t('alerts.section.servers.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {alertServers.map((s) => (
            <AlertServerCard
              key={s.name}
              server={s}
              selected={s.name === selectedServer}
              onSelect={() => setSelectedServer(s.name)}
            />
          ))}
        </div>
      </section>

      {/* 최근 추이 — 관문 차트(MultiLineChart), 선택한 서버의 CPU·메모리·디스크 */}
      <div className="mt-5">
        <ChartCard
          title={t('alerts.trend.title', '선택 서버 최근 추이')}
          subtitle={t('alerts.trend.subtitle', '최근 14일 · 단위: %')}
          className="anim-fade-up [animation-delay:140ms]"
        >
          <div className="mb-3">
            <ChipSelect options={alertServers.map((s) => s.name)} value={selectedServer} onChange={setSelectedServer} mono />
          </div>
          <MultiLineChart
            series={[
              { name: t('alerts.metric.cpu', 'CPU'), color: METRIC_FILL.cpu, data: selected.cpuTrend },
              { name: t('alerts.metric.mem', '메모리'), color: METRIC_FILL.mem, data: selected.memTrend },
              { name: t('alerts.metric.disk', '디스크'), color: METRIC_FILL.disk, data: selected.diskTrend },
            ]}
            unit="%"
          />
        </ChartCard>
      </div>

      {/* 알림 이력 */}
      <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface [animation-delay:180ms]">
        <div className="flex flex-wrap items-center justify-between gap-2 surface-head px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{t('alerts.section.history.title', '알림 이력')}</h2>
          <span className="text-xs text-ink-subtle">{t('alerts.section.history.hint', '행을 누르면 상세가 열립니다')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
          <ChipSelect
            options={SEVERITY_FILTERS.map(severityLabel)}
            value={severityLabel(severityFilter)}
            onChange={(v) => {
              const raw = SEVERITY_FILTERS.find((s) => severityLabel(s) === v) ?? '전체'
              setSeverityFilter(raw)
            }}
          />
          <span className="h-4 w-px bg-hairline" />
          <Switch checked={openOnly} onChange={setOpenOnly} label={t('alerts.filter.openOnly', '미해결만 보기')} />
          <span className="text-xs text-ink-subtle">{t('alerts.filter.openOnly', '미해결만 보기')}</span>
        </div>

        {/* 좁은 화면: 카드 — 행 하나가 독립 개체라 열 비교가 필요 없다 */}
        <ol className="space-y-2 p-4 pc:hidden">
          {pageRows.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => setDetail(e)}
                className="w-full rounded-xl border border-hairline/70 p-3 text-left transition-colors hover:border-primary/30"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_CLS[e.severity]}`}>
                    {severityLabel(e.severity)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[e.status]}`}>
                    {statusLabel(e.status)}
                  </span>
                  <span className="ml-auto font-mono text-[10px] tabular-nums text-ink-subtle">{e.at}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <span className="font-mono font-medium text-ink">{e.serverName}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-muted">{e.message}</div>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-ink-subtle">{t('alerts.empty', '조건에 맞는 알림이 없습니다.')}</li>
          )}
        </ol>

        {/* 넓은 화면: 표 — 가장자리 그림자로 더 있는 열을 말한다(규약 §8) */}
        <div className="hidden pc:block">
          <div className="table-scroll">
            <table className="w-full min-w-[820px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                  <th className="px-4 py-2.5 font-medium">{t('alerts.th.at', '발생 시각')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('alerts.th.severity', '등급')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('alerts.th.server', '대상 서버')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('alerts.th.message', '내용')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('alerts.th.status', '상태')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('alerts.th.resolvedAt', '해소 시각')}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setDetail(e)}
                    className="cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-chip"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-ink-subtle">{e.at}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLS[e.severity]}`}>
                        {severityLabel(e.severity)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-ink-muted">{e.serverName}</td>
                    <td className="min-w-0 px-3 py-3">
                      <span className="block max-w-[360px] truncate text-ink">{e.message}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[e.status]}`}>
                        {statusLabel(e.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs tabular-nums text-ink-subtle">
                      {e.resolvedAt ?? '—'}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-subtle">
                      {t('alerts.empty', '조건에 맞는 알림이 없습니다.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-4 pb-4 pc:px-5 pc:pb-4">
          <ListFoot
            total={sortedEvents.length}
            shown={rows.length}
            page={page}
            pageCount={pageCount}
            onPage={setPage}
          />
        </div>
      </section>

      {/* 알림 규칙 카드 — 편집은 모달, 저장은 즉시(되돌릴 수 있으니 확인 모달 없음) */}
      <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface [animation-delay:220ms]">
        <div className="flex flex-wrap items-center justify-between gap-2 surface-head px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-ink">{t('alerts.section.rules.title', '알림 규칙')}</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">{t('alerts.section.rules.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={openRulesModal}
            className="h-8 shrink-0 rounded-lg border border-hairline bg-surface px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
          >
            {t('alerts.rules.edit', '규칙 편집')}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.metric} className="flex items-center justify-between rounded-xl bg-chip px-3.5 py-2.5 text-[13px]">
                <span className="font-medium text-ink">{t(`alerts.metric.${r.metric}`)}</span>
                <span className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="rounded-full bg-review-bg px-2 py-0.5 font-semibold text-review-ink">
                    {t('alerts.rules.threshold.warn', '주의')} {r.warn}%
                  </span>
                  <span className="rounded-full bg-danger-bg px-2 py-0.5 font-semibold text-danger-ink">
                    {t('alerts.rules.threshold.danger', '위험')} {r.danger}%
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {channels.map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-xl bg-chip px-3.5 py-2.5 text-[13px]">
                <span className="font-medium text-ink">{t(`alerts.rules.channel.${c.key}`)}</span>
                <span className={`text-xs font-semibold ${c.enabled ? 'text-deployed-ink' : 'text-ink-subtle'}`}>
                  {c.enabled ? t('alerts.rules.channel.enabled', '사용 중') : t('alerts.rules.channel.disabled', '미사용')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 알림 상세 — 그 시점 자원 값 + 같은 대상의 최근 알림 + 조치 안내 + 다음 행동 */}
      {detail && (
        <Drawer
          title={tf('alerts.detailTitle', { id: detail.id }, '알림 상세 — {id}')}
          onClose={() => setDetail(null)}
          /* ⚠ 이 서랍의 발은 **[다음 행동]** 이다 — 알림을 열어 본 사람이 실제로 할 일이
             거기 있다. 자원 값·최근 알림·조치 안내가 쌓여 몸이 늘 넘치는데 몸 안에 두면
             그 다음 행동이 스크롤 아래로 사라진다. 알림을 연 뜻이 같이 사라진다 (규약 §7) */
          footer={(close) => (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-xs text-ink-subtle">
                {t('alerts.detail.nextActions', '다음 행동')}
              </span>
              <button
                type="button"
                onClick={() => {
                  close()
                  navigate({ to: '/validation-results' })
                }}
                className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('alerts.goResults', '검증 결과 조회 →')}
              </button>
              <button
                type="button"
                onClick={() => {
                  close()
                  navigate({ to: '/deploys' })
                }}
                className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
              >
                {t('alerts.goDeploys', '배포 관리 →')}
              </button>
            </div>
          )}
        >
          {() => {
            const recent = sortedEvents.filter((e) => e.serverName === detail.serverName && e.id !== detail.id).slice(0, 4)
            const actionKey = detail.metric ?? 'info'
            return (
              <div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLS[detail.severity]}`}>
                        {severityLabel(detail.severity)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[detail.status]}`}>
                        {statusLabel(detail.status)}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {detail.at} · {detail.serverName}
                      </span>
                    </div>
                    <div className="mt-2 text-ink">{detail.message}</div>
                    {detail.resolvedAt && (
                      <div className="mt-1 text-xs text-ink-subtle">
                        {t('alerts.th.resolvedAt', '해소 시각')}: {detail.resolvedAt}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium text-ink-subtle">{t('alerts.detail.snapshotTitle', '그 시점 자원 값')}</div>
                    <div className="mt-1.5 space-y-1.5 rounded-xl border border-hairline bg-canvas/40 px-3.5 py-3">
                      <Meter label="CPU" pct={detail.snapshot.cpu} />
                      <Meter label="MEM" pct={detail.snapshot.mem} />
                      <Meter label="DISK" pct={detail.snapshot.disk} />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-ink-subtle">{t('alerts.detail.actionTitle', '조치 안내')}</div>
                    <p className="mt-1.5 rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-muted">
                      {t(`alerts.action.${actionKey}`)}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-ink-subtle">{t('alerts.detail.recentTitle', '같은 서버 최근 알림')}</div>
                    {recent.length > 0 ? (
                      <ol className="mt-1.5 space-y-2">
                        {recent.map((r) => (
                          <li key={r.id} className="rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-[13px]">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className={`rounded-full px-1.5 py-0.5 font-semibold ${SEVERITY_CLS[r.severity]}`}>
                                {severityLabel(r.severity)}
                              </span>
                              <span className="font-mono text-ink-subtle">{r.at}</span>
                            </div>
                            <div className="mt-1 text-xs text-ink-muted">{r.message}</div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1.5 text-xs text-ink-subtle">{t('alerts.detail.recentEmpty', '같은 서버의 다른 알림이 없습니다.')}</p>
                    )}
                  </div>
                </div>

              </div>
            )
          }}
        </Drawer>
      )}

      {/* 알림 규칙 편집 — 짧게 고치고 닫는 일이라 모달. 되돌릴 수 있으니 확인 모달 없이 저장 */}
      {rulesModalOpen && (
        <Modal
          title={t('alerts.rules.modalTitle', '알림 규칙 편집')}
          onClose={() => setRulesModalOpen(false)}
          /* ⚠ 지표 셋 × 임계값 둘 + 수신 방법까지라 몸이 길다 — [저장]이 몸 안에 있으면
             다 만지고 한참 내려가야 나온다 (규약 §7) */
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={saveRules}
                className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
              >
                {t('common.save')}
              </button>
            </div>
          }
        >
          <p className="text-[13px] leading-relaxed text-ink-muted">{t('alerts.rules.modalDesc')}</p>

          <div className="mt-4 space-y-3">
            {draftRules.map((r, idx) => (
              <div key={r.metric} className="rounded-xl border border-hairline p-3.5">
                <div className="text-[13px] font-medium text-ink">{t(`alerts.metric.${r.metric}`)}</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-review-ink">{t('alerts.rules.threshold.warn', '주의')} (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={r.warn}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setDraftRules((prev) => prev.map((p, i) => (i === idx ? { ...p, warn: v } : p)))
                      }}
                      className="mt-1 h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] tabular-nums outline-none focus:border-primary/60"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-danger-ink">{t('alerts.rules.threshold.danger', '위험')} (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={r.danger}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setDraftRules((prev) => prev.map((p, i) => (i === idx ? { ...p, danger: v } : p)))
                      }}
                      className="mt-1 h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] tabular-nums outline-none focus:border-primary/60"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-ink-subtle">{t('alerts.rules.channelsTitle', '수신 방법')}</div>
            <div className="mt-1.5 space-y-2">
              {draftChannels.map((c, idx) => (
                <AlertChannelRow
                  key={c.key}
                  channel={c}
                  onToggle={(v) =>
                    setDraftChannels((prev) => prev.map((p, i) => (i === idx ? { ...p, enabled: v } : p)))
                  }
                  onTargetChange={(v) =>
                    setDraftChannels((prev) => prev.map((p, i) => (i === idx ? { ...p, target: v } : p)))
                  }
                />
              ))}
            </div>
          </div>

        </Modal>
      )}
    </AppShell>
  )
}
