/**
 * Tableau 임베딩 관문 — iframe 표출은 반드시 여기를 지난다 (1차 오픈: 임베딩 선행).
 *
 * - embed 파라미터(:embed=y 등)는 관문이 붙인다 — 화면마다 손으로 붙이면 어긋난다.
 * - 로딩 동안은 보더 빔 카드(일하는 중) — 외부 서버라 수 초 걸린다.
 * - ⚠ SSO(Connected App/Trusted Ticket) 확정 전에는 공개/티켓 링크만 뜬다.
 *   사내 서버 워크북은 로그인 화면이 뜨거나 X-Frame-Options 로 거부될 수 있다 —
 *   그건 이 관문의 한계가 아니라 연동 미확정 상태다(부제로 말한다).
 */
import { useState } from 'react'

import { OFFLINE } from '#/lib/offline'

function withEmbedParams(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set(':embed', 'y')
    u.searchParams.set(':showVizHome', 'no')
    u.searchParams.set(':toolbar', 'yes')
    return u.toString()
  } catch {
    return url
  }
}

export function TableauEmbed({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false)

  /* 오프라인 전달본(파일 하나로 보는 시안)에는 바깥으로 나가는 길이 없다.
     ⚠ 빈 iframe 을 두면 **로딩이 끝난 흰 판**으로 보인다 — 만들다 만 화면처럼 읽힌다.
     자리와 이유를 대신 말한다(규약 §17 빈 자리에는 이유를). */
  if (OFFLINE) {
    return (
      <div className="flex h-[52vh] min-h-[360px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline bg-chip/40 px-6 text-center">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="max-w-md text-[13px] leading-relaxed text-ink-subtle">
          Tableau 워크북은 외부 서버에서 불러옵니다 — 오프라인 전달본에서는 이 자리에 뜨지
          않습니다. 실제 화면에서는 여기에 워크북이 그대로 들어갑니다.
        </span>
        <span className="mt-1 max-w-full truncate rounded-md bg-chip px-2 py-1 font-mono text-xs text-ink-subtle">
          {url}
        </span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-hairline ${loaded ? '' : 'card-loading'}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-canvas/60">
          <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <span className="text-xs text-ink-subtle">Tableau 워크북을 불러오는 중…</span>
        </div>
      )}
      {/* 워크북은 고정폭(대개 ~1000px)이라 w-full 로 늘리면 오른쪽에 흰 여백이 쏠린다 —
          바탕을 일부러 흰색으로 통일하고 프레임을 가운데 정렬해 여백이 좌우 균형이 되게 한다.
          넘치는 세로는 프레임 안 스크롤(표는 자기 상자 안 — 규약 §8과 같은 원칙) */}
      <div className="flex justify-center overflow-x-auto bg-white">
        <iframe
          key={url}
          src={withEmbedParams(url)}
          title={title}
          onLoad={() => setLoaded(true)}
          className="block h-[72vh] min-h-[560px] w-full max-w-[1020px]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  )
}
