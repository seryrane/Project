import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { useToast } from '#/components/portal/toast'

export const Route = createFileRoute('/guide')({ component: GuidePage })

/** 목차 정본 — 목차와 본문이 같은 목록을 본다 (손으로 두 벌 적으면 어긋난다) */
const SECTIONS = [
  { id: 'start', title: '시작하기' },
  { id: 'roles', title: '역할과 권한' },
  { id: 'spec-flow', title: '사양서 작업 흐름' },
  { id: 'approval', title: '승인과 배포' },
  { id: 'validation', title: '검증엔진' },
  { id: 'more', title: '더 묻기' },
] as const

function GuidePage() {
  const toast = useToast()
  const [active, setActive] = useState<string>('start')

  const jump = (id: string) => {
    setActive(id)
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppShell active="guide" title="사용자 가이드">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">사용자 가이드</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            처음 온 사람과 권한이 새로 붙은 사람이 찾아오는 자리 — 그래서 권한 없이 모두에게
            보입니다
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 pc:grid-cols-[200px_1fr]">
        {/* 목차 — 데스크톱은 좌측 고정, 모바일은 상단 칩 줄로 접힌다 */}
        <nav className="pc:sticky pc:top-6 pc:self-start">
          <ol className="flex gap-1.5 overflow-x-auto pb-1 pc:flex-col pc:gap-0.5 pc:overflow-visible pc:pb-0">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => jump(s.id)}
                  className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    active === s.id
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'text-ink-muted hover:bg-chip hover:text-ink'
                  }`}
                >
                  <span className="font-mono text-[10px] tabular-nums opacity-60">{i + 1}</span>
                  {s.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* 본문 */}
        <div className="min-w-0 space-y-5">
          <section
            id="guide-start"
            className="anim-fade-up card-spotlight scroll-mt-6 rounded-2xl border border-hairline bg-surface"
          >
            <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">1. 시작하기</h2>
            </div>
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink-muted">
              <p>
                이 포털은 HMG 통합 데이터 플랫폼의 관리자 화면입니다 — 사양서를 정본으로 두고
                <b className="text-ink"> 작성 → 승인 → 배포 → 검증</b>이 한 흐름으로 이어집니다.
              </p>
              <p>
                로그인은 HMG-SSO 계정으로 합니다. 첫 화면(대시보드)은 역할에 맞는 위젯이 자동
                배치되며, [위젯 편집]으로 크기·위치를 바꿀 수 있습니다.
              </p>
              <p className="rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-xs">
                💡 상단의 <b className="text-ink">⌘K</b> (또는 검색창)를 누르면 어느 화면에서든
                메뉴·사양서를 바로 찾아 이동할 수 있습니다.
              </p>
            </div>
          </section>

          <section
            id="guide-roles"
            className="anim-fade-up card-spotlight scroll-mt-6 rounded-2xl border border-hairline bg-surface [animation-delay:60ms]"
          >
            <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">2. 역할과 권한</h2>
            </div>
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink-muted">
              <p>
                메뉴는 권한의 파생물입니다 — <b className="text-ink">권한이 없는 메뉴는 아예 보이지
                않습니다.</b> 남의 화면과 내 화면이 달라 보이는 것은 고장이 아니라 역할 차이입니다.
              </p>
              <div className="overflow-x-auto rounded-xl border border-hairline">
                <table className="w-full min-w-[420px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-hairline bg-canvas/60 text-left text-ink-subtle">
                      <th className="px-3 py-2 font-medium">등급</th>
                      <th className="px-3 py-2 font-medium">한 줄 설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ['Super Admin', '전체 시스템 관리 — 회원·권한·메뉴 포함'],
                        ['Admin', '서비스 운영 — 배포·검증 실행'],
                        ['Editor', '사양서 작성·수정, 승인 요청'],
                        ['Viewer', '사양서·지표 조회 전용'],
                      ] as const
                    ).map(([g, d]) => (
                      <tr key={g} className="border-b border-hairline/50 last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{g}</td>
                        <td className="px-3 py-2">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                내가 지금 무엇을 할 수 있는지는 우측 상단 아바타 →{' '}
                <b className="text-ink">[내가 할 수 있는 것]</b>에서 사람 말로 확인합니다. 권한이
                더 필요하면 소속 관리자에게 요청하세요 — 변경은 결재를 거쳐 적용됩니다.
              </p>
            </div>
          </section>

          <section
            id="guide-spec-flow"
            className="anim-fade-up card-spotlight scroll-mt-6 rounded-2xl border border-hairline bg-surface [animation-delay:120ms]"
          >
            <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">3. 사양서 작업 흐름</h2>
            </div>
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink-muted">
              {/* 흐름은 그림으로 — 단계 띠 하나가 문단 셋을 대신한다 */}
              <ol className="flex flex-wrap items-center gap-1.5 text-xs">
                {['작성·수정', '임시저장', '승인 요청', '결재', '배포', '검증'].map((s, i, arr) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        i < 2 ? 'bg-chip text-ink-muted' : i < 4 ? 'bg-pending-bg text-pending-ink' : 'bg-deployed-bg text-deployed-ink'
                      }`}
                    >
                      {s}
                    </span>
                    {i < arr.length - 1 && <span aria-hidden className="text-ink-subtle">→</span>}
                  </li>
                ))}
              </ol>
              <p>
                사양서 관리에서 사양서를 열면 <b className="text-ink">필드 표가 정본</b>입니다 —
                행을 누르면 우측에서 편집하고, 카테고리 탭은 엑셀 시트에 대응합니다. 기존 엑셀은
                [엑셀 업로드]로 옮깁니다.
              </p>
              <p>
                편집 중 나가면 임시저장본이 남고, 다시 열면 [이어서 작업] 배너가 묻습니다 —
                말없이 덮어쓰지 않습니다. 버전 비교는 상세 상단 [버전 비교]에서 합니다.
              </p>
            </div>
          </section>

          <section
            id="guide-approval"
            className="anim-fade-up card-spotlight scroll-mt-6 rounded-2xl border border-hairline bg-surface [animation-delay:180ms]"
          >
            <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">4. 승인과 배포</h2>
            </div>
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink-muted">
              <p>
                수정이 끝난 사양서는 상세에서 <b className="text-ink">[승인 요청 상신]</b>으로
                올립니다. 결재자는 승인 관리에서 변경 diff 를 보고 승인·반려하며,{' '}
                <b className="text-ink">반려에는 의견이 필수</b>입니다 — 그 의견이 다음 상신의 수정
                지침이 됩니다.
              </p>
              <p>
                승인 완료 건은 배포 관리의 [승인 대기] 배너에 모입니다. 배포는 별도 단계라 승인
                즉시 반영되지 않습니다 — 배포 담당이 환경(Production/Staging)과 포함 사양서를 골라
                배포 요청을 실행합니다.
              </p>
            </div>
          </section>

          <section
            id="guide-validation"
            className="anim-fade-up card-spotlight scroll-mt-6 rounded-2xl border border-hairline bg-surface [animation-delay:240ms]"
          >
            <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">5. 검증엔진</h2>
            </div>
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-ink-muted">
              <p>
                검증엔진은 사양서 데이터의 NULL·형식·범위를 스케줄(야간 일괄) 또는 즉시 실행으로
                검사합니다. 실행 결과는 <b className="text-ink">검증 결과 조회</b>에서 레코드
                단위로, 추세는 <b className="text-ink">검증 리포트</b>에서 유형별로 봅니다.
              </p>
              <p>
                실패 알림을 받았다면: 결과 조회에서 해당 실행을 열어 오류 상세(어느 레코드의 어느
                필드가 어느 규칙에 걸렸는지)를 확인하고, 사양서를 고친 뒤 재실행합니다.
              </p>
            </div>
          </section>

          <section
            id="guide-more"
            className="anim-fade-up card-spotlight scroll-mt-6 rounded-2xl border border-hairline bg-surface [animation-delay:300ms]"
          >
            <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink">6. 더 묻기</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Link
                  to="/faq"
                  className="card-hover rounded-xl border border-hairline bg-canvas/40 px-4 py-3.5 text-[13px]"
                >
                  <b className="block font-semibold text-ink">FAQ</b>
                  <span className="mt-0.5 block text-xs text-ink-subtle">
                    로그인·권한·임시저장 등 자주 묻는 것 먼저
                  </span>
                </Link>
                <Link
                  to="/qna"
                  className="card-hover rounded-xl border border-hairline bg-canvas/40 px-4 py-3.5 text-[13px]"
                >
                  <b className="block font-semibold text-ink">Q&A</b>
                  <span className="mt-0.5 block text-xs text-ink-subtle">
                    FAQ 에 없으면 질문을 남기세요 — 답변은 알림으로
                  </span>
                </Link>
              </div>
              <button
                type="button"
                onClick={() => toast('가이드 개선 의견을 접수했습니다 — 감사합니다')}
                className="mt-3 text-[11px] text-ink-subtle underline decoration-dotted underline-offset-2 transition-colors hover:text-ink"
              >
                이 가이드에서 부족한 부분 알려 주기
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
