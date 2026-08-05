/**
 * 셀렉트 관문 — DESIGN.md Rules 8: 브라우저 기본 위젯도 앱의 물건처럼 입힌다.
 * 기본 화살표(OS 모양)를 없애고 앱의 선 아이콘 체브론을 얹는다.
 * option 배경은 styles.css 가 surface 로 강제한다(다크에서 흰 목록이 뜨지 않게).
 */
export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        {...props}
        className="h-10 w-full appearance-none rounded-lg border border-hairline bg-surface py-0 pl-3 pr-8 text-[13px] text-ink-muted outline-none focus:border-primary/60 focus-visible:border-primary"
      >
        {children}
      </select>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}
